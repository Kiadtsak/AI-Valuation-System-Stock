"""
Pydantic schemas for Phase 2 endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.db.models import UserTier, AuthProvider


# ─── Auth ───────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleOAuthRequest(BaseModel):
    """Body when frontend has already authenticated with Google."""
    id_token: str  # Google ID token


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ─── User ───────────────────────────────────────────────
class UserPublic(BaseModel):
    """What we return to the frontend (never include password!)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    tier: UserTier
    provider: AuthProvider
    is_verified: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=120)
    avatar_url: Optional[str] = Field(None, max_length=500)


class TierLimits(BaseModel):
    """Returned with user info — frontend can show 'X of Y used today'."""
    tier: UserTier
    daily_quota: int
    used_today: int
    remaining: int


# ─── Watchlist ──────────────────────────────────────────
class WatchlistAdd(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=15, pattern="^[A-Z0-9.-]+$")
    notes: Optional[str] = Field(None, max_length=500)
    target_price: Optional[float] = Field(None, ge=0)


class WatchlistUpdate(BaseModel):
    notes: Optional[str] = Field(None, max_length=500)
    target_price: Optional[float] = Field(None, ge=0)
    position: Optional[int] = Field(None, ge=0)


class WatchlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    symbol: str
    notes: Optional[str] = None
    target_price: Optional[float] = None
    intrinsic_value: Optional[float] = None
    position: int
    created_at: datetime
    updated_at: datetime


class WatchlistReorder(BaseModel):
    """Sent on drag-and-drop — array of {id, position}"""
    items: list[dict]  # [{"id": "...", "position": 0}, ...]


# ─── AI Reports History ─────────────────────────────────
class AIReportSummary(BaseModel):
    """For listing — without full content (saves bandwidth)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    symbol: str
    source: str
    snapshot_price: Optional[float] = None
    snapshot_iv: Optional[float] = None
    created_at: datetime


class AIReportFull(AIReportSummary):
    content: str
    snapshot_pe: Optional[float] = None
    tokens_used: Optional[int] = None
