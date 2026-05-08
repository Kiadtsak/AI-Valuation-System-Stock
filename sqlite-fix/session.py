"""
Database session — supports both PostgreSQL (production) and SQLite (dev fallback).

Fix for: TypeError: Invalid argument(s) 'pool_size','max_overflow' sent to
         create_engine(), using configuration SQLiteDialect_aiosqlite/NullPool

Cause: pool_size/max_overflow are PostgreSQL-only. SQLite uses NullPool which
       rejects these kwargs.

Fix: Conditionally pass pool params based on URL scheme.
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession, async_sessionmaker, create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    """Base for all ORM models."""
    pass


# ─── Detect dialect ────────────────────────────────────
_url = str(settings.DATABASE_URL)
IS_SQLITE = _url.startswith("sqlite")
IS_POSTGRES = "postgresql" in _url or "postgres" in _url


# ─── Build engine kwargs based on dialect ──────────────
engine_kwargs: dict = {
    "echo": settings.SQL_ECHO if hasattr(settings, "SQL_ECHO") else False,
    "future": True,
}

if IS_POSTGRES:
    # PostgreSQL: enable connection pooling
    engine_kwargs.update({
        "pool_size":      getattr(settings, "DB_POOL_SIZE", 5),
        "max_overflow":   getattr(settings, "DB_MAX_OVERFLOW", 10),
        "pool_pre_ping":  True,
        "pool_recycle":   3600,
    })
    logger.info(f"DB engine: PostgreSQL with pool_size={engine_kwargs['pool_size']}")
elif IS_SQLITE:
    # SQLite: NullPool (no pooling), no pool params allowed
    # connect_args needed for SQLite to allow async access
    engine_kwargs.update({
        "connect_args": {"check_same_thread": False},
    })
    logger.info(f"DB engine: SQLite (dev mode, no pooling)")
else:
    logger.warning(f"Unknown DB dialect: {_url[:30]}... using defaults")


# ─── Create engine ─────────────────────────────────────
engine = create_async_engine(_url, **engine_kwargs)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ─── Dependency for FastAPI ────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides a DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── Init / lifespan helpers ───────────────────────────
async def init_db() -> None:
    """Create tables if they don't exist (used in dev / first run)."""
    async with engine.begin() as conn:
        # Import models so they register with Base
        from app.db import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database initialized")


async def dispose_db() -> None:
    """Close all connections (called on shutdown)."""
    await engine.dispose()
