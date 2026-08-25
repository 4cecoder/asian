"""Application lifespan (PY-011..PY-016 minimal slice).

Opens and closes the shared connection pools around request serving.
Sibling domain t03-lifespan-connections extends this with cache
pre-warm, WebSocket drain, background-task tracking, and signal-driven
drain windows.
"""

import asyncio
from collections.abc import AsyncIterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
import httpx

from app.core.logging import get_logger
from app.services.health import RedisDependencyChecker
from app.settings import get_settings

logger = get_logger(__name__)


def _thread_pool_max_workers() -> int:
    return min(32, (os.cpu_count() or 1) + 4)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start every shared resource before traffic, release it after."""
    settings = get_settings()
    logger.info("startup.begin", environment=settings.environment)

    # State flags consumed by the probes.
    app.state.is_shutting_down = False
    app.state.is_warmed_up = False
    dependency_checkers: list[object] = []

    # PY-012: shared outbound HTTP pool.
    app.state.http_client = httpx.AsyncClient(
        limits=httpx.Limits(
            max_keepalive_connections=50,
            max_connections=200,
            keepalive_expiry=30.0,
        ),
        timeout=httpx.Timeout(15.0, connect=5.0),
    )

    # PY-014: CPU-bound work runs off the event loop.
    app.state.thread_pool = ThreadPoolExecutor(
        max_workers=_thread_pool_max_workers(),
        thread_name_prefix="worker-cpu",
    )

    # PY-013: Redis pool. Disabled by default so the scaffold runs green
    # without external services; flip REDIS_ENABLED to turn it on.
    app.state.redis = None
    if settings.redis_enabled:
        import redis.asyncio as aioredis

        pool = aioredis.ConnectionPool.from_url(
            settings.redis_url,
            max_connections=50,
            decode_responses=True,
        )
        redis_client = aioredis.Redis(connection_pool=pool)
        try:
            await asyncio.wait_for(redis_client.ping(), timeout=2.0)
            dependency_checkers.append(RedisDependencyChecker(redis_client))
            app.state.redis = redis_client
            logger.info("startup.redis_connected", url=settings.redis_url)
        except Exception as exc:  # noqa: BLE001 - log informatively, keep serving
            logger.warning(
                "startup.redis_unavailable",
                reason=type(exc).__name__,
                detail=str(exc),
            )
            await redis_client.aclose()
            await pool.disconnect()

    app.state.dependency_checkers = dependency_checkers
    # PY-015's cache pre-warm slot: warmup_cache(app) plugs in here, and
    # is_warmed_up stays False until it finishes.
    app.state.is_warmed_up = True
    logger.info("startup.complete")

    try:
        yield
    finally:
        logger.info("shutdown.begin")
        app.state.is_shutting_down = True
        http_client: httpx.AsyncClient = app.state.http_client
        await http_client.aclose()
        thread_pool: ThreadPoolExecutor = app.state.thread_pool
        thread_pool.shutdown(wait=True, cancel_futures=True)
        if app.state.redis is not None:
            await app.state.redis.aclose()
        logger.info("shutdown.complete")
