"""
Auth endpoints: signup, login, refresh, OAuth, me.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.auth.dependencies import get_current_user
from app.auth.security import create_token_pair
from app.models.auth_schemas import (
    SignupRequest, LoginRequest, RefreshRequest, GoogleOAuthRequest,
    TokenResponse, UserPublic, UserUpdate, TierLimits,
)
from app.services import auth_service, usage_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=201)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.signup_email(
        db, payload.email, payload.password, payload.full_name
    )
    return create_token_pair(user.id, extra={"tier": user.tier.value})


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user, tokens = await auth_service.login_email(
        db, payload.email, payload.password
    )
    return tokens


@router.post("/google", response_model=TokenResponse)
async def google_oauth(
    payload: GoogleOAuthRequest, db: AsyncSession = Depends(get_db)
):
    user, tokens = await auth_service.login_google(db, payload.id_token)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.refresh_tokens(db, payload.refresh_token)


@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)):
    """Current user profile."""
    return user


@router.patch("/me", response_model=UserPublic)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    await db.flush()
    return user


@router.get("/me/limits", response_model=TierLimits)
async def my_limits(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """How much of my quota have I used today?"""
    info = await usage_service.check_quota(db, user, cost=0)
    return info


@router.post("/logout")
async def logout():
    """
    JWTs are stateless — frontend just discards tokens.
    For full revocation, implement a token blocklist (Phase 3).
    """
    return {"message": "Logged out"}
