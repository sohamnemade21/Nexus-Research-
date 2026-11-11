"""
API Middleware — Rate Limiting, Request ID, and Access Logging.
"""

import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

logger = logging.getLogger("api.access")

# Initialize SlowAPI rate limiter (identifies clients by remote IP)
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Custom JSON response for rate limit violations."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": f"Too many requests. Limit: {exc.detail}",
        },
    )


class LoggingMiddleware(BaseHTTPMiddleware):
    """Logs incoming requests with unique request IDs, response status codes, and execution duration."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000

        # Don't clutter logs with repeated health checks
        if request.url.path != "/api/health":
            logger.info(
                "[%s] %s %s -> %d (%.2fms)",
                request_id,
                request.method,
                request.url.path,
                response.status_code,
                process_time,
            )
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
        return response
