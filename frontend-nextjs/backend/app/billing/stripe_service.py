"""
Stripe billing service for Luxe Capital Pro tier.

Handles:
- Creating Stripe customers on user signup
- Creating checkout sessions for subscription
- Webhook handling for subscription lifecycle
- Tier upgrades/downgrades
- Invoice retrieval
"""
from typing import Optional
from datetime import datetime

import stripe
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import User, UserTier, Subscription

logger = get_logger(__name__)

# Initialize Stripe SDK
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Wrapper around Stripe API."""

    @staticmethod
    async def get_or_create_customer(db: AsyncSession, user: User) -> str:
        """Returns Stripe customer ID, creating one if needed."""
        if user.stripe_customer_id:
            return user.stripe_customer_id

        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name or None,
                metadata={"user_id": user.id, "app": "luxe_capital"},
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer create failed: {e}")
            raise HTTPException(502, "Payment provider error")

        user.stripe_customer_id = customer.id
        await db.flush()
        logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
        return customer.id

    @staticmethod
    async def create_checkout_session(
        db: AsyncSession,
        user: User,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        """
        Create a Stripe Checkout session for Pro subscription.
        Returns {"url": "...", "session_id": "..."}.
        """
        if user.tier == UserTier.PRO:
            raise HTTPException(400, "Already on Pro plan")

        customer_id = await StripeService.get_or_create_customer(db, user)

        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                mode="subscription",
                line_items=[{
                    "price": settings.STRIPE_PRICE_ID_PRO,
                    "quantity": 1,
                }],
                success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url=cancel_url,
                allow_promotion_codes=True,
                billing_address_collection="auto",
                client_reference_id=user.id,
                metadata={"user_id": user.id, "tier": "pro"},
                subscription_data={
                    "trial_period_days": 14,  # 14-day free trial
                    "metadata": {"user_id": user.id},
                },
            )
        except stripe.error.StripeError as e:
            logger.error(f"Checkout creation failed: {e}")
            raise HTTPException(502, f"Could not create checkout: {e}")

        logger.info(f"Created checkout session {session.id} for user {user.id}")
        return {"url": session.url, "session_id": session.id}

    @staticmethod
    async def create_billing_portal(user: User, return_url: str) -> str:
        """Create Stripe customer portal for self-service management."""
        if not user.stripe_customer_id:
            raise HTTPException(400, "No subscription to manage")

        try:
            portal = stripe.billing_portal.Session.create(
                customer=user.stripe_customer_id,
                return_url=return_url,
            )
        except stripe.error.StripeError as e:
            raise HTTPException(502, f"Portal error: {e}")

        return portal.url

    @staticmethod
    async def cancel_subscription(user: User) -> None:
        """Cancel at period end (user keeps access until end of billing period)."""
        if not user.stripe_customer_id:
            raise HTTPException(400, "No active subscription")

        try:
            subs = stripe.Subscription.list(
                customer=user.stripe_customer_id,
                status="active",
                limit=1,
            )
            if not subs.data:
                raise HTTPException(404, "No active subscription found")
            sub = subs.data[0]
            stripe.Subscription.modify(sub.id, cancel_at_period_end=True)
            logger.info(f"Subscription {sub.id} scheduled to cancel for user {user.id}")
        except stripe.error.StripeError as e:
            raise HTTPException(502, f"Cancel error: {e}")

    @staticmethod
    async def list_invoices(user: User, limit: int = 10) -> list[dict]:
        """Fetch user's recent invoices."""
        if not user.stripe_customer_id:
            return []

        try:
            invoices = stripe.Invoice.list(
                customer=user.stripe_customer_id,
                limit=limit,
            )
        except stripe.error.StripeError as e:
            logger.warning(f"Invoice fetch failed: {e}")
            return []

        return [
            {
                "id": inv.id,
                "number": inv.number,
                "amount_paid": inv.amount_paid / 100,
                "currency": inv.currency.upper(),
                "status": inv.status,
                "pdf": inv.invoice_pdf,
                "hosted_url": inv.hosted_invoice_url,
                "date": datetime.fromtimestamp(inv.created).isoformat(),
            }
            for inv in invoices.data
        ]


