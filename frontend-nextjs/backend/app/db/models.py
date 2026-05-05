"""
SQLAlchemy ORM models.
Production-ready with proper indexes, timestamps, and constraints.
"""
from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional
import uuid

from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, ForeignKey, Text,
    Enum as SQLEnum, UniqueConstraint, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    return str(uuid.uuid4())


# ─── Enums ──────────────────────────────────────────────
class UserTier(str, PyEnum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class AuthProvider(str, PyEnum):
    EMAIL = "email"
    GOOGLE = "google"


# ─── User ───────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(120))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))

    provider: Mapped[AuthProvider] = mapped_column(
        SQLEnum(AuthProvider, native_enum=False),
        default=AuthProvider.EMAIL,
        nullable=False,
    )
    provider_id: Mapped[Optional[str]] = mapped_column(String(255))

    tier: Mapped[UserTier] = mapped_column(
        SQLEnum(UserTier, native_enum=False),
        default=UserTier.FREE,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    # Relationships
    watchlists: Mapped[list["WatchlistItem"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    reports: Mapped[list["AIReport"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    usage_logs: Mapped[list["UsageLog"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_users_email_provider", "email", "provider"),
    )


# ─── Watchlist ──────────────────────────────────────────
class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    symbol: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Optional snapshot data
    target_price: Mapped[Optional[float]] = mapped_column(Float)
    intrinsic_value: Mapped[Optional[float]] = mapped_column(Float)

    position: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    user: Mapped["User"] = relationship(back_populates="watchlists")

    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_user_symbol"),
        Index("ix_watchlist_user_position", "user_id", "position"),
    )


# ─── AI Report History ──────────────────────────────────
class AIReport(Base):
    __tablename__ = "ai_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    symbol: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String(50), default="gpt-4o-mini")
    source: Mapped[str] = mapped_column(String(30), default="openai")
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer)

    # Snapshot of key metrics at time of generation
    snapshot_price: Mapped[Optional[float]] = mapped_column(Float)
    snapshot_iv: Mapped[Optional[float]] = mapped_column(Float)
    snapshot_pe: Mapped[Optional[float]] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped["User"] = relationship(back_populates="reports")

    __table_args__ = (
        Index("ix_report_user_symbol_created", "user_id", "symbol", "created_at"),
    )


# ─── Usage Tracking (for tier enforcement) ──────────────
class UsageLog(Base):
    __tablename__ = "usage_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    endpoint: Mapped[str] = mapped_column(String(100), nullable=False)
    cost_units: Mapped[int] = mapped_column(Integer, default=1)  # 1=cheap, 10=AI gen
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )

    user: Mapped["User"] = relationship(back_populates="usage_logs")
