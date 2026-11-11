"""
Persistent ChromaDB vector store — replaces the notebook's InMemoryVectorStore.
"""

import logging
import threading

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

from backend.rag.config import (
    OPENAI_API_KEY,
    EMBEDDING_MODEL,
    CHROMA_PERSIST_DIR,
    CHROMA_COLLECTION,
    RETRIEVER_K,
)

logger = logging.getLogger(__name__)

# ── Singleton instances ──────────────────────────────────────────────

_embeddings: OpenAIEmbeddings | None = None
_vectorstore: Chroma | None = None
_emb_lock = threading.Lock()
_vs_lock = threading.Lock()


def get_embeddings() -> OpenAIEmbeddings:
    """Singleton OpenAI embedding model (text-embedding-3-small)."""
    global _embeddings
    if _embeddings is None:
        with _emb_lock:
            if _embeddings is None:
                _embeddings = OpenAIEmbeddings(
                    model=EMBEDDING_MODEL,
                    api_key=OPENAI_API_KEY,
                )
                logger.info("Initialized embedding model: %s", EMBEDDING_MODEL)
    return _embeddings


def get_vectorstore() -> Chroma:
    """
    Singleton ChromaDB instance with persistent storage.
    Data survives server restarts at CHROMA_PERSIST_DIR.
    """
    global _vectorstore
    if _vectorstore is None:
        with _vs_lock:
            if _vectorstore is None:
                _vectorstore = Chroma(
                    collection_name=CHROMA_COLLECTION,
                    embedding_function=get_embeddings(),
                    persist_directory=CHROMA_PERSIST_DIR,
                )
                count = _vectorstore._collection.count()
                logger.info(
                    "ChromaDB ready — collection '%s' has %d documents (dir: %s)",
                    CHROMA_COLLECTION,
                    count,
                    CHROMA_PERSIST_DIR,
                )
    return _vectorstore


def get_retriever(k: int | None = None):
    """LangChain retriever backed by ChromaDB."""
    return get_vectorstore().as_retriever(
        search_kwargs={"k": k or RETRIEVER_K}
    )


def get_document_count() -> int:
    """Return the number of chunks currently stored."""
    return get_vectorstore()._collection.count()
