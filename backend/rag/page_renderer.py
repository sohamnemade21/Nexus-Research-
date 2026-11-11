"""
High-Performance PDF Page Renderer.
Renders cited PDF book pages into crisp images using PyMuPDF (fitz) with disk caching.
Allows the frontend to display visual previews and photos of the exact pages cited in answers.
"""

import os
import re
import logging
from pathlib import Path
from typing import Optional
import fitz

from backend.rag.config import LOCAL_PDF_DIR

logger = logging.getLogger(__name__)

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PAGE_CACHE_DIR = _PROJECT_ROOT / "data" / "page_cache"
PAGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _find_pdf_path(source_file: str) -> Optional[Path]:
    """Find the PDF file on disk by exact or fuzzy match."""
    if not source_file:
        return None

    pdf_dir = Path(LOCAL_PDF_DIR)
    
    # 1. Exact match
    p = pdf_dir / source_file
    if p.exists() and p.is_file():
        return p

    # 2. Append .pdf
    p = pdf_dir / f"{source_file}.pdf"
    if p.exists() and p.is_file():
        return p

    # 3. Clean filename match
    clean_target = re.sub(r"[^\w]", "", source_file.lower().replace(".pdf", ""))
    if pdf_dir.exists():
        for file in pdf_dir.glob("*.pdf"):
            clean_name = re.sub(r"[^\w]", "", file.stem.lower())
            if clean_name == clean_target or clean_target in clean_name or clean_name in clean_target:
                return file

    return None


def render_pdf_page_image(source_file: str, page_number: int, dpi: int = 140) -> Optional[bytes]:
    """
    Renders a specific page of a PDF as JPEG image bytes.
    Uses disk caching to ensure subsequent requests are instantaneous.
    
    Args:
        source_file: PDF filename or document title
        page_number: 1-indexed page number
        dpi: Resolution for rendering (default 140 DPI for sharp, legible text)
    """
    if page_number < 1:
        page_number = 1

    pdf_path = _find_pdf_path(source_file)
    if not pdf_path:
        logger.warning("PDF file not found for source: %s", source_file)
        return None

    safe_stem = re.sub(r"[^\w\-]", "_", pdf_path.stem)
    cache_path = PAGE_CACHE_DIR / f"{safe_stem}_p{page_number}_{dpi}dpi.jpg"

    # Return cached image if available
    if cache_path.exists() and cache_path.stat().st_size > 0:
        try:
            return cache_path.read_bytes()
        except Exception as e:
            logger.warning("Failed reading cached image %s: %s", cache_path, e)

    try:
        doc = fitz.open(str(pdf_path))
        total_pages = len(doc)
        if total_pages == 0:
            doc.close()
            return None

        # Convert 1-indexed page to 0-indexed, bounded
        page_idx = min(max(0, page_number - 1), total_pages - 1)
        page = doc.load_page(page_idx)
        
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("jpg")
        doc.close()

        # Cache on disk
        try:
            cache_path.write_bytes(img_bytes)
        except Exception as e:
            logger.warning("Failed writing to page cache %s: %s", cache_path, e)

        return img_bytes

    except Exception as e:
        logger.error("Error rendering PDF page %d of %s: %s", page_number, source_file, e)
        return None
