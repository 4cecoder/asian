"""Structlog pipeline tests (PY-021, PY-022 slice).

Acceptance per t03-structured-logging: `logger.info("event_name",
key="val")` produces structured JSON with ISO timestamps in production,
and request-scoped contextvars bind into every emitted line.
"""

import json

from app.core.context import request_id_ctx
from app.core.logging import get_logger, setup_logging
import pytest


def _capture(capsys: pytest.CaptureFixture[str]) -> str:
    captured = capsys.readouterr()
    return (captured.out + captured.err).strip()


def test_structlog_json_output_in_production(
    capsys: pytest.CaptureFixture[str],
) -> None:
    """PY-021: prod renders strict JSON with an ISO-8601 UTC timestamp."""
    setup_logging(environment="production")
    logger = get_logger(__name__)
    logger.info("event_name", key="val")

    raw = _capture(capsys)
    assert raw, "expected a log line on stdout"
    parsed = json.loads(raw.splitlines()[-1])
    assert parsed["event"] == "event_name"
    assert parsed["key"] == "val"
    assert parsed["level"] == "info"
    # ISO timestamp, UTC-marked (structlog renders UTC as trailing "Z").
    assert parsed["timestamp"].endswith("+00:00") or parsed["timestamp"].endswith("Z")


def test_console_renderer_in_development(capsys: pytest.CaptureFixture[str]) -> None:
    """Dev renders the pretty console format, not JSON."""
    setup_logging(environment="development")
    logger = get_logger(__name__)
    logger.info("event_name", key="val")

    raw = _capture(capsys)
    assert raw
    first_line = raw.splitlines()[0]
    assert not first_line.lstrip().startswith("{"), (
        f"dev output should not be JSON, got: {first_line!r}"
    )
    assert "event_name" in raw


def test_request_id_binds_into_log_output(capsys: pytest.CaptureFixture[str]) -> None:
    """PY-022/PY-023: `request_id_ctx` value lands in every log line."""
    setup_logging(environment="production")
    token = request_id_ctx.set("req-123")
    try:
        get_logger(__name__).info("inside_request")
    finally:
        request_id_ctx.reset(token)

    parsed = json.loads(_capture(capsys).splitlines()[-1])
    assert parsed["request_id"] == "req-123"


def test_no_request_id_outside_a_request(capsys: pytest.CaptureFixture[str]) -> None:
    """Background work without a request emits no empty request_id noise."""
    setup_logging(environment="production")
    get_logger(__name__).info("background_job")

    parsed = json.loads(_capture(capsys).splitlines()[-1])
    assert "request_id" not in parsed


def test_exception_formatting_produces_json_safe_output(
    capsys: pytest.CaptureFixture[str],
) -> None:
    setup_logging(environment="production")
    try:
        raise ValueError("boom")
    except ValueError:
        get_logger(__name__).exception("job_failed")

    parsed = json.loads(_capture(capsys).splitlines()[-1])
    assert parsed["event"] == "job_failed"
    assert "ValueError" in parsed["exception"]
