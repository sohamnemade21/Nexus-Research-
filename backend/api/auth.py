"""
Optional API Key Authentication Guard.
Enable by setting API_KEY in environment variables.
When API_KEY is not set, all requests pass through (open mode).
"""

import logging
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

from backend.rag.config import API_KEY

logger = logging.getLogger(__name__)

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(_api_key_header)):
    """
    Dependency that enforces API key auth when API_KEY is configured.
    If API_KEY is not set, all requests are allowed (open mode).
    """
    if not API_KEY:
        return  # No auth configured — open access
    if api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
