"""
PDF Ingestion & Document Processing Module.
Preserves pipeline from original notebook:
PyPDFLoader -> RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50) -> ChromaDB
Enriches document metadata with clean source titles and page numbers.
"""

import os
import re
import time
import tempfile
import logging
from pathlib import Path
from typing import List
from urllib.parse import unquote, urlparse
import requests
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from backend.rag.config import (
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    DEFAULT_PDF_URLS,
    LOCAL_PDF_DIR,
)
from backend.rag.vectorstore import get_vectorstore

logger = logging.getLogger(__name__)


def extract_doc_name_from_url_or_path(source: str) -> str:
    """Extract clean title/filename from URL or local file path."""
    if source.startswith("http://") or source.startswith("https://"):
        parsed = urlparse(source)
        path = unquote(parsed.path)
        filename = os.path.basename(path)
        clean_name = re.sub(r"\.pdf$", "", filename, flags=re.IGNORECASE)
        return clean_name if clean_name else "Remote Document"
    else:
        filename = os.path.basename(source)
        clean_name = re.sub(r"\.pdf$", "", filename, flags=re.IGNORECASE)
        return clean_name if clean_name else "Local Document"


def sanitize_text(text: str) -> str:
    """Sanitize string to prevent UTF-8 encoding errors from unpaired surrogates."""
    if not isinstance(text, str):
        return ""
    return text.encode("utf-8", "ignore").decode("utf-8", "ignore")


def load_pdf_from_url(url: str, session: requests.Session = None) -> List[Document]:
    """Download PDF from URL to a temp file and load pages with PyPDFLoader."""
    if session is None:
        session = requests.Session()

    logger.info("Downloading PDF: %s", url)
    response = session.get(url, timeout=120)
    response.raise_for_status()

    doc_name = extract_doc_name_from_url_or_path(url)

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_pdf:
        temp_pdf.write(response.content)
        temp_path = temp_pdf.name

    try:
        loader = PyPDFLoader(temp_path)
        pdf_docs = loader.load()
        for i, doc in enumerate(pdf_docs):
            doc.page_content = sanitize_text(doc.page_content)
            doc.metadata["document_name"] = sanitize_text(doc_name)
            doc.metadata["source_url"] = sanitize_text(url)
            doc.metadata["source_file"] = sanitize_text(os.path.basename(url.split("?")[0]))
            if "page" in doc.metadata:
                doc.metadata["page_number"] = doc.metadata["page"] + 1
            else:
                doc.metadata["page_number"] = i + 1

        logger.info("Loaded %d pages from %s", len(pdf_docs), doc_name)
        return pdf_docs
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def load_pdf_from_file_path(file_path: str, custom_name: str = None) -> List[Document]:
    """Load local PDF file, sanitize content and enrich metadata."""
    doc_name = custom_name or extract_doc_name_from_url_or_path(file_path)
    loader = PyPDFLoader(file_path)
    pdf_docs = loader.load()
    for i, doc in enumerate(pdf_docs):
        doc.page_content = sanitize_text(doc.page_content)
        doc.metadata["document_name"] = sanitize_text(doc_name)
        doc.metadata["source_file"] = sanitize_text(os.path.basename(file_path))
        if "page" in doc.metadata:
            doc.metadata["page_number"] = doc.metadata["page"] + 1
        else:
            doc.metadata["page_number"] = i + 1
    logger.info("Loaded %d pages from local file %s", len(pdf_docs), doc_name)
    return pdf_docs


