"""
AI report history endpoints.
Lets users see their past AI-generated reports.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.session import get_db
from app.db.models import User, AIReport
from app.auth.dependencies import get_current_user
from app.models.auth_schemas import AIReportSummary, AIReportFull

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("", response_model=list[AIReportSummary])
async def list_my_reports(
    symbol: Optional[str] = Query(None, max_length=15),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List my AI reports, optionally filtered by symbol."""
    query = select(AIReport).where(AIReport.user_id == user.id)
    if symbol:
        query = query.where(AIReport.symbol == symbol.upper())
    query = query.order_by(desc(AIReport.created_at)).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{report_id}", response_model=AIReportFull)
async def get_report(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIReport).where(
            AIReport.id == report_id,
            AIReport.user_id == user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@router.delete("/{report_id}", status_code=204)
async def delete_report(
    report_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIReport).where(
            AIReport.id == report_id,
            AIReport.user_id == user.id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    await db.delete(report)
