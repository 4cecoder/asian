"""Custom exception hierarchy (PY-052, PY-058).

Every application-raised error inherits `AppException`, which carries
the HTTP status code, RFC 7807 title, machine-readable `error_code`, and
optional response headers (e.g. `WWW-Authenticate` on 401s) consumed by
`app.core.error_handlers`.
"""


class AppException(Exception):  # noqa: N818 - name fixed by spec PY-052
    """Base class for every application-raised error."""

    status_code: int = 500
    title: str = "Internal Server Error"
    error_code: str = "INTERNAL_ERROR"
    #: Extra response headers; subclasses may set a sensible default.
    headers: dict[str, str] | None = None

    def __init__(
        self,
        detail: str | None = None,
        *,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.detail = detail or self.title
        if headers is not None:
            self.headers = headers
        super().__init__(self.detail)


class EntityNotFoundException(AppException):
    status_code = 404
    title = "Not Found"
    error_code = "ENTITY_NOT_FOUND"


class ConflictException(AppException):
    status_code = 409
    title = "Conflict"
    error_code = "RESOURCE_ALREADY_EXISTS"


class ExternalServiceException(AppException):
    status_code = 502
    title = "External Service Error"
    error_code = "UPSTREAM_UNAVAILABLE"


class RateLimitExceededException(AppException):
    status_code = 429
    title = "Too Many Requests"
    error_code = "RATE_LIMIT_EXCEEDED"


class AuthenticationException(AppException):
    status_code = 401
    title = "Unauthorized"
    error_code = "AUTHENTICATION_FAILED"
    headers = {"WWW-Authenticate": "Bearer"}


class AuthorizationException(AppException):
    status_code = 403
    title = "Forbidden"
    error_code = "AUTHORIZATION_FAILED"
