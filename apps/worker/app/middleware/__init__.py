"""Middleware registration (PY-031 slice).

Spec request-path order: correlation -> security headers -> CORS.
Starlette's ``add_middleware`` PREPENDS to the stack (the last-added
middleware ends up outermost), so registration below is deliberately
reverse order: CORS first, security headers second, correlation last
=> correlation is outermost, matching PY-031.

Rate limiting, size limits, compression, access log, and metrics land
with the rest of t03-middleware-suite; `setup_middleware` stays their
single registration point.
"""

from typing import Any

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.middleware.correlation import CorrelationIdMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.settings import AppSettings


def _normalized_origins(settings: AppSettings) -> list[str]:
    """CORS origins without a trailing slash.

    `AnyHttpUrl` serializes with a root path ("https://x.example.com/"),
    which never matches the path-less `Origin` header browsers send.
    """
    return [str(origin).rstrip("/") for origin in settings.security.cors_origins]


def setup_middleware(app: FastAPI, settings: AppSettings) -> None:
    """Register the middleware stack on the application."""
    # Added first => innermost (see module docstring).
    cors_kwargs: dict[str, Any] = {
        "allow_origins": _normalized_origins(settings),
        "allow_credentials": settings.security.cors_allow_credentials,
        "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["*"],
        "max_age": 86400,
    }
    app.add_middleware(CORSMiddleware, **cors_kwargs)
    app.add_middleware(SecurityHeadersMiddleware)
    # Added last => outermost, matching PY-031's correlation-first order.
    app.add_middleware(CorrelationIdMiddleware)