# ─── Webhook Handlers ───────────────────────────────────
async def handle_webhook_event(db: AsyncSession, event: stripe.Event) -> None:
    """Process incoming Stripe webhook event."""
    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Stripe webhook: {event_type}", extra={"event_id": event.get("id")})

    handlers = {
        "checkout.session.completed":       _handle_checkout_completed,
        "customer.subscription.created":    _handle_subscription_change,
        "customer.subscription.updated":    _handle_subscription_change,
        "customer.subscription.deleted":    _handle_subscription_deleted,
        "invoice.paid":                     _handle_invoice_paid,
        "invoice.payment_failed":           _handle_invoice_failed,
    }

    handler = handlers.get(event_type)
    if handler:
        await handler(db, data)
    else:
        logger.debug(f"Unhandled webhook: {event_type}")


async def _get_user_by_customer_id(db: AsyncSession, customer_id: str) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.stripe_customer_id == customer_id)
    )
    return result.scalar_one_or_none()


async def _handle_checkout_completed(db: AsyncSession, session: dict) -> None:
    """User completed Stripe Checkout — provision Pro tier."""
    user_id = session.get("client_reference_id") or session.get("metadata", {}).get("user_id")
    if not user_id:
        logger.warning("Checkout completed without user_id")
        return

    user = await db.get(User, user_id)
    if not user:
        return

    user.tier = UserTier.PRO
    if not user.stripe_customer_id:
        user.stripe_customer_id = session.get("customer")

    logger.info(f"User {user_id} upgraded to PRO via checkout")


async def _handle_subscription_change(db: AsyncSession, sub: dict) -> None:
    """Subscription created/updated — sync state."""
    customer_id = sub.get("customer")
    user = await _get_user_by_customer_id(db, customer_id)
    if not user:
        return

    status = sub.get("status")
    cancel_at_period_end = sub.get("cancel_at_period_end", False)

    # Update or create Subscription record
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    record = result.scalar_one_or_none()

    if not record:
        record = Subscription(user_id=user.id)
        db.add(record)

    record.stripe_subscription_id = sub.get("id")
    record.stripe_price_id = sub.get("items", {}).get("data", [{}])[0].get("price", {}).get("id")
    record.status = status
    record.cancel_at_period_end = cancel_at_period_end
    if sub.get("current_period_end"):
        record.current_period_end = datetime.fromtimestamp(sub["current_period_end"])
    if sub.get("trial_end"):
        record.trial_end = datetime.fromtimestamp(sub["trial_end"])

    # Tier provisioning
    if status in ("active", "trialing"):
        user.tier = UserTier.PRO
    elif status in ("past_due", "unpaid"):
        # Grace period — keep PRO for now
        pass
    else:
        user.tier = UserTier.FREE

    logger.info(f"Subscription {sub['id']} updated to {status} for user {user.id}")


async def _handle_subscription_deleted(db: AsyncSession, sub: dict) -> None:
    """Subscription cancelled — downgrade to free."""
    customer_id = sub.get("customer")
    user = await _get_user_by_customer_id(db, customer_id)
    if not user:
        return

    user.tier = UserTier.FREE

    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    record = result.scalar_one_or_none()
    if record:
        record.status = "cancelled"

    logger.info(f"User {user.id} downgraded to FREE")


async def _handle_invoice_paid(db: AsyncSession, invoice: dict) -> None:
    """Invoice paid — log for audit."""
    customer_id = invoice.get("customer")
    user = await _get_user_by_customer_id(db, customer_id)
    if not user:
        return

    logger.info(
        f"Invoice paid for user {user.id}",
        extra={
            "amount": invoice.get("amount_paid", 0) / 100,
            "currency": invoice.get("currency"),
            "invoice_id": invoice.get("id"),
        },
    )


async def _handle_invoice_failed(db: AsyncSession, invoice: dict) -> None:
    """Payment failed — Stripe will retry, log for monitoring."""
    customer_id = invoice.get("customer")
    user = await _get_user_by_customer_id(db, customer_id)
    if not user:
        return

    logger.warning(
        f"Invoice payment FAILED for user {user.id}",
        extra={"invoice_id": invoice.get("id")},
    )
    # In Phase 6: send email to user via email_service


def verify_webhook(payload: bytes, sig_header: str) -> stripe.Event:
    """Verify Stripe webhook signature."""
    try:
        return stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")