def split_documents(
    docs: List[Document],
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[Document]:
    """Split documents using RecursiveCharacterTextSplitter, sanitize, and filter empty chunks."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    split_docs = text_splitter.split_documents(docs)
    valid_chunks = []
    for doc in split_docs:
        doc.page_content = sanitize_text(doc.page_content).strip()
        if not doc.page_content:
            continue
        clean_meta = {}
        for k, v in doc.metadata.items():
            if isinstance(v, str):
                clean_meta[k] = sanitize_text(v)
            elif isinstance(v, (int, float, bool)):
                clean_meta[k] = v
            else:
                clean_meta[k] = str(v)
        doc.metadata = clean_meta
        valid_chunks.append(doc)
    logger.info("Split %d document pages into %d valid chunks", len(docs), len(valid_chunks))
    return valid_chunks


def index_documents(docs: List[Document], batch_size: int = 150) -> int:
    """Split documents and index them into ChromaDB in safe batches with retry."""
    if not docs:
        return 0
    split_docs = split_documents(docs)
    if not split_docs:
        return 0
    vectorstore = get_vectorstore()
    
    total = len(split_docs)
    logger.info("Indexing %d chunks into ChromaDB (batch size: %d)...", total, batch_size)
    
    for i in range(0, total, batch_size):
        batch = split_docs[i : i + batch_size]
        for attempt in range(1, 4):
            try:
                vectorstore.add_documents(batch)
                break
            except Exception as e:
                if attempt == 3:
                    logger.error("Failed batch %d to %d after 3 attempts: %s", i + 1, min(i + len(batch), total), e)
                    raise
                logger.warning("Batch %d indexing retry (attempt %d/3): %s. Waiting %ds...", i // batch_size + 1, attempt, e, attempt * 2)
                time.sleep(attempt * 2)
        logger.info("Indexed chunks %d to %d of %d", i + 1, min(i + len(batch), total), total)

    return total


def is_file_indexed(source_file: str) -> bool:
    """Check if chunks for this source_file are already present in ChromaDB."""
    try:
        vs = get_vectorstore()
        res = vs._collection.get(where={"source_file": source_file}, limit=1)
        return bool(res and res.get("ids"))
    except Exception:
        return False


def seed_default_documents(urls: List[str] = None) -> int:
    """
    Ingests local PDFs from data/pdf data/ into ChromaDB incrementally.
    Smallest books are indexed first so search is responsive immediately.
    Skips books that are already indexed so restarts are fast.
    """
    vectorstore = get_vectorstore()
    total_new_indexed = 0

    # ── Try local PDF files first (sorted by file size: smallest first) ─
    local_dir = Path(LOCAL_PDF_DIR)
    if local_dir.exists() and local_dir.is_dir():
        pdf_files = sorted(local_dir.glob("*.pdf"), key=lambda p: p.stat().st_size)
        if pdf_files:
            logger.info("Found %d local PDFs in '%s'.", len(pdf_files), LOCAL_PDF_DIR)
            for pdf_path in pdf_files:
                if is_file_indexed(pdf_path.name):
                    logger.info("Book '%s' is already indexed in ChromaDB. Skipping.", pdf_path.name)
                    continue

                try:
                    logger.info("Processing book: %s (%.1f MB)", pdf_path.name, pdf_path.stat().st_size / (1024 * 1024))
                    docs = load_pdf_from_file_path(str(pdf_path))
                    indexed = index_documents(docs)
                    total_new_indexed += indexed
                    logger.info("✓ Finished indexing '%s' (%d chunks stored)", pdf_path.name, indexed)
                except Exception as e:
                    logger.error("✗ Failed to ingest '%s': %s", pdf_path.name, e)

    # ── Fallback to remote URLs if no local PDFs were indexed ─────────
    if total_new_indexed == 0 and vectorstore._collection.count() == 0:
        target_urls = urls or DEFAULT_PDF_URLS
        logger.info("No local PDFs found. Seeding vectorstore with %d remote URLs...", len(target_urls))
        session = requests.Session()
        for url in target_urls:
            doc_name = extract_doc_name_from_url_or_path(url)
            if is_file_indexed(doc_name):
                logger.info("URL document '%s' is already indexed. Skipping.", doc_name)
                continue
            try:
                docs = load_pdf_from_url(url, session=session)
                indexed = index_documents(docs)
                total_new_indexed += indexed
                logger.info("✓ Finished indexing '%s' (%d chunks stored)", doc_name, indexed)
            except Exception as e:
                logger.error("✗ Failed to load PDF from %s: %s", url, e)

    total_in_db = vectorstore._collection.count()
    logger.info("Vectorstore currently has %d total chunks ready to serve.", total_in_db)
    return total_in_db
