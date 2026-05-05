"""
Auth business logic.
- Email/password signup + login
- Google OAuth verification
- Token refresh
"""
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.models import User, AuthProvider, UserTier
from app.auth.security import (
    hash_password, verify_password,
    create_token_pair, decode_token,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


# ─── Signup (Email/Password) ────────────────────────────
async def signup_email(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: Optional[str] = None,
) -> User:
    email = email.lower().strip()

    existing = await get_user_by_email(db, email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        provider=AuthProvider.EMAIL,
        tier=UserTier.FREE,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    logger.info(f"New user signup: {email}", extra={"user_id": user.id})
    return user


# ─── Login (Email/Password) ─────────────────────────────
async def login_email(
    db: AsyncSession,
    email: str,
    password: str,
) -> tuple[User, dict[str, str]]:
    email = email.lower().strip()
    user = await get_user_by_email(db, email)

    if not user or not user.hashed_password:
        # Don't reveal whether email exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.provider != AuthProvider.EMAIL:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Please log in with {user.provider.value}",
        )

    if not verify_password(password, user.hashed_password):
        logger.warning(f"Failed login: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )

    user.last_login_at = datetime.now(timezone.utc)
    tokens = create_token_pair(user.id, extra={"tier": user.tier.value})

    logger.info(f"Login: {email}", extra={"user_id": user.id})
    return user, tokens


# ─── Google OAuth ───────────────────────────────────────
async def verify_google_token(id_token: str) -> dict:
    """Verify Google ID token via Google's tokeninfo endpoint."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token},
        )
        if r.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token",
            )
        return r.json()


async def login_google(db: AsyncSession, id_token: str) -> tuple[User, dict[str, str]]:
    """Login or signup via Google ID token."""
    info = await verify_google_token(id_token)

    email = (info.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(400, "Google token missing email")
    if info.get("email_verified") != "true":
        raise HTTPException(400, "Google email not verified")

    google_id = info.get("sub")
    name = info.get("name") or info.get("given_name")
    picture = info.get("picture")

    user = await get_user_by_email(db, email)

    if not user:
        # Create new account
        user = User(
            email=email,
            full_name=name,
            avatar_url=picture,
            provider=AuthProvider.GOOGLE,
            provider_id=google_id,
            tier=UserTier.FREE,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        logger.info(f"Google signup: {email}", extra={"user_id": user.id})
    elif user.provider != AuthProvider.GOOGLE:
        # Existing email account — link Google
        if not user.provider_id:
            user.provider_id = google_id
        if not user.avatar_url:
            user.avatar_url = picture

    user.last_login_at = datetime.now(timezone.utc)
    tokens = create_token_pair(user.id, extra={"tier": user.tier.value})

    return user, tokens


# ─── Token Refresh ──────────────────────────────────────
async def refresh_tokens(
    db: AsyncSession,
    refresh_token: str,
) -> dict[str, str]:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = await get_user_by_id(db, user_id) if user_id else None

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return create_token_pair(user.id, extra={"tier": user.tier.value})
