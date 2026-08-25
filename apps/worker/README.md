# apps/worker

FastAPI worker service (Track 3). Python 3.13, managed with `uv`.

## Commands

```bash
uv sync                  # create venv + install deps
uv run pytest            # run the test suite
uv run ruff check .      # lint
uv run ruff format --check .   # format check
uv run mypy app          # typecheck
uv run uvicorn app.main:app --reload   # dev server on :8000
docker build -t asian-worker .         # multi-stage image (slim runtime, non-root)
```

Probes: `GET /healthz` (shallow), `GET /readyz`, `GET /livez`.

## Layout

- `app/main.py` — application factory (`create_app`)
- `app/settings.py` — pydantic-settings tree (`get_settings()`)
- `app/core/lifespan.py` — connection-pool startup/shutdown
- `app/core/logging.py` — structlog pipeline (JSON prod / console dev,
  PII redaction per PY-025, request-ID binding from contextvars)
- `app/core/context.py` — request-scoped contextvars (PY-022)
- `app/core/exceptions.py` — AppException hierarchy (PY-052)
- `app/core/error_handlers.py` — RFC 7807 exception handlers
- `app/middleware/` — correlation ID (outermost) + security headers +
  CORS-from-settings; `setup_middleware` is the single registration point
- `app/schemas/errors.py` — RFC 7807/9457 ProblemDetails (PY-051)
- `app/services/health.py` — dependency-checker protocol
- `app/routers/health.py` — probe routes
- `tests/` — mirrors the app package (`core/`, `middleware/`, `schemas/`)
- `Dockerfile` / `.dockerignore` — uv-based multi-stage build

## Gotcha: middleware registration order

Starlette's `add_middleware` PREPENDS, so the last-added middleware is
OUTERMOST on the request path. To get PY-031's order (correlation ->
security headers -> CORS), `setup_middleware` registers them in reverse.
Do not "fix" the call order back without re-reading
`tests/middleware/test_middleware_order.py`.

Track 3 domains land as modules in these packages; see
`docs/knowledge/modules/track-03/`.
