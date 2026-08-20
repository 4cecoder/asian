---
id: t03-exception-architecture
title: "Domain 6: Exception Handling, Error Architecture & Problem Details"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-051–PY-060"
status: complete
tags: [python, fastapi, errors, rfc7807]
related: [t03-scaffolding-settings, t03-rate-limiting, t03-dependency-injection]
---

# Domain 6: Exception Handling, Error Architecture & Problem Details

A single RFC 7807/9457-compliant error shape for every failure mode in the
API: validation errors, HTTP exceptions, unhandled 500s, upstream timeouts,
conflicts, and auth failures all funnel through one `ProblemDetails` schema.

## Tasks

| ID     | Title                                          | Depends on     | Spec (condensed)                                                                                                                                                                                                                                            | Acceptance check                                                                                                                     |
| ------ | ---------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| PY-051 | RFC 7807/9457 Problem Details schema           | PY-005         | Create `app/schemas/errors.py`: `ProblemDetails(type: HttpUrl = "about:blank", title, status, detail, instance, error_code, timestamp, invalid_params: list[InvalidParam] \| None)`.                                                                        | Schema serializes RFC 7807-compliant JSON. `uv run pytest tests/schemas/test_error_schemas.py`.                                      |
| PY-052 | Custom exception base hierarchy                | PY-051         | Create `app/core/exceptions.py`: `AppException` (base) → `EntityNotFoundException` (404), `ConflictException` (409), `ExternalServiceException` (502), `RateLimitExceededException` (429), `AuthenticationException` (401), `AuthorizationException` (403). | All custom exceptions inherit `AppException` with consistent attributes. `uv run pytest tests/core/test_exceptions_hierarchy.py`.    |
| PY-053 | Pydantic `RequestValidationError` formatter    | PY-051, PY-052 | `validation_exception_handler(request, exc) -> JSONResponse`. Transforms Pydantic errors into an `invalid_params` list (`field`, `reason`, `rejected_value`); returns HTTP 422.                                                                             | Invalid params return a structured RFC 7807 error. `uv run pytest tests/core/test_validation_handler.py`.                            |
| PY-054 | Starlette `HTTPException` normalized handler   | PY-051, PY-052 | `http_exception_handler(request, exc)` formats standard Starlette/FastAPI HTTP exceptions into `ProblemDetails`.                                                                                                                                            | Built-in 404/405 return uniform `ProblemDetails` JSON. `uv run pytest tests/core/test_http_handler.py`.                              |
| PY-055 | Global unhandled 500 handler with error ID     | PY-023, PY-051 | `unhandled_exception_handler(request, exc)` logs the full traceback with `request_id`, emits an alert, returns a generic message — never leaks internal traces.                                                                                             | Unhandled errors return HTTP 500 with an `error_id` tied to the request trace. `uv run pytest tests/core/test_unhandled_handler.py`. |
| PY-056 | Upstream timeout & connection error handlers   | PY-052         | Handlers for `httpx.TimeoutException` → HTTP 504 (`UPSTREAM_TIMEOUT`), `httpx.ConnectError` → HTTP 502 (`UPSTREAM_UNAVAILABLE`).                                                                                                                            | Downstream timeouts return clean 504 JSON. `uv run pytest tests/core/test_upstream_handlers.py`.                                     |
| PY-057 | Entity conflict & state inconsistency handlers | PY-052         | Handler for `ConflictException` → HTTP 409 with conflict details (e.g. duplicate deck title, active concurrent session).                                                                                                                                    | 409 includes `error_code: "RESOURCE_ALREADY_EXISTS"`. `uv run pytest tests/core/test_conflict_handler.py`.                           |
| PY-058 | Authentication & authorization handlers        | PY-052         | `AuthenticationException` → 401 with `WWW-Authenticate: Bearer`; `AuthorizationException` → 403 Forbidden.                                                                                                                                                  | Auth failures return standard 401/403 `ProblemDetails` JSON. `uv run pytest tests/core/test_auth_handlers.py`.                       |
| PY-059 | Exception handler registration registry        | PY-051–PY-058  | `register_exception_handlers(app)` binds every custom and standard handler to the app instance.                                                                                                                                                             | App intercepts every custom and standard exception type. `uv run pytest tests/core/test_handler_registration.py`.                    |
| PY-060 | Fault injection & error handler test suite     | PY-051–PY-059  | Simulated fault injection (DB drop, network timeout, division by zero, invalid JSON), asserting response schemas/status codes.                                                                                                                              | 100% of injected faults produce valid RFC 7807 responses. `uv run pytest tests/core/test_error_faults.py`.                           |

## Related packages

- [[t03-rate-limiting]] — `RateLimitExceededException` belongs to this hierarchy
- [[t03-dependency-injection]] — auth dependencies raise `AuthenticationException`/`AuthorizationException`
