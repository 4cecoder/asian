"""RFC 7807/9457 exception handlers (PY-053..PY-055, PY-057..PY-059).

Every failure mode funnels into one `ProblemDetails` body served as
`application/problem+json`:

- `AppException` hierarchy -> mapped status / title / error_code / headers
- Starlette `HTTPException` -> normalized ProblemDetails
- `RequestValidationError` -> 422 with an `invalid_params` list
- unhandled `Exception` -> generic 500 with a correlatable `error_id`,
  never leaking stack traces to the client in any environment
"""

import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.context import request_id_ctx
from app.core.exceptions import AppException, AuthenticationException
from app.core.logging import get_logger
from app.schemas.errors import InvalidParam, ProblemDetails

logger = get_logger(__name__)

PROBLEM_MEDIA_TYPE = "application/problem+json"


def problem_response(
    problem: ProblemDetails,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Serialize a `ProblemDetails` as an RFC 7807 JSON response."""
    return JSONResponse(
        status_code=problem.status,
        content=problem.model_dump(mode="json"),
        media_type=PROBLEM_MEDIA_TYPE,
        headers=headers,
    )


def _instance(request: Request) -> str:
    return request.url.path


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    headers = dict(exc.headers) if exc.headers else None
    if isinstance(exc, AuthenticationException) and headers is None:
        # PY-058: auth failures must always advertise the Bearer challenge.
        headers = {"WWW-Authenticate": "Bearer"}
    return problem_response(
        ProblemDetails(
            title=exc.title,
            status=exc.status_code,
            detail=exc.detail,
            instance=_instance(request),
            error_code=exc.error_code,
        ),
        headers=headers,
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    detail = str(exc.detail) if exc.detail else None
    return problem_response(
        ProblemDetails(
            title=detail or "Request Failed",
            status=exc.status_code,
            detail=detail if isinstance(exc.detail, str) else None,
            instance=_instance(request),
        ),
        headers=dict(exc.headers) if exc.headers else None,
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    invalid_params = [
        InvalidParam(
            field=".".join(str(part) for part in error["loc"]),
            reason=error["msg"],
            rejected_value=(str(error["input"]) if error.get("input") is not None else None),
        )
        for error in exc.errors()
    ]
    return problem_response(
        ProblemDetails(
            title="Validation Error",
            status=422,
            detail="One or more request fields failed validation.",
            instance=_instance(request),
            invalid_params=invalid_params,
        )
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    error_id = str(uuid.uuid4())
    logger.exception(
        "unhandled_exception",
        error_id=error_id,
        request_id=request_id_ctx.get(),
        path=request.url.path,
    )
    # The traceback goes to the log stream only; the client gets a
    # generic message plus the correlatable error ID (PY-055).
    return problem_response(
        ProblemDetails(
            title="Internal Server Error",
            status=500,
            detail=f"An unexpected error occurred. Error ID: {error_id}",
            instance=_instance(request),
        )
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Bind every handler to the application instance (PY-059)."""
    app.add_exception_handler(AppException, app_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)
