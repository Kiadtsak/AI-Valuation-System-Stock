"""
Watchlist endpoints: list, add, update, delete, reorder.
All require authentication.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import User
from app.auth.dependencies import get_current_user
from app.models.auth_schemas import (
    WatchlistAdd, WatchlistUpdate, WatchlistItemResponse, WatchlistReorder,
)
from app.services import watchlist_service

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.get("", response_model=list[WatchlistItemResponse])
async def list_watchlist(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await watchlist_service.get_watchlist(db, user.id)


@router.post("", response_model=WatchlistItemResponse, status_code=201)
async def add_to_watchlist(
    payload: WatchlistAdd,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await watchlist_service.add_item(
        db, user, payload.symbol, payload.notes, payload.target_price
    )


@router.patch("/{item_id}", response_model=WatchlistItemResponse)
async def update_watchlist_item(
    item_id: str,
    payload: WatchlistUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await watchlist_service.update_item(
        db, user.id, item_id,
        notes=payload.notes,
        target_price=payload.target_price,
        position=payload.position,
    )


@router.delete("/{item_id}", status_code=204)
async def delete_watchlist_item(
    item_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await watchlist_service.delete_item(db, user.id, item_id)


@router.post("/reorder", response_model=list[WatchlistItemResponse])
async def reorder_watchlist(
    payload: WatchlistReorder,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await watchlist_service.reorder_items(db, user.id, payload.items)
