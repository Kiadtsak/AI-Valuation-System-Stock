"""
Async SQLAlchemy 2.0 setup.
- Connection pool sized for production
- Auto-rollback on errors
- Yields fresh session per request
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
    """Base class for all ORM models."""
    pass


def _make_async_url(url: str) -> str:
    """Convert sync DSN to async DSN."""
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):  # Railway/Heroku style
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


ASYNC_DATABASE_URL = _make_async_url(settings.DATABASE_URL)

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.DEBUG and not settings.is_production,
    pool_size=10 if not ASYNC_DATABASE_URL.startswith("sqlite") else 1,
    max_overflow=20 if not ASYNC_DATABASE_URL.startswith("sqlite") else 0,
    pool_pre_ping=True,
    pool_recycle=3600,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create tables (dev only — use Alembic in production)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized")
