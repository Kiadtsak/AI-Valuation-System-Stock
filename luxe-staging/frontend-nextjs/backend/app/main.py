"""
Luxe Capital API — Phase 2 entry point.
Now with: Auth, Watchlist, AI Reports History.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.cache import close_redis, get_redis
from app.core.security import (
    limiter, rate_limit_handler,
    RequestIDMiddleware, SecurityHeadersMiddleware,
)
from app.db.session import engine, init_db
from app.api.routes import router as main_router
from app.api.auth_routes import router as auth_router
from app.api.watchlist_routes import router as watchlist_router
from app.api.reports_routes import router as reports_router
from app.services.financials import fmp_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown logic."""
    setup_logging()
    logger = get_logger(__name__)

    logger.info(
        "Application starting",
        extra={"env": settings.ENV, "version": settings.VERSION},
    )

    # Initialize database (creates tables if missing — use Alembic in prod)
    if not settings.is_production:
        await init_db()
        logger.info("Database tables ensured (dev mode)")

    # Warm up Redis
    redis = await get_redis()
    if redis:
        logger.info("Redis ready")

    # Production checks
    if settings.is_production:
        if not settings.FMP_API_KEY:
            logger.error("FMP_API_KEY not set in production!")
        if settings.JWT_SECRET == "change-me-in-production-min-32-chars-please":
            logger.error("Default JWT_SECRET in production!")
        if settings.DATABASE_URL.startswith("sqlite"):
            logger.warning("Using SQLite in production — consider PostgreSQL")

    yield

    # Shutdown
    logger.info("Application shutting down")
    await fmp_client.close()
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)


# ─── Middleware ───────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type", "Authorization",
        "X-Request-ID", "X-Internal-Key",
    ],
    expose_headers=["X-Request-ID", "X-Response-Time"],
)


# ─── Rate Limiter ──────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


# ─── Global Error Handler ──────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    logger = get_logger(__name__)
    logger.exception("Unhandled exception", extra={"path": request.url.path})
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_error",
            "message": "Something went wrong" if settings.is_production else str(exc),
            "request_id": getattr(request.state, "request_id", None),
        },
    )


# ─── Routes ────────────────────────────────────────────
app.include_router(main_router)
app.include_router(auth_router)
app.include_router(watchlist_router)
app.include_router(reports_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
