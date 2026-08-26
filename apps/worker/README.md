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
- `app/services/refinement.py` — community-submission refinement:
  `RefinementPipeline` protocol (the seam Tracks 4-6 plug real AI into),
  the deterministic default implementation, and `ConvexIngestionClient`
  for the Convex claim/complete endpoints
- `app/routers/health.py` — probe routes
- `app/routers/internal.py` — `GET /internal/ingestion/run`: one pass of
  the claim -> refine -> complete loop (ADR 0005)
- `tests/` — mirrors the app package (`core/`, `middleware/`, `schemas/`,
  `services/`, `routers/`)
- `Dockerfile` / `.dockerignore` — uv-based multi-stage build

## Community ingestion loop (ADR 0005)

`GET /internal/ingestion/run` claims up to `CONVEX__CLAIM_LIMIT` pending
submissions from Convex, runs each through the
`RefinementPipeline`, and reports `approved` or `needsReview` back. A 409
from Convex means the claim went stale; it is skipped, not retried. The
route carries no auth of its own — bind it to localhost / a private
network and gate at the ingress.

Required settings (no defaults that work against a real deployment):

```bash
CONVEX__BASE_URL=https://<deployment>.convex.site   # HTTP-actions host,
                                                    # NOT .convex.cloud
CONVEX__WORKER_SECRET=<same value as the deployment's WORKER_SECRET>
```

The Convex side reads its copy from `bunx convex env set WORKER_SECRET ...`
(see SECURITY.md). If either side's value is missing, the run endpoint
answers 503 `CONFIGURATION_INCOMPLETE`; if they mismatch, Convex answers
401 and the run reports every submission as failed.

The current pipeline is deterministic only (trim + whitespace collapse +
per-kind shape validation mirroring the Convex validators). It approves
clean payloads and flags anything else `needsReview`. No LLM calls yet —
that is the seam, not an oversight.

## Gotcha: middleware registration order

Starlette's `add_middleware` PREPENDS, so the last-added middleware is
OUTERMOST on the request path. To get PY-031's order (correlation ->
security headers -> CORS), `setup_middleware` registers them in reverse.
Do not "fix" the call order back without re-reading
`tests/middleware/test_middleware_order.py`.

Track 3 domains land as modules in these packages; see
`docs/knowledge/modules/track-03/`.
