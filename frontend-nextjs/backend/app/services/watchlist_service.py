"""
Watchlist CRUD operations.
"""
from typing import Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.models import WatchlistItem, User, UserTier
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# Tier limits for watchlist size
WATCHLIST_LIMITS = {
    UserTier.FREE: 10,
    UserTier.PRO: 50,
    UserTier.ENTERPRISE: 500,
}


async def get_watchlist(db: AsyncSession, user_id: str) -> list[WatchlistItem]:
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.user_id == user_id)
        .order_by(WatchlistItem.position, WatchlistItem.created_at)
    )
    return list(result.scalars().all())


async def get_item(
    db: AsyncSession, user_id: str, item_id: str
) -> Optional[WatchlistItem]:
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id,
            WatchlistItem.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def add_item(
    db: AsyncSession,
    user: User,
    symbol: str,
    notes: Optional[str] = None,
    target_price: Optional[float] = None,
) -> WatchlistItem:
    symbol = symbol.upper().strip()

    # Check tier limit
    count_result = await db.execute(
        select(func.count(WatchlistItem.id)).where(WatchlistItem.user_id == user.id)
    )
    count = count_result.scalar() or 0
    limit = WATCHLIST_LIMITS.get(user.tier, 10)
    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Watchlist limit reached ({limit} items for {user.tier.value} tier)",
        )

    # Check duplicate
    existing = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.user_id == user.id,
            WatchlistItem.symbol == symbol,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{symbol} already in watchlist",
        )

    item = WatchlistItem(
        user_id=user.id,
        symbol=symbol,
        notes=notes,
        target_price=target_price,
        position=count,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    logger.info(f"Watchlist add: {symbol}", extra={"user_id": user.id})
    return item


async def update_item(
    db: AsyncSession,
    user_id: str,
    item_id: str,
    **fields,
) -> WatchlistItem:
    item = await get_item(db, user_id, item_id)
    if not item:
        raise HTTPException(404, "Watchlist item not found")

    for k, v in fields.items():
        if v is not None and hasattr(item, k):
            setattr(item, k, v)

    await db.flush()
    await db.refresh(item)
    return item


async def delete_item(db: AsyncSession, user_id: str, item_id: str) -> None:
    item = await get_item(db, user_id, item_id)
    if not item:
        raise HTTPException(404, "Watchlist item not found")
    await db.delete(item)


async def reorder_items(
    db: AsyncSession,
    user_id: str,
    items: list[dict],
) -> list[WatchlistItem]:
    """Bulk update positions. items = [{"id": "...", "position": 0}, ...]"""
    item_map = {i["id"]: i["position"] for i in items if "id" in i and "position" in i}

    if not item_map:
        return await get_watchlist(db, user_id)

    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.user_id == user_id,
            WatchlistItem.id.in_(item_map.keys()),
        )
    )
    items_db = list(result.scalars().all())

    for item in items_db:
        item.position = item_map[item.id]

    await db.flush()
    return await get_watchlist(db, user_id)
