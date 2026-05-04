"""
Production observability: Sentry error tracking + Prometheus metrics.

Add to app/core/observability.py and import in main.py lifespan.
"""
from typing import Optional
import os

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def init_sentry() -> bool:
    """Initialize Sentry if SENTRY_DSN is configured. Returns True if active."""
    dsn = getattr(settings, "SENTRY_DSN", "") or os.environ.get("SENTRY_DSN", "")
    if not dsn:
        logger.info("Sentry disabled (no DSN configured)")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.redis import RedisIntegration
    except ImportError:
        logger.warning("sentry-sdk not installed; pip install sentry-sdk[fastapi]")
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.ENV,
        release=f"luxe-capital@{settings.VERSION}",
        traces_sample_rate=0.1 if settings.is_production else 1.0,
        profiles_sample_rate=0.1 if settings.is_production else 0.0,
        send_default_pii=False,  # don't send user PII
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(),
            SqlalchemyIntegration(),
            RedisIntegration(),
        ],
        # Filter out noisy errors
        before_send=_filter_sentry_event,
    )

    logger.info(f"Sentry initialized: env={settings.ENV}")
    return True


def _filter_sentry_event(event: dict, hint: dict) -> Optional[dict]:
    """Filter out noisy/expected errors from Sentry."""
    # Don't report 401/404 (these are normal user errors)
    if "exception" in event:
        for exc in event["exception"].get("values", []):
            exc_type = exc.get("type", "")
            if exc_type in ("HTTPException",):
                # Check status code in exc value
                value = exc.get("value", "")
                if "401" in value or "404" in value or "422" in value:
                    return None
    return event


def capture_user_context(user_id: str, email: str, tier: str) -> None:
    """Set user context for current request (for error reports)."""
    try:
        import sentry_sdk
        sentry_sdk.set_user({
            "id": user_id,
            "email": email,  # Sentry hashes by default
            "tier": tier,
        })
    except ImportError:
        pass
