"""Exception hierarchy tests (PY-052)."""

from app.core.exceptions import (
    AppException,
    AuthenticationException,
    AuthorizationException,
    ConflictException,
    EntityNotFoundException,
    ExternalServiceException,
    RateLimitExceededException,
)
import pytest


@pytest.mark.parametrize(
    ("exc_class", "status_code", "error_code"),
    [
        (EntityNotFoundException, 404, "ENTITY_NOT_FOUND"),
        (ConflictException, 409, "RESOURCE_ALREADY_EXISTS"),
        (ExternalServiceException, 502, "UPSTREAM_UNAVAILABLE"),
        (RateLimitExceededException, 429, "RATE_LIMIT_EXCEEDED"),
        (AuthenticationException, 401, "AUTHENTICATION_FAILED"),
        (AuthorizationException, 403, "AUTHORIZATION_FAILED"),
    ],
)
def test_subclass_attributes(
    exc_class: type[AppException],
    status_code: int,
    error_code: str,
) -> None:
    assert issubclass(exc_class, AppException)
    exc = exc_class()
    assert exc.status_code == status_code
    assert exc.error_code == error_code
    assert isinstance(exc.detail, str) and exc.detail


def test_detail_defaults_to_title() -> None:
    assert EntityNotFoundException().detail == "Not Found"


def test_detail_override() -> None:
    assert ConflictException("deck title exists").detail == "deck title exists"


def test_authentication_carries_bearer_challenge() -> None:
    """PY-058: 401s default to `WWW-Authenticate: Bearer`."""
    assert AuthenticationException().headers == {"WWW-Authenticate": "Bearer"}


def test_per_instance_header_override() -> None:
    exc = AuthenticationException(headers={"WWW-Authenticate": 'Bearer realm="api"'})
    assert exc.headers == {"WWW-Authenticate": 'Bearer realm="api"'}
