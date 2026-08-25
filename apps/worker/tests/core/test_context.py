"""Contextvar isolation tests (PY-022)."""

import asyncio

from app.core.context import request_id_ctx, tenant_id_ctx, user_id_ctx


def _snapshot() -> tuple[str, str, str]:
    return (request_id_ctx.get(), user_id_ctx.get(), tenant_id_ctx.get())


async def test_defaults_are_empty() -> None:
    assert _snapshot() == ("", "", "")


async def test_set_and_reset_round_trip() -> None:
    token = request_id_ctx.set("req-1")
    assert request_id_ctx.get() == "req-1"
    request_id_ctx.reset(token)
    assert request_id_ctx.get() == ""


async def test_contextvars_isolated_across_concurrent_coroutines() -> None:
    """Each coroutine sees its own copy; sibling tasks never bleed over."""

    async def worker(name: str) -> str:
        request_id_ctx.set(f"req-{name}")
        await asyncio.sleep(0.01)
        return request_id_ctx.get()

    results = await asyncio.gather(worker("a"), worker("b"), worker("c"))
    assert results == ["req-a", "req-b", "req-c"]
