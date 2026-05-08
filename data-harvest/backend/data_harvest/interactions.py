"""
Interaction logger — captures every meaningful user action.

Used for:
1. RAG context (recall what user looked at recently)
2. Personalization (suggest similar tickers)
3. Funnel analysis (where users drop off)
4. Training conversational agents

Storage: SQLite (lightweight, queryable, single file)
Location: data_lake/interactions/interactions.db
"""
import asyncio
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any

from app.core.logging import get_logger
from .harvester import HarvestConfig

logger = get_logger(__name__)


class InteractionLogger:
    """
    Logs user interactions to a local SQLite DB.
    Thread-safe; uses a single connection per write (cheap).
    """

    _initialized = False
    _lock = asyncio.Lock()

    @classmethod
    def _db_path(cls) -> Path:
        HarvestConfig.ensure_dirs()
        return HarvestConfig.INTERACTIONS / "interactions.db"

    @classmethod
    def _init_schema(cls) -> None:
        """Create tables if not exists. Called once on first use."""
        if cls._initialized:
            return

        with sqlite3.connect(str(cls._db_path())) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_id TEXT,
                    session_id TEXT,
                    event_type TEXT NOT NULL,
                    symbol TEXT,
                    details_json TEXT,
                    response_time_ms INTEGER
                );

                CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
                CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
                CREATE INDEX IF NOT EXISTS idx_events_symbol ON events(symbol);
                CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

                CREATE TABLE IF NOT EXISTS queries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_id TEXT,
                    query_text TEXT NOT NULL,
                    response_text TEXT,
                    rating INTEGER,
                    symbols_referenced TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_queries_user ON queries(user_id);
                CREATE INDEX IF NOT EXISTS idx_queries_timestamp ON queries(timestamp);
            """)
            conn.commit()
        cls._initialized = True

    @classmethod
    async def log_event(
        cls,
        event_type: str,                   # "view_dashboard", "add_watchlist", "ai_report", "compare", etc.
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        symbol: Optional[str] = None,
        details: Optional[dict] = None,
        response_time_ms: Optional[int] = None,
    ) -> None:
        """Log a generic user event."""
        cls._init_schema()
        import json as _json

        async with cls._lock:
            try:
                with sqlite3.connect(str(cls._db_path())) as conn:
                    conn.execute(
                        """INSERT INTO events
                           (timestamp, user_id, session_id, event_type, symbol, details_json, response_time_ms)
                           VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (
                            datetime.now(timezone.utc).isoformat(),
                            user_id, session_id, event_type, symbol,
                            _json.dumps(details) if details else None,
                            response_time_ms,
                        ),
                    )
                    conn.commit()
            except Exception as e:
                logger.warning(f"Interaction log failed: {e}")

    @classmethod
    async def log_query(
        cls,
        query_text: str,
        response_text: Optional[str] = None,
        user_id: Optional[str] = None,
        symbols_referenced: Optional[list[str]] = None,
    ) -> int:
        """Log an AI query + response. Returns query ID."""
        cls._init_schema()

        async with cls._lock:
            try:
                with sqlite3.connect(str(cls._db_path())) as conn:
                    cursor = conn.execute(
                        """INSERT INTO queries
                           (timestamp, user_id, query_text, response_text, symbols_referenced)
                           VALUES (?, ?, ?, ?, ?)""",
                        (
                            datetime.now(timezone.utc).isoformat(),
                            user_id, query_text, response_text,
                            ",".join(symbols_referenced) if symbols_referenced else None,
                        ),
                    )
                    conn.commit()
                    return cursor.lastrowid or 0
            except Exception as e:
                logger.warning(f"Query log failed: {e}")
                return 0

    @classmethod
    async def rate_query(cls, query_id: int, rating: int) -> None:
        """User feedback (👍/👎) on AI response. Crucial for RLHF."""
        cls._init_schema()
        async with cls._lock:
            try:
                with sqlite3.connect(str(cls._db_path())) as conn:
                    conn.execute(
                        "UPDATE queries SET rating = ? WHERE id = ?",
                        (rating, query_id),
                    )
                    conn.commit()
            except Exception as e:
                logger.warning(f"Rate query failed: {e}")

    @classmethod
    def get_user_recent_symbols(cls, user_id: str, limit: int = 10) -> list[str]:
        """Return recently viewed symbols by this user (for personalization)."""
        cls._init_schema()
        try:
            with sqlite3.connect(str(cls._db_path())) as conn:
                rows = conn.execute(
                    """SELECT DISTINCT symbol FROM events
                       WHERE user_id = ? AND symbol IS NOT NULL
                       ORDER BY timestamp DESC LIMIT ?""",
                    (user_id, limit),
                ).fetchall()
                return [r[0] for r in rows]
        except Exception:
            return []
