"""
FastAPI Main Application Entry Point.
Production-grade setup with CORS, Rate Limiting, Auth, Logging, and Async Auto-Seeding.
"""

import sys
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure project root is in sys.path
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from backend.rag.config import (
    SEED_DOCUMENTS,
    CHROMA_PERSIST_DIR,
    ENV,
    CORS_ORIGINS,
    API_KEY,
    LOG_LEVEL,
    validate_config,
)
from backend.rag.vectorstore import get_vectorstore
from backend.rag.ingestion import seed_default_documents
from backend.api.routes import router as api_router
from backend.api.middleware import limiter, rate_limit_exceeded_handler, LoggingMiddleware
from backend.api.auth import verify_api_key

# Validate configuration on import
validate_config()

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("rag.main")


async def _async_seed():
    """Background task to seed default books incrementally without blocking server startup."""
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, seed_default_documents)
    except Exception as e:
        logger.error("Background auto-seeding encountered an error: %s", e, exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    logger.info("Starting Nexus Research RAG — env=%s", ENV)
    seed_task = None
    if ENV != "testing":
        logger.info("Initializing ChromaDB vector store at %s...", CHROMA_PERSIST_DIR)
        get_vectorstore()

        # Launch non-blocking background seeding if enabled
        if SEED_DOCUMENTS:
            seed_task = asyncio.create_task(_async_seed())

    yield

    # Graceful shutdown
    if seed_task and not seed_task.done():
        seed_task.cancel()
        try:
            await seed_task
        except asyncio.CancelledError:
            pass
    logger.info("Shutting down RAG application gracefully.")


# ── Application Factory ──────────────────────────────────────────────

_docs_url = "/docs" if ENV == "development" else None
_redoc_url = "/redoc" if ENV == "development" else None

app = FastAPI(
    title="Nexus Research — AI RAG API",
    description="Production-grade RAG backend with PDF ingestion, ChromaDB vector search, and streaming answers.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)

# Attach SlowAPI state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Custom logging and timing middleware
app.add_middleware(LoggingMiddleware)

# Enable CORS — restricted origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if ENV == "production" else ["*"],
    allow_credentials=ENV == "production",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "X-Request-ID"],
)

# Register API Router with optional auth dependency
if API_KEY:
    app.include_router(api_router, dependencies=[Depends(verify_api_key)])
    logger.info("API key authentication is ENABLED.")
else:
    app.include_router(api_router)
    if ENV == "production":
        logger.warning("API key authentication is DISABLED in production. Set API_KEY to enable it.")


# ── Serve Built Frontend (SPA) if available ──────────────────────────
_FRONTEND_DIST = _PROJECT_ROOT / "frontend" / "dist"
if _FRONTEND_DIST.exists() and (_FRONTEND_DIST / "index.html").exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    if (_FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Do not catch unhandled /api calls as SPA routes
        if full_path.startswith("api/") or full_path == "api":
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = _FRONTEND_DIST / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    async def root():
        return {
            "message": "Nexus Research AI RAG API is running.",
            "docs": _docs_url or "Disabled in production",
            "health": "/api/health",
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=(ENV == "development"),
    )
