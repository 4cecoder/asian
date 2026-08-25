"""Structlog pipeline (PY-021, PY-025, PY-022 slice).

Processor chain per t03-structured-logging:

    merge_contextvars -> add_log_level -> TimeStamper(iso) ->
    StackInfoRenderer -> format_exc_info -> redact_sensitive_data ->
    add_request_context -> JSONRenderer (prod) / ConsoleRenderer (dev)

`redact_sensitive_data` masks PII/secret keys recursively (PY-025).
`add_request_context` binds `request_id` / `user_id` / `tenant_id` from
the app-level contextvars in `app.core.context` (PY-022) into every
event, so log lines correlate back to a single HTTP request.
"""

import logging

import structlog
from structlog.contextvars import merge_contextvars
from structlog.processors import (
    StackInfoRenderer,
    TimeStamper,
    add_log_level,
    format_exc_info,
)
from structlog.typing import EventDict, Processor

from app.core.context import request_id_ctx, tenant_id_ctx, user_id_ctx

#: Keys whose values are never allowed into logs, case-insensitively.
SENSITIVE_KEYS = frozenset(
    {
        "password",
        "token",
        "authorization",
        "api_key",
        "secret",
        "access_token",
    }
)

REDACTED = "[REDACTED]"


def _redact_value(value: object) -> object:
    """Recurse into containers; leaf values pass through untouched."""
    if isinstance(value, dict):
        return {key: _redact_entry(key, item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        redacted = [_redact_value(item) for item in value]
        return type(value)(redacted) if isinstance(value, tuple) else redacted
    return value


def _redact_entry(key: object, value: object) -> object:
    if isinstance(key, str) and key.lower() in SENSITIVE_KEYS:
        return REDACTED
    return _redact_value(value)


def redact_sensitive_data(
    logger: object,
    method_name: str,
    event_dict: EventDict,
) -> EventDict:
    """Mask sensitive keys in the event dict, recursively (PY-025)."""
    return {
        key: (
            REDACTED
            if isinstance(key, str) and key.lower() in SENSITIVE_KEYS
            else _redact_value(value)
        )
        for key, value in event_dict.items()
    }


def add_request_context(
    logger: object,
    method_name: str,
    event_dict: EventDict,
) -> EventDict:
    """Attach request-scoped identity from `app.core.context` (PY-022).

    Empty contextvars are omitted so background jobs that run outside a
    request don't emit noise fields.
    """
    for key, ctx in (
        ("request_id", request_id_ctx),
        ("user_id", user_id_ctx),
        ("tenant_id", tenant_id_ctx),
    ):
        value = ctx.get()
        if value:
            event_dict[key] = value
    return event_dict


def setup_logging(*, environment: str, debug: bool = False) -> None:
    """Configure structlog once per process.

    Production renders strict JSON; every other environment renders with
    the pretty console renderer for human eyes.
    """
    renderer: Processor = (
        structlog.processors.JSONRenderer()
        if environment == "production"
        else structlog.dev.ConsoleRenderer()
    )
    level = logging.DEBUG if debug else logging.INFO

    structlog.configure(
        processors=[
            merge_contextvars,
            add_log_level,
            TimeStamper(fmt="iso", utc=True),
            StackInfoRenderer(),
            format_exc_info,
            redact_sensitive_data,
            add_request_context,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=False,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a configured structlog logger."""
    return structlog.stdlib.get_logger(name)
