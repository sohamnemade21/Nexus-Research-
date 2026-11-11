"""
LLM instances — singleton ChatOpenAI for production and the original
generate_openai_content() helper preserved for LangSmith evaluation.
"""

import logging
import re
import threading
import time

from openai import OpenAI, OpenAIError, RateLimitError
from langchain_openai import ChatOpenAI

from backend.rag.config import (
    OPENAI_API_KEY,
    OPENAI_MODEL,
    MAX_COMPLETION_TOKENS,
)

logger = logging.getLogger(__name__)

# ── Singleton LLM instances ─────────────────────────────────────────

_llm: ChatOpenAI | None = None
_streaming_llm: ChatOpenAI | None = None
_llm_lock = threading.Lock()


def get_llm() -> ChatOpenAI:
    """Non-streaming ChatOpenAI used by the RAG chain."""
    global _llm
    if _llm is None:
        with _llm_lock:
            if _llm is None:
                _llm = ChatOpenAI(
                    model=OPENAI_MODEL,
                    api_key=OPENAI_API_KEY,
                    temperature=0,
                    max_completion_tokens=MAX_COMPLETION_TOKENS,
                )
    return _llm


def get_streaming_llm() -> ChatOpenAI:
    """Streaming ChatOpenAI for SSE responses."""
    global _streaming_llm
    if _streaming_llm is None:
        with _llm_lock:
            if _streaming_llm is None:
                _streaming_llm = ChatOpenAI(
                    model=OPENAI_MODEL,
                    api_key=OPENAI_API_KEY,
                    temperature=0,
                    max_completion_tokens=MAX_COMPLETION_TOKENS,
                    streaming=True,
                )
    return _streaming_llm


# =====================================================================
# Preserved from notebook — used ONLY by evaluation.py
# =====================================================================

_openai_client: OpenAI | None = None
_openai_client_lock = threading.Lock()
OPENAI_MIN_SECONDS_BETWEEN_CALLS = 13.0
_openai_lock = threading.Lock()
_last_openai_call_at = 0.0
_openai_cache: dict[tuple, str] = {}


def _get_openai_client() -> OpenAI:
    """Lazy-initialized OpenAI client for evaluation."""
    global _openai_client
    if _openai_client is None:
        with _openai_client_lock:
            if _openai_client is None:
                _openai_client = OpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


def _retry_delay_seconds(error: Exception, default: float = 60.0) -> float:
    """Parse retry-after from OpenAI error messages."""
    text = str(error)
    match = re.search(r"Please try again in ([\d.]+)s", text)
    if match:
        return float(next(x for x in match.groups() if x is not None)) + 2.0
    return default


def generate_openai_content(
    model: str,
    contents: str,
    max_retries: int = 5,
) -> str:
    """
    Rate-limited, retrying OpenAI call with caching.
    Preserved from the original notebook for LangSmith evaluation compatibility.
    """
    global _last_openai_call_at

    cache_key = (model, contents)
    if cache_key in _openai_cache:
        return _openai_cache[cache_key]

    with _openai_lock:
        for attempt in range(max_retries):
            elapsed = time.monotonic() - _last_openai_call_at
            wait_seconds = OPENAI_MIN_SECONDS_BETWEEN_CALLS - elapsed
            if wait_seconds > 0:
                time.sleep(wait_seconds)

            try:
                response = _get_openai_client().chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": contents}],
                )
                _last_openai_call_at = time.monotonic()
                result = response.choices[0].message.content
                _openai_cache[cache_key] = result
                return result

            except (RateLimitError, OpenAIError) as error:
                _last_openai_call_at = time.monotonic()
                error_text = str(error)
                logger.warning("OpenAI Error: %s", error_text)

                if (
                    "429" in error_text
                    or "503" in error_text
                    or "rate_limit" in error_text.lower()
                ):
                    sleep_for = _retry_delay_seconds(error, default=30)
                    logger.info("Retrying in %.0f seconds...", sleep_for)
                    time.sleep(sleep_for)
                    continue

                raise

    raise RuntimeError("OpenAI failed after maximum retries.")
