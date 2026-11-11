"""
FastAPI Route Handlers for Perplexity-Style RAG Application.
"""

import os
import tempfile
import logging
from typing import List
from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException, status, Response
from fastapi.responses import StreamingResponse

from backend.rag.page_renderer import render_pdf_page_image

from backend.api.models import (
    ChatRequest,
    ChatResponse,
    SourceReference,
    DocumentUploadURLRequest,
    DocumentIndexingResponse,
    HealthResponse,
)
from backend.api.middleware import limiter
from backend.rag.config import (
    OPENAI_MODEL,
    EMBEDDING_MODEL,
    LANGSMITH_TRACING,
)
from backend.rag.chain import rag_query, rag_query_stream
from backend.rag.vectorstore import get_document_count, get_vectorstore
from backend.rag.ingestion import (
    load_pdf_from_url,
    load_pdf_from_file_path,
    index_documents,
    extract_doc_name_from_url_or_path,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint returning DB and model status."""
    try:
        chunks_count = get_document_count()
        vectorstore_ready = True
    except Exception as e:
        logger.error("Vectorstore health check failed: %s", e)
        chunks_count = 0
        vectorstore_ready = False

    return HealthResponse(
        status="healthy" if vectorstore_ready else "degraded",
        vectorstore_ready=vectorstore_ready,
        chunks_count=chunks_count,
        model=OPENAI_MODEL,
        embedding_model=EMBEDDING_MODEL,
        langsmith_tracing=LANGSMITH_TRACING,
    )


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("45/minute")
async def chat_endpoint(request: Request, body: ChatRequest):
    """
    Research query endpoint.
    If stream=True, returns Server-Sent Events (SSE) stream.
    If stream=False, returns standard JSON response.
    """
    # Convert chat history model to dict format expected by chain
    history_dicts = [
        {"role": msg.role, "content": msg.content}
        for msg in (body.chat_history or [])
    ]

    if body.stream:
        # Stream response using Server-Sent Events (SSE)
        return StreamingResponse(
            rag_query_stream(
                question=body.question,
                chat_history=history_dicts,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        # Synchronous JSON response
        result = rag_query(
            question=body.question,
            chat_history=history_dicts,
        )
        sources_models = [
            SourceReference(
                source_id=s["source_id"],
                document_name=s["document_name"],
                page=s["page"],
                snippet=s["snippet"],
                full_content=s.get("full_content"),
                source_url=s.get("source_url"),
                image_url=s.get("image_url"),
                metadata=s.get("metadata"),
            )
            for s in result.get("sources", [])
        ]
        return ChatResponse(
            answer=result["answer"],
            sources=sources_models,
            conversation_id=body.conversation_id,
        )


@router.post("/documents/url", response_model=DocumentIndexingResponse)
@limiter.limit("10/minute")
async def index_document_url(request: Request, body: DocumentUploadURLRequest):
    """Download and index a PDF from a public web URL."""
    try:
        docs = load_pdf_from_url(body.url)
        if not docs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract any content from the provided PDF URL.",
            )
        chunks = index_documents(docs)
        doc_name = extract_doc_name_from_url_or_path(body.url)

        return DocumentIndexingResponse(
            status="success",
            document_name=doc_name,
            pages=len(docs),
            chunks=chunks,
            message=f"Successfully indexed '{doc_name}' ({len(docs)} pages, {chunks} chunks).",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to index PDF from URL %s: %s", body.url, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process PDF from the provided URL. Please check the URL is valid and accessible.",
        )


@router.post("/documents/upload", response_model=DocumentIndexingResponse)
@limiter.limit("10/minute")
async def upload_and_index_document(
    request: Request,
    file: UploadFile = File(...),
):
    """Upload a local PDF file and index it into ChromaDB."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are currently supported.",
        )

    from backend.rag.config import MAX_UPLOAD_SIZE_MB
    content = await file.read()
    max_bytes = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum upload size of {MAX_UPLOAD_SIZE_MB}MB.",
        )

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        docs = load_pdf_from_file_path(temp_path, custom_name=file.filename.replace(".pdf", ""))
        if not docs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not extract any text from uploaded PDF.",
            )
        chunks = index_documents(docs)
        doc_name = extract_doc_name_from_url_or_path(file.filename)

        return DocumentIndexingResponse(
            status="success",
            document_name=doc_name,
            pages=len(docs),
            chunks=chunks,
            message=f"Successfully uploaded and indexed '{doc_name}' ({len(docs)} pages, {chunks} chunks).",
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/documents")
async def list_indexed_status():
    """Returns vector store information, total chunk count, and list of indexed books."""
    try:
        vs = get_vectorstore()
        count = vs._collection.count()
        docs = []
        if count > 0:
            sample = vs._collection.get(include=["metadatas"], limit=2000)
            seen = set()
            for m in (sample.get("metadatas") or []):
                doc_name = m.get("document_name") or m.get("source_file") or "Document"
                if doc_name not in seen:
                    seen.add(doc_name)
                    docs.append({
                        "name": doc_name,
                        "source_file": m.get("source_file", ""),
                    })
        return {
            "status": "ready",
            "total_chunks": count,
            "documents": docs,
        }
    except Exception as e:
        logger.error("Failed to get indexed status: %s", e)
        return {
            "status": "error",
            "total_chunks": 0,
            "documents": [],
            "error": "Internal error retrieving document status.",
        }


@router.get("/documents/page-image")
async def get_document_page_image(source_file: str, page: int = 1, dpi: int = 140):
    """
    Renders and serves a high-resolution JPEG photo of the specified book/PDF page.
    Utilizes disk caching for lightning-fast loads.
    """
    # Input validation
    if page < 1 or page > 10000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page number must be between 1 and 10,000.",
        )
    if dpi < 72 or dpi > 300:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DPI must be between 72 and 300.",
        )

    try:
        img_bytes = render_pdf_page_image(source_file=source_file, page_number=page, dpi=dpi)
        if not img_bytes:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Could not render page image for source '{source_file}' at page {page}.",
            )
        return Response(
            content=img_bytes,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=86400, immutable",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error serving page image for %s (p.%d): %s", source_file, page, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to render the requested page image.",
        )
