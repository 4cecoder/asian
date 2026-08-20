---
id: t03-structured-logging
title: "Domain 3: Structured Logging & Context Correlation Engine"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-021–PY-030"
status: complete
tags: [python, structlog, logging, observability, security]
related: [t03-scaffolding-settings, t03-middleware-suite, t03-observability-otel]
---

# Domain 3: Structured Logging & Context Correlation Engine

A `structlog`-based JSON logging pipeline with request correlation IDs,
PII/secret redaction, OpenTelemetry trace injection, and a runtime-tunable
log level — so every log line is machine-parseable and traceable back to a
single HTTP request.

## Tasks

| ID     | Title                                             | Depends on     | Spec (condensed)                                                                                                                                                                                                                          | Acceptance check                                                                                                                                               |
| ------ | ------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PY-021 | Structlog core setup & processor pipeline         | PY-005         | Create `app/core/logging.py`. `structlog.configure()` with processors: `merge_contextvars`, `add_log_level`, `TimeStamper(fmt="iso")`, `StackInfoRenderer()`, `format_exc_info()`, `JSONRenderer()` in prod / `ConsoleRenderer()` in dev. | `logger.info("event_name", key="val")` produces structured JSON with ISO timestamps. `uv run pytest tests/core/test_logging.py -k test_structlog_json_output`. |
| PY-022 | Contextvars request correlation storage           | PY-021         | Create `app/core/context.py`: `request_id_ctx`, `user_id_ctx`, `tenant_id_ctx` as `ContextVar[str]`, each defaulting to `""`.                                                                                                             | Context vars stay isolated across concurrent async coroutines. `uv run pytest tests/core/test_context.py`.                                                     |
| PY-023 | Correlation ID middleware (`X-Request-ID`)        | PY-022         | Create `app/middleware/correlation.py`. Extract incoming `X-Request-ID` or generate a new UUIDv4. Store in `request_id_ctx`; echo back on the response header.                                                                            | Missing header → new UUIDv4; existing header → preserved. `uv run pytest tests/middleware/test_correlation_middleware.py`.                                     |
| PY-024 | HTTP access log middleware (nanosecond precision) | PY-021, PY-023 | Create `app/middleware/access_log.py`. Record `http_method`, `path`, `query_params`, `client_ip`, `status_code`, `duration_ms` (via `time.perf_counter_ns()`), `user_agent`. Skip `/healthz` and `/metrics`.                              | One structured access-log line per completed request, duration in ms. `uv run pytest tests/middleware/test_access_log.py`.                                     |
| PY-025 | Sensitive data masking & PII redaction filter     | PY-021         | Custom structlog processor `redact_sensitive_data(logger, method_name, event_dict)`. Recursively mask `password`, `token`, `authorization`, `api_key`, `secret`, `access_token` with `[REDACTED]`.                                        | `authorization: "Bearer secret"` becomes `[REDACTED]` in logs. `uv run pytest tests/core/test_log_filters.py`.                                                 |
| PY-026 | OpenTelemetry trace context correlation in logs   | PY-021         | Processor `add_opentelemetry_context(...)` pulls `trace_id`/`span_id` from `opentelemetry.trace.get_current_span()` into the log dict.                                                                                                    | Logs inside an active span carry `trace_id` and `span_id`. `uv run pytest tests/core/test_logging_otel.py`.                                                    |
| PY-027 | Standardized log levels & uvicorn interceptor     | PY-021         | Intercept stdlib logging (`uvicorn.access`, `uvicorn.error`, `fastapi`) and route through structlog for uniform JSON output.                                                                                                              | Uvicorn's internal messages match the app's JSON log format. `uv run pytest tests/core/test_logging_uvicorn.py`.                                               |
| PY-028 | Dynamic log level controller API                  | PY-021         | `POST /api/v1/admin/log-level` with `{"level": "DEBUG"                                                                                                                                                                                    | "INFO"                                                                                                                                                         | "WARNING" | "ERROR"}`, admin-authenticated. Reconfigures the logger at runtime, no restart. | Valid payload changes level live; invalid levels return HTTP 422. `uv run pytest tests/routers/test_admin_logging.py`. |
| PY-029 | Sentry integration & breadcrumb context injector  | PY-005, PY-021 | Initialize the Sentry SDK when `SENTRY_DSN` is set. Custom processor tags unhandled errors with `request_id` and `environment`.                                                                                                           | Exceptions trigger a Sentry capture event with request tags, when a DSN is configured. `uv run pytest tests/core/test_sentry.py`.                              |
| PY-030 | Logging pipeline unit & load test suite           | PY-021–PY-029  | Suite verifying concurrent log emission, zero thread contention, strict JSON compliance under load.                                                                                                                                       | 1,000 concurrent log writes produce no corrupted lines and no unhandled exceptions. `uv run pytest tests/core/test_logging_suite.py`.                          |

## Related packages

- [[t03-scaffolding-settings]] — `SENTRY_DSN` and log config come from settings
- [[t03-middleware-suite]] — correlation/access-log middleware plug into the shared stack
- [[t03-observability-otel]] — shares trace/span context with the tracer
