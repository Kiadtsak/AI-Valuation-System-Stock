"""
Main analysis endpoints — now with user-aware caching, quota, and history.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import limiter
from app.core.cache import get_redis
from app.core.logging import get_logger
from app.db.session import get_db
from app.db.models import User, AIReport
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.models.schemas import HealthResponse, AIAnalysisRequest
from app.services.financials import fetch_financials
from app.services.ai_analysis import get_ai_analysis
from app.services import usage_service

logger = get_logger(__name__)

router = APIRouter()


# ─── Public ─────────────────────────────────────────────
@router.get("/", tags=["meta"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
    }


@router.get("/health", response_model=HealthResponse, tags=["meta"])
async def health(db: AsyncSession = Depends(get_db)):
    services = {"api": "ok"}

    redis = await get_redis()
    services["redis"] = "ok" if redis else "unavailable"

    try:
        from sqlalchemy import text
        await db.execute(text("SELECT 1"))
        services["database"] = "ok"
    except Exception:
        services["database"] = "error"

    services["fmp"] = "configured" if settings.FMP_API_KEY else "not_configured"
    services["openai"] = "configured" if settings.OPENAI_API_KEY else "not_configured"

    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        services=services,
    )


# ─── Financials (auth required, quota counted) ──────────
@router.get("/api/financials", tags=["financials"])
@limiter.limit(settings.RATELIMIT_FREE)
async def financials_endpoint(
    request: Request,
    symbol: str,
    refresh: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch financial data + ratios. Authenticated, quota-counted."""
    symbol = symbol.upper().strip()
    if not symbol or len(symbol) > 15:
        raise HTTPException(400, "Invalid symbol")

    # Quota check
    await usage_service.check_quota(db, user, cost=usage_service.COST["financials"])

    try:
        data = await fetch_financials(symbol, refresh=refresh)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        logger.exception(f"Financials failed for {symbol}")
        raise HTTPException(502, f"Failed to fetch data: {e}")

    # Log usage AFTER success
    await usage_service.log_usage(db, user.id, "financials", cost_units=1)
    return data


# ─── AI Analysis (auth required, higher cost, saves to history) ──
@router.post("/api/ai-analysis", tags=["ai"])
@limiter.limit("10/minute")
async def ai_analysis_endpoint(
    request: Request,
    payload: AIAnalysisRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI report — saves to user's history."""
    symbol = payload.symbol.upper().strip()

    # Quota check (AI is expensive: 10 units)
    await usage_service.check_quota(db, user, cost=usage_service.COST["ai_analysis"])

    try:
        financials = await fetch_financials(symbol)
    except Exception as e:
        raise HTTPException(404, f"Cannot analyze {symbol}: {e}")

    try:
        result = await get_ai_analysis(symbol, financials)
    except Exception as e:
        logger.exception(f"AI analysis failed for {symbol}")
        raise HTTPException(500, f"AI analysis failed: {e}")

    # Save to history (only if newly generated, not cached)
    if not result.get("cached"):
        latest = financials.get("latest", {})
        valuation = financials.get("valuation", {}) or {}
        report = AIReport(
            user_id=user.id,
            symbol=symbol,
            content=result["analysis"],
            source=result.get("source", "unknown"),
            model=settings.OPENAI_MODEL if result.get("source") == "openai" else "rule-based",
            snapshot_price=latest.get("price"),
            snapshot_iv=valuation.get("intrinsic_value_per_share"),
            snapshot_pe=latest.get("PE Ratio"),
        )
        db.add(report)
        await db.flush()

    await usage_service.log_usage(
        db, user.id, "ai_analysis", cost_units=usage_service.COST["ai_analysis"]
    )

    return result
