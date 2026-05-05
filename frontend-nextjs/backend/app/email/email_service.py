"""
Email service via Resend.com (modern, developer-friendly).
Falls back to log-only mode if RESEND_API_KEY not set.

Templates included:
- welcome (after signup)
- verify (email verification)
- reset_password
- subscription_confirmed
- payment_failed
- ai_report_ready (for async reports)
"""
from __future__ import annotations
from typing import Optional
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import User, EmailLog, VerificationToken

logger = get_logger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


# ─── Templates ──────────────────────────────────────────
def _branded_html(title: str, preheader: str, body_html: str, cta: Optional[dict] = None) -> str:
    """Wrap content in our branded email layout."""
    cta_html = ""
    if cta:
        cta_html = f"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
          <tr><td>
            <a href="{cta['url']}" style="
              display: inline-block;
              padding: 14px 32px;
              background: linear-gradient(135deg, #d4a574 0%, #f4e0ad 50%, #b8863f 100%);
              color: #08080a;
              text-decoration: none;
              font-weight: 700;
              font-size: 12px;
              letter-spacing: 0.2em;
              text-transform: uppercase;
              border-radius: 9999px;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            ">{cta['text']}</a>
          </td></tr>
        </table>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <span style="display:none; max-height:0; overflow:hidden;">{preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px; border-bottom:1px solid #e4e4e7;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="
                    width:32px; height:32px;
                    background:linear-gradient(135deg, #d4a574 0%, #b8863f 100%);
                    border-radius:6px;
                    color:#08080a;
                    font-family:Georgia,serif;
                    font-weight:bold;
                    font-size:18px;
                    text-align:center;
                    line-height:32px;
                  ">L</td>
                  <td style="padding-left:12px;">
                    <div style="font-family:Georgia,serif; font-size:14px; color:#08080a; letter-spacing:0.05em;">
                      LUXE CAPITAL
                    </div>
                    <div style="font-family:'SF Mono',Menlo,monospace; font-size:9px; color:#71717a; letter-spacing:0.3em; text-transform:uppercase;">
                      Stock Intelligence
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 48px 40px; color:#1a1a1d; font-size:16px; line-height:1.6;">
              {body_html}
              {cta_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background:#fafafa; border-top:1px solid #e4e4e7;">
              <p style="margin:0; font-family:'SF Mono',Menlo,monospace; font-size:11px; color:#a1a1aa; letter-spacing:0.1em; text-transform:uppercase;">
                Luxe Capital · Stock Intelligence
              </p>
              <p style="margin:8px 0 0 0; font-size:11px; color:#a1a1aa;">
                This is a transactional email. You're receiving it because you have an account at Luxe Capital.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


TEMPLATES = {
    "welcome": lambda ctx: {
        "subject": "Welcome to Luxe Capital",
        "html": _branded_html(
            title="Welcome",
            preheader="Your account is ready. Begin your equity research journey.",
            body_html=f"""
                <h1 style="font-family:Georgia,serif; font-weight:300; font-size:32px; margin:0 0 16px 0; letter-spacing:-0.02em;">
                  Welcome, <em style="color:#b8863f;">{ctx.get('name', 'analyst')}</em>.
                </h1>
                <p>Your Luxe Capital account is ready. You now have access to institutional-grade financial analysis tools — DCF valuation, AI-powered research, and a curated watchlist.</p>
                <p>Start by exploring any ticker. Type "AAPL" or "NVDA" — the rest unfolds.</p>
            """,
            cta={"text": "Open Dashboard", "url": ctx.get("app_url", "https://app.luxe.com")},
        ),
    },

    "verify": lambda ctx: {
        "subject": "Verify your email · Luxe Capital",
        "html": _branded_html(
            title="Verify Email",
            preheader="One click to confirm your email address.",
            body_html=f"""
                <h1 style="font-family:Georgia,serif; font-weight:300; font-size:28px; margin:0 0 16px 0;">
                  Confirm your <em style="color:#b8863f;">email</em>
                </h1>
                <p>Click the button below to verify <strong>{ctx['email']}</strong>. The link expires in 24 hours.</p>
            """,
            cta={"text": "Verify Email", "url": ctx["verify_url"]},
        ),
    },

    "reset_password": lambda ctx: {
        "subject": "Reset your password · Luxe Capital",
        "html": _branded_html(
            title="Reset Password",
            preheader="Reset link inside.",
            body_html=f"""
                <h1 style="font-family:Georgia,serif; font-weight:300; font-size:28px; margin:0 0 16px 0;">
                  Reset your <em style="color:#b8863f;">password</em>
                </h1>
                <p>We received a request to reset your password. Click below to set a new one. The link expires in 1 hour.</p>
                <p style="color:#71717a; font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
            """,
            cta={"text": "Reset Password", "url": ctx["reset_url"]},
        ),
    },

    "subscription_confirmed": lambda ctx: {
        "subject": "Welcome to Pro · Luxe Capital",
        "html": _branded_html(
            title="Pro Activated",
            preheader="Your Pro plan is now active.",
            body_html=f"""
                <h1 style="font-family:Georgia,serif; font-weight:300; font-size:32px; margin:0 0 16px 0;">
                  Welcome to <em style="color:#b8863f;">Pro</em>.
                </h1>
                <p>Your Pro plan is now active. You've unlocked:</p>
                <ul style="padding-left:20px;">
                  <li>1,000 daily request units</li>
                  <li>Up to 50 watchlist tickers</li>
                  <li>100 AI reports per day</li>
                  <li>Priority data refresh</li>
                </ul>
                <p>Receipts will arrive in your inbox automatically.</p>
            """,
            cta={"text": "Continue Research", "url": ctx.get("app_url", "https://app.luxe.com")},
        ),
    },

    "payment_failed": lambda ctx: {
        "subject": "Action required: payment failed · Luxe Capital",
        "html": _branded_html(
            title="Payment Failed",
            preheader="Update your payment method to keep Pro access.",
            body_html=f"""
                <h1 style="font-family:Georgia,serif; font-weight:300; font-size:28px; margin:0 0 16px 0;">
                  Payment <em style="color:#b91c47;">unsuccessful</em>
                </h1>
                <p>We couldn't charge your card for the latest Luxe Capital Pro renewal. To avoid losing Pro access, please update your payment method below.</p>
                <p style="color:#71717a; font-size:14px;">Stripe will retry automatically over the next few days.</p>
            """,
            cta={"text": "Update Payment", "url": ctx.get("billing_url", "https://app.luxe.com/account/upgrade")},
        ),
    },
}


# ─── Send function ─────────────────────────────────────
async def send_email(
    db: Optional[AsyncSession],
    to_email: str,
    template: str,
    context: dict,
    user_id: Optional[str] = None,
) -> bool:
    """
    Send a transactional email.
    Returns True on success. Logs to DB if db provided.
    """
    if template not in TEMPLATES:
        logger.error(f"Unknown email template: {template}")
        return False

    rendered = TEMPLATES[template](context)

    log: Optional[EmailLog] = None
    if db is not None:
        log = EmailLog(
            user_id=user_id,
            to_email=to_email,
            template=template,
            status="queued",
        )
        db.add(log)
        await db.flush()

    if not settings.RESEND_API_KEY:
        logger.warning(
            f"[email-stub] Would send '{template}' to {to_email}",
            extra={"subject": rendered["subject"]},
        )
        if log:
            log.status = "stub"
        return True

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.EMAIL_FROM,
                    "to": [to_email],
                    "subject": rendered["subject"],
                    "html": rendered["html"],
                },
            )
        if r.status_code >= 400:
            error_text = r.text[:300]
            logger.error(f"Resend failed {r.status_code}: {error_text}")
            if log:
                log.status = "failed"
                log.error = error_text
            return False

        data = r.json()
        if log:
            log.status = "sent"
            log.provider_id = data.get("id")
            log.sent_at = datetime.now(timezone.utc)
        logger.info(f"Email sent: {template} → {to_email}")
        return True

    except Exception as e:
        logger.exception("Email send exception")
        if log:
            log.status = "error"
            log.error = str(e)[:500]
        return False


# ─── Verification & reset tokens ───────────────────────
async def create_verification_token(
    db: AsyncSession, user: User, purpose: str = "verify",
    hours_valid: int = 24,
) -> str:
    """Create a one-time token. Returns the raw token string."""
    raw = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=hours_valid)

    record = VerificationToken(
        user_id=user.id,
        token=raw,
        purpose=purpose,
        expires_at=expires,
    )
    db.add(record)
    await db.flush()
    return raw


async def consume_verification_token(
    db: AsyncSession, token: str, purpose: str
) -> Optional[User]:
    """Validate and consume a token. Returns User if valid."""
    from sqlalchemy import select
    result = await db.execute(
        select(VerificationToken).where(
            VerificationToken.token == token,
            VerificationToken.purpose == purpose,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return None
    if record.used_at:
        return None
    if record.expires_at < datetime.now(timezone.utc):
        return None

    user = await db.get(User, record.user_id)
    if not user:
        return None

    record.used_at = datetime.now(timezone.utc)
    return user
