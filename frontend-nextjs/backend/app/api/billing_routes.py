"""
Phase 3 routes: billing + email verification + password reset.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import get_db
from app.db.models import User, UserTier
from app.auth.dependencies import get_current_user
from app.auth.security import hash_password
from app.billing import stripe_service
from app.email import email_service
from app.services.auth_service import get_user_by_email

logger = get_logger(__name__)

router = APIRouter(prefix="/api/billing", tags=["billing"])
auth_router = APIRouter(prefix="/api/auth", tags=["auth-extended"])


# ════════════════════════════════════════════════════════
# BILLING
# ════════════════════════════════════════════════════════

class CheckoutRequest(BaseModel):
    success_url: str
    cancel_url: str


class PortalRequest(BaseModel):
    return_url: str


@router.post("/checkout")
async def create_checkout(
    payload: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create Stripe Checkout session for Pro upgrade."""
    return await stripe_service.StripeService.create_checkout_session(
        db, user, payload.success_url, payload.cancel_url
    )


@router.post("/portal")
async def create_portal(
    payload: PortalRequest,
    user: User = Depends(get_current_user),
):
    """Open Stripe customer portal for self-service."""
    url = await stripe_service.StripeService.create_billing_portal(
        user, payload.return_url
    )
    return {"url": url}


@router.post("/cancel", status_code=200)
async def cancel_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel subscription at period end."""
    await stripe_service.StripeService.cancel_subscription(user)
    return {"message": "Subscription will end at current period close"}


@router.get("/invoices")
async def list_invoices(user: User = Depends(get_current_user)):
    """List user's recent invoices."""
    return await stripe_service.StripeService.list_invoices(user)


@router.get("/subscription")
async def get_subscription_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns user's current subscription state."""
    from sqlalchemy import select
    from app.db.models import Subscription
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        return {"tier": user.tier.value, "active": False}

    return {
        "tier": user.tier.value,
        "active": sub.status in ("active", "trialing"),
        "status": sub.status,
        "cancel_at_period_end": sub.cancel_at_period_end,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "trial_end": sub.trial_end.isoformat() if sub.trial_end else None,
    }


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Stripe webhook receiver.
    Configure URL in Stripe Dashboard:  https://yourapi.com/api/billing/webhook
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    event = stripe_service.verify_webhook(payload, sig_header)
    await stripe_service.handle_webhook_event(db, event)

    # Send subscription confirmation email on first activation
    if event["type"] == "customer.subscription.created":
        sub_obj = event["data"]["object"]
        from sqlalchemy import select
        result = await db.execute(
            select(User).where(User.stripe_customer_id == sub_obj.get("customer"))
        )
        user = result.scalar_one_or_none()
        if user:
            await email_service.send_email(
                db, user.email, "subscription_confirmed",
                {"name": user.full_name or "there", "app_url": settings.APP_URL},
                user_id=user.id,
            )

    return {"received": True}


# ════════════════════════════════════════════════════════
# EMAIL VERIFICATION
# ════════════════════════════════════════════════════════

@auth_router.post("/send-verification", status_code=200)
async def send_verification_email(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send/resend email verification link."""
    if user.is_verified:
        return {"message": "Email already verified"}

    token = await email_service.create_verification_token(db, user, purpose="verify")
    verify_url = f"{settings.APP_URL}/verify-email?token={token}"

    await email_service.send_email(
        db, user.email, "verify",
        {"email": user.email, "verify_url": verify_url},
        user_id=user.id,
    )
    return {"message": "Verification email sent"}


class VerifyTokenRequest(BaseModel):
    token: str


@auth_router.post("/verify-email", status_code=200)
async def verify_email(
    payload: VerifyTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Confirm email via token from email link."""
    user = await email_service.consume_verification_token(
        db, payload.token, purpose="verify"
    )
    if not user:
        raise HTTPException(400, "Invalid or expired token")

    user.is_verified = True
    return {"message": "Email verified", "email": user.email}


# ════════════════════════════════════════════════════════
# PASSWORD RESET
# ════════════════════════════════════════════════════════

class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


@auth_router.post("/forgot-password", status_code=200)
async def forgot_password(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Initiate password reset (sends email if user exists)."""
    user = await get_user_by_email(db, payload.email)

    # Always return success (don't reveal if email exists)
    if user and user.hashed_password:  # only for email-auth users
        token = await email_service.create_verification_token(
            db, user, purpose="reset", hours_valid=1
        )
        reset_url = f"{settings.APP_URL}/reset-password?token={token}"

        await email_service.send_email(
            db, user.email, "reset_password",
            {"reset_url": reset_url},
            user_id=user.id,
        )

    return {"message": "If an account exists, a reset link has been sent"}


@auth_router.post("/reset-password", status_code=200)
async def reset_password(
    payload: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    """Confirm password reset via token."""
    if len(payload.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    user = await email_service.consume_verification_token(
        db, payload.token, purpose="reset"
    )
    if not user:
        raise HTTPException(400, "Invalid or expired token")

    user.hashed_password = hash_password(payload.new_password)
    return {"message": "Password reset successful"}


# ════════════════════════════════════════════════════════
# ACCOUNT DELETION (with password re-auth)
# ════════════════════════════════════════════════════════

class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str  # must equal "DELETE MY ACCOUNT"


@auth_router.delete("/me", status_code=204)
async def delete_account(
    payload: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete account permanently. Requires password + confirmation phrase."""
    if payload.confirmation != "DELETE MY ACCOUNT":
        raise HTTPException(400, "Confirmation phrase incorrect")

    from app.auth.security import verify_password
    if user.hashed_password and not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Wrong password")

    # Cancel any active Stripe subscription
    if user.stripe_customer_id:
        try:
            await stripe_service.StripeService.cancel_subscription(user)
        except Exception:
            pass  # don't block deletion

    logger.info(f"Account deletion: {user.email}", extra={"user_id": user.id})
    await db.delete(user)
