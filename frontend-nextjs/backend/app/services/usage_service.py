"""
Track usage per user for tier enforcement.
- Records every API call with cost units
- Counts daily usage to enforce quotas
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.models import UsageLog, User, UserTier
from app.core.config import settings


TIER_DAILY_QUOTA = {
    UserTier.FREE: settings.TIER_FREE_DAILY_REQUESTS,
    UserTier.PRO: settings.TIER_PRO_DAILY_REQUESTS,
    UserTier.ENTERPRISE: 100_000,  # effectively unlimited
}

# Cost per endpoint type
COST = {
    "financials": 1,
    "ai_analysis": 10,    # AI calls cost more
    "valuation": 1,
    "watchlist": 0,       # free
}


async def log_usage(
    db: AsyncSession,
    user_id: str,
    endpoint: str,
    cost_units: int = 1,
) -> None:
    log = UsageLog(user_id=user_id, endpoint=endpoint, cost_units=cost_units)
    db.add(log)
    await db.flush()


async def get_used_today(db: AsyncSession, user_id: str) -> int:
    midnight = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.coalesce(func.sum(UsageLog.cost_units), 0)).where(
            UsageLog.user_id == user_id,
            UsageLog.created_at >= midnight,
        )
    )
    return int(result.scalar() or 0)


async def check_quota(db: AsyncSession, user: User, cost: int = 1) -> dict:
    """
    Returns quota info; raises 429 if exceeded.
    """
    quota = TIER_DAILY_QUOTA.get(user.tier, settings.TIER_FREE_DAILY_REQUESTS)
    used = await get_used_today(db, user.id)

    if used + cost > quota:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "daily_quota_exceeded",
                "used": used,
                "quota": quota,
                "tier": user.tier.value,
                "upgrade_to": "pro" if user.tier == UserTier.FREE else None,
            },
        )

    return {
        "tier": user.tier.value,
        "daily_quota": quota,
        "used_today": used,
        "remaining": quota - used,
    }
