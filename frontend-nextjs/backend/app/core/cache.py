"""
Redis-based caching with graceful degradation.
If Redis is unreachable, code continues to work (just slower).
"""
import json
import hashlib
from typing import Any, Callable, Optional, Awaitable
from functools import wraps

import redis.asyncio as redis
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_redis_client: Optional[redis.Redis] = None


async def get_redis() -> Optional[redis.Redis]:
    """Lazy-init Redis client. Returns None if Redis unavailable."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    try:
        client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        await client.ping()
        _redis_client = client
        logger.info("Redis connected", extra={"url": settings.REDIS_URL.split("@")[-1]})
        return client
    except Exception as e:
        logger.warning(f"Redis unavailable, caching disabled: {e}")
        return None


async def close_redis() -> None:
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


def _make_key(prefix: str, *args: Any, **kwargs: Any) -> str:
    """Stable cache key from arbitrary args."""
    raw = json.dumps([args, sorted(kwargs.items())], sort_keys=True, default=str)
    digest = hashlib.md5(raw.encode()).hexdigest()[:16]
    return f"luxe:{prefix}:{digest}"


async def cache_get(key: str) -> Optional[Any]:
    r = await get_redis()
    if not r:
        return None
    try:
        raw = await r.get(key)
        return json.loads(raw) if raw else None
    except Exception as e:
        logger.warning(f"Cache get failed: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int | None = None) -> bool:
    r = await get_redis()
    if not r:
        return False
    try:
        await r.setex(
            key,
            ttl or settings.CACHE_TTL_SECONDS,
            json.dumps(value, default=str),
        )
        return True
    except Exception as e:
        logger.warning(f"Cache set failed: {e}")
        return False


async def cache_delete(pattern: str) -> int:
    """Delete keys matching pattern. Use sparingly."""
    r = await get_redis()
    if not r:
        return 0
    try:
        keys = []
        async for k in r.scan_iter(match=pattern):
            keys.append(k)
        if keys:
            return await r.delete(*keys)
        return 0
    except Exception as e:
        logger.warning(f"Cache delete failed: {e}")
        return 0


def cached(prefix: str, ttl: int | None = None):
    """
    Decorator to cache async function results.
    Usage:
        @cached("financials", ttl=86400)
        async def fetch(symbol: str): ...
    """
    def decorator(fn: Callable[..., Awaitable[Any]]):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            # Skip 'self' in instance methods
            cache_args = args[1:] if args and not isinstance(args[0], (str, int, float, dict, list)) else args
            key = _make_key(prefix, *cache_args, **kwargs)

            hit = await cache_get(key)
            if hit is not None:
                logger.debug(f"Cache HIT: {key}")
                return hit

            result = await fn(*args, **kwargs)
            await cache_set(key, result, ttl)
            logger.debug(f"Cache MISS: {key}")
            return result
        return wrapper
    return decorator
