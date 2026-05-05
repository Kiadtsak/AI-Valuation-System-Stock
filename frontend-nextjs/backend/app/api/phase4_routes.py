"""
Phase 4 routes:
- /api/compare - Side-by-side comparison of 2-4 tickers
- /api/export/* - PDF export for AI reports + comparisons
"""
import asyncio
from io import BytesIO
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import get_db
from app.db.models import User, AIReport
from app.auth.dependencies import get_current_user
from app.services.financials import fetch_financials
from app.services import usage_service
from app.services.pdf_service import build_ai_report_pdf, build_comparison_pdf

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["phase4"])


# ════════════════════════════════════════════════════════
# COMPARISON
# ════════════════════════════════════════════════════════

class CompareRequest(BaseModel):
    symbols: List[str] = Field(..., min_length=2, max_length=4)


@router.post("/compare")
async def compare_tickers(
    payload: CompareRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch financial data for 2-4 tickers in parallel.
    Returns a unified payload for side-by-side display.
    """
    symbols = [s.upper().strip() for s in payload.symbols]

    if len(set(symbols)) != len(symbols):
        raise HTTPException(400, "Duplicate symbols not allowed")

    # Quota: 1 unit per ticker
    cost = len(symbols)
    await usage_service.check_quota(db, user, cost=cost)

    # Fetch in parallel
    async def fetch_one(sym):
        try:
            return sym, await fetch_financials(sym)
        except Exception as e:
            logger.warning(f"Comparison fetch failed for {sym}: {e}")
            return sym, None

    results = await asyncio.gather(*[fetch_one(s) for s in symbols])

    data_by_symbol = {sym: data for sym, data in results if data}

    if len(data_by_symbol) < 2:
        raise HTTPException(404, "Could not fetch enough valid tickers to compare")

    await usage_service.log_usage(db, user.id, "compare", cost_units=cost)

    # Build comparison structure
    return {
        "symbols": symbols,
        "data": data_by_symbol,
        "winner": _determine_winners(data_by_symbol),
    }


def _determine_winners(data_by_symbol: dict) -> dict:
    """For each metric, find which ticker has the best value."""
    winners = {}

    METRICS = {
        "ROE": "higher",
        "ROA": "higher",
        "Net Profit Margin": "higher",
        "Gross Profit Margin": "higher",
        "Free Cash Flow (FCF)": "higher",
        "Altman Z-Score": "higher",
        "Current Ratio": "higher",
        "PE Ratio": "lower",
        "PBV Ratio": "lower",
        "Debt to Equity": "lower",
    }

    for metric, direction in METRICS.items():
        best_sym = None
        best_val = None
        for sym, d in data_by_symbol.items():
            val = (d.get("latest") or {}).get(metric)
            if val is None or not isinstance(val, (int, float)):
                continue
            if best_val is None:
                best_sym, best_val = sym, val
                continue
            if direction == "higher" and val > best_val:
                best_sym, best_val = sym, val
            elif direction == "lower" and val < best_val and val > 0:
                best_sym, best_val = sym, val

        if best_sym:
            winners[metric] = best_sym

    return winners


# ════════════════════════════════════════════════════════
# PDF EXPORT
# ════════════════════════════════════════════════════════

@router.get("/export/report/{report_id}")
async def export_report_pdf(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a saved AI report as PDF."""
    result = await db.execute(
        select(AIReport).where(
            AIReport.id == report_id,
            AIReport.user_id == user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")

    # Get current financials snapshot for additional metrics
    try:
        fin = await fetch_financials(report.symbol)
        latest = fin.get("latest", {})
        valuation = fin.get("valuation", {}) or {}
        company_name = valuation.get("symbol", report.symbol)
    except Exception:
        latest = {}
        valuation = {}
        company_name = report.symbol

    metrics = {
        "price": report.snapshot_price or latest.get("price"),
        "intrinsic_value": report.snapshot_iv or valuation.get("intrinsic_value_per_share"),
        "pe": report.snapshot_pe or latest.get("PE Ratio"),
        "roe": latest.get("ROE"),
        "net_margin": latest.get("Net Profit Margin"),
        "de": latest.get("Debt to Equity"),
        "fcf": latest.get("Free Cash Flow (FCF)"),
        "z_score": latest.get("Altman Z-Score"),
    }

    pdf_bytes = build_ai_report_pdf(
        symbol=report.symbol,
        company_name=company_name,
        analysis_md=report.content,
        metrics=metrics,
        generated_at=report.created_at,
    )

    filename = f"luxe-{report.symbol}-{report.created_at.strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


class ExportComparisonRequest(BaseModel):
    symbols: List[str] = Field(..., min_length=2, max_length=4)


@router.post("/export/comparison")
async def export_comparison_pdf(
    payload: ExportComparisonRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export comparison PDF for 2-4 tickers."""
    symbols = [s.upper().strip() for s in payload.symbols]

    # Quota check
    await usage_service.check_quota(db, user, cost=len(symbols))

    async def fetch_one(sym):
        try:
            return sym, await fetch_financials(sym)
        except Exception:
            return sym, None

    results = await asyncio.gather(*[fetch_one(s) for s in symbols])
    data_by_symbol = {sym: data for sym, data in results if data}

    if len(data_by_symbol) < 2:
        raise HTTPException(404, "Could not fetch enough data")

    await usage_service.log_usage(db, user.id, "compare_export", cost_units=len(symbols))

    pdf_bytes = build_comparison_pdf(
        symbols=symbols,
        data_by_symbol=data_by_symbol,
    )

    filename = f"luxe-comparison-{'-'.join(symbols).lower()}-{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
