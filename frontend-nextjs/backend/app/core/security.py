"""
Security middleware:
- API key authentication (server-to-server)
- Rate limiting per IP/user
- Request ID generation (for tracing)
- Security headers
"""
import time
import uuid
from typing import Callable

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import get_logger, request_id_ctx

logger = get_logger(__name__)


# ─── Rate Limiter ───────────────────────────────────────
def get_rate_limit_key(request: Request) -> str:
    """
    Rate limit key strategy:
    1. Authenticated user → user:{user_id}
    2. API key → key:{key_hash}
    3. Anonymous → ip:{ip}
    """
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "id"):
        return f"user:{user.id}"

    key = request.headers.get("X-API-Key")
    if key:
        return f"key:{key[:8]}"

    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=[settings.RATELIMIT_ANON],
    storage_uri=settings.REDIS_URL,
    headers_enabled=True,  # adds X-RateLimit-* headers
)


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom JSON response for rate limit hits."""
    retry_after = int(exc.detail.split()[-1]) if "second" in str(exc.detail) else 60
    logger.warning(
        "Rate limit exceeded",
        extra={"limit": str(exc.detail), "key": get_rate_limit_key(request)},
    )
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": f"Too many requests. Limit: {exc.detail}",
            "retry_after": retry_after,
        },
        headers={"Retry-After": str(retry_after)},
    )


# ─── Request ID Middleware ──────────────────────────────
class RequestIDMiddleware(BaseHTTPMiddleware):
    """Add a unique request ID to every request for log tracing."""

    async def dispatch(self, request: Request, call_next: Callable):
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = rid
        token = request_id_ctx.set(rid)

        start = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)

        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = rid
        response.headers["X-Response-Time"] = f"{elapsed_ms:.2f}ms"

        logger.info(
            "request_completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round(elapsed_ms, 2),
                "ip": get_remote_address(request),
            },
        )
        return response


# ─── Security Headers ───────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


# ─── Internal API Key Auth ──────────────────────────────
async def require_internal_api_key(request: Request) -> None:
    """
    Dependency for protected endpoints called by Next.js backend.
    Used so random people can't hit /api/financials directly.
    """
    key = request.headers.get("X-Internal-Key")
    if key != settings.INTERNAL_API_KEY:
        logger.warning(
            "Invalid internal API key attempt",
            extra={"ip": get_remote_address(request), "provided": bool(key)},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal API key",
        )
