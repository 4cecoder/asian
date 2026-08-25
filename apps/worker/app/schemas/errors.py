"""RFC 7807/9457 Problem Details schema (PY-051 minimal slice)."""

from datetime import UTC, datetime

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(UTC)


class InvalidParam(BaseModel):
    """One rejected request field, RFC 7807 extension style."""

    field: str
    reason: str
    rejected_value: str | None = None


class ProblemDetails(BaseModel):
    """RFC 7807/9457 error body used by every error response."""

    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
    error_code: str | None = None
    timestamp: datetime = Field(default_factory=utc_now)
    invalid_params: list[InvalidParam] | None = None
