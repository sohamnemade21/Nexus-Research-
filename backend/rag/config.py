"""
Centralized configuration — all settings loaded from .env.
Never import os.getenv() directly in other modules; use this.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env from project root (one level above backend/) ──────────
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env")

# ── OpenAI ───────────────────────────────────────────────────────────
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
MAX_COMPLETION_TOKENS: int = int(os.getenv("MAX_COMPLETION_TOKENS", "1024"))

# ── Chunking ─────────────────────────────────────────────────────────
CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))

# ── Retriever ────────────────────────────────────────────────────────
RETRIEVER_K: int = int(os.getenv("RETRIEVER_K", "4"))

# ── ChromaDB ─────────────────────────────────────────────────────────
CHROMA_PERSIST_DIR: str = os.getenv(
    "CHROMA_PERSIST_DIR",
    str(_PROJECT_ROOT / "data" / "chroma_db"),
)
CHROMA_COLLECTION: str = os.getenv("CHROMA_COLLECTION", "rag_documents")

# ── Seeding ──────────────────────────────────────────────────────────
SEED_DOCUMENTS: bool = os.getenv("SEED_DOCUMENTS", "true").lower() == "true"

# ── Application Environment ──────────────────────────────────────────
ENV: str = os.getenv("ENV", "production")
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

# ── Security ─────────────────────────────────────────────────────────
API_KEY: str = os.getenv("API_KEY", "")
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if origin.strip()
]

# ── Upload Limits ────────────────────────────────────────────────────
MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))

# ── LangSmith ────────────────────────────────────────────────────────
LANGSMITH_API_KEY: str = os.getenv("LANGSMITH_API_KEY", "")
LANGSMITH_TRACING: bool = os.getenv("LANGSMITH_TRACING", "true").lower() == "true"
LANGCHAIN_PROJECT: str = os.getenv("LANGCHAIN_PROJECT", "RAG-Evaluation")

# Push LangSmith env vars so LangChain picks them up automatically
if LANGSMITH_API_KEY:
    os.environ["LANGSMITH_API_KEY"] = LANGSMITH_API_KEY
if LANGSMITH_TRACING:
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
if LANGCHAIN_PROJECT:
    os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT

# ── Local PDF Data Directory ─────────────────────────────────────────
LOCAL_PDF_DIR: str = str(_PROJECT_ROOT / "data" / "pdf data")

# ── Default PDF URLs (kept as fallback for remote ingestion) ─────────
DEFAULT_PDF_URLS: list[str] = [
    "https://github.com/kunalarya873/PythonBooks/raw/main/Automate%20the%20Boring%20Stuff%20with%20Python.pdf",
    "https://github.com/ValeriiaMur/Python-books-and-exercises/raw/master/python-crash-course.pdf",
    "https://github.com/DanielRizvi/oreilly-books-collection-/raw/main/Data-Science-and-AI/LLMs/Hands-On-Large-Language-Models.pdf",
    "https://github.com/DanielRizvi/oreilly-books-collection-/raw/main/Data-Science-and-AI/AI/AI%20Engineering.pdf",
    "https://github.com/DanielRizvi/oreilly-books-collection-/raw/main/Data-Science-and-AI/3D-DataScience/3D-Data-Science-with-Python-Building-Accurate-Digital-Environments-with-3D-Point-Cloud-Workflows.pdf",
]


# ── Startup Validation ───────────────────────────────────────────────
def validate_config():
    """Validate critical configuration on startup."""
    import sys
    errors = []
    if not OPENAI_API_KEY:
        errors.append("OPENAI_API_KEY is not set. The application will not function.")
    if ENV not in ("development", "production", "testing"):
        errors.append(f"ENV must be 'development', 'production', or 'testing'. Got: '{ENV}'")
    if errors:
        for err in errors:
            print(f"[CONFIG ERROR] {err}", file=sys.stderr)
        if ENV == "production":
            sys.exit(1)

