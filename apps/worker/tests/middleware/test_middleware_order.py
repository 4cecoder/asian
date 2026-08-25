"""Middleware stack ordering tests (PY-031 slice).

Spec request-path order: correlation -> security headers -> CORS.
Starlette's add_middleware prepends, so `app.user_middleware[0]` is the
OUTERMOST middleware on the request path.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from app.main import create_app
from app.middleware.correlation import CorrelationIdMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.settings import AppSettings, SecuritySettings
from asgi_lifespan import LifespanManager
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import AnyHttpUrl
import pytest

ALLOWED = "https://app.example.com"


def _settings() -> AppSettings:
    return AppSettings(security=SecuritySettings(cors_origins=[AnyHttpUrl(ALLOWED)]))


@asynccontextmanager
async def _client(settings: AppSettings) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app(settings)
    async with LifespanManager(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as http:
            yield http


def test_registered_stack_order_matches_py031() -> None:
    """Outermost-first in user_middleware must be correlation, headers, CORS."""
    app = create_app()
    classes = [mw.cls for mw in app.user_middleware]
    assert classes == [CorrelationIdMiddleware, SecurityHeadersMiddleware, CORSMiddleware]


async def test_correlation_is_outermost_preflight_still_echoes_request_id() -> None:
    """Even a CORS preflight response passes through correlation + headers."""
    async with _client(_settings()) as http:
        response = await http.options(
            "/healthz",
            headers={
                "Origin": ALLOWED,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        # Outermost correlation middleware saw the preflight...
        assert "X-Request-ID" in response.headers
        # ...and the security-headers middleware ran inside it too.
        assert response.headers["X-Frame-Options"] == "DENY"


async def test_allowed_origin_gets_cors_headers_without_trailing_slash_artifacts() -> None:
    async with _client(_settings()) as http:
        response = await http.get("/healthz", headers={"Origin": ALLOWED})
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == ALLOWED


async def test_disallowed_origin_gets_no_cors_headers() -> None:
    async with _client(_settings()) as http:
        response = await http.get(
            "/healthz",
            headers={"Origin": "https://evil.example.net"},
        )
        assert "access-control-allow-origin" not in response.headers
        # The route still serves; CORS rejection happens at the browser.
        assert response.json()["status"] == "ok"


def test_cors_config_uses_settings_values(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SECURITY__CORS_ORIGINS", '["https://cfg.example.com"]')
    try:
        app = create_app(AppSettings())
        cors_mw = next(mw for mw in app.user_middleware if mw.cls is CORSMiddleware)
        assert str(cors_mw.kwargs["allow_origins"][0]).rstrip("/") == ("https://cfg.example.com")
        assert cors_mw.kwargs["allow_methods"] == [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ]
        assert cors_mw.kwargs["max_age"] == 86400
        assert cors_mw.kwargs["allow_credentials"] is True
    finally:
        monkeypatch.undo()
