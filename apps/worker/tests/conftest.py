"""Shared pytest fixtures (PY-097 slice)."""

from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from app.main import create_app
from app.settings import AppSettings
from asgi_lifespan import LifespanManager
import httpx
import pytest
from starlette.applications import Starlette


async def _run_client(
    app: Starlette,
    raise_app_exceptions: bool,
) -> AsyncIterator[httpx.AsyncClient]:
    manager = LifespanManager(app)  # type: ignore[arg-type]
    async with manager:
        transport = httpx.ASGITransport(
            app=app,
            raise_app_exceptions=raise_app_exceptions,
        )
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as http:
            http.state = app.state  # type: ignore[attr-defined]
            yield http


@pytest.fixture
async def client() -> AsyncIterator[httpx.AsyncClient]:
    """HTTPX async client running the default app through its lifespan."""
    app = create_app()
    async for http in _run_client(app, raise_app_exceptions=True):
        yield http


ClientFactory = Callable[..., AsyncIterator[httpx.AsyncClient]]


@pytest.fixture
def make_client() -> ClientFactory:
    """Build a bespoke app (extra routes / settings / transport mode).

    Returns an async context-manager factory:

        async with make_client(routes_fn, settings=settings) as http: ...

    ``routes_fn(app)`` registers test-only routes before startup.
    ``raise_app_exceptions=False`` lets ServerErrorMiddleware's 500
    response reach the client instead of bubbling into the test.
    """

    @asynccontextmanager
    async def _factory(
        configure: Callable[[object], None] | None = None,
        *,
        settings: AppSettings | None = None,
        raise_app_exceptions: bool = True,
    ) -> AsyncIterator[httpx.AsyncClient]:
        app = create_app(settings)
        if configure is not None:
            configure(app)
        async for http in _run_client(app, raise_app_exceptions):
            yield http

    return _factory  # type: ignore[return-value]
