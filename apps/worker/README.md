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
  `RefinementPipeline` protocol (async), the deterministic default
  implementation, `LlmRefinementPipeline` (OpenAI-compatible AI
  refinement, off by default), and `ConvexIngestionClient` for the Convex
  claim/complete endpoints
- `app/services/prompts.py` — per-kind system/user prompt builders for
  the LLM pipeline (pure functions)
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

The current default pipeline is deterministic only (trim + whitespace
collapse + per-kind shape validation mirroring the Convex validators). It
approves clean payloads and flags anything else `needsReview`. Setting
`LLM__ENABLED=true` swaps in the AI pipeline — see the next section. The
selection happens per request in the `get_pipeline` dependency; tests pin
implementations via `set_default_pipeline` or dependency override.

## LLM refinement (optional, off by default)

`LLM__ENABLED` defaults to `false`: CI and dev environments never call
out. When enabled, the worker refines each submission through any
OpenAI-compatible chat-completions server and applies the platform's
content rules (orthography, romanization, gloss quality, register/level
tagging per `docs/knowledge/content-packet-format.md`).

### Enable locally (Ollama)

```bash
ollama serve                 # or use the desktop app
ollama pull llama3.1:8b      # any instruct model works

# apps/worker/.env (gitignored) or your shell:
LLM__ENABLED=true
LLM__BASE_URL=http://localhost:11434/v1
LLM__MODEL=llama3.1:8b

uv run uvicorn app.main:app --reload
curl -s localhost:8000/internal/ingestion/run | jq
```

LM Studio: `LLM__BASE_URL=http://localhost:1234/v1`. Hosted providers:
set `LLM__BASE_URL=https://api.openai.com/v1`, `LLM__MODEL=...`, and
`LLM__API_KEY=sk-...`. API keys live in the environment or a secret
store, never in committed files (see SECURITY.md).

| Setting                  | Default | Purpose                                         |
| ------------------------ | ------- | ----------------------------------------------- |
| `LLM__ENABLED`           | `false` | Master switch; false = deterministic pipeline   |
| `LLM__BASE_URL`          | (none)  | OpenAI-compatible endpoint root, `/v1` included |
| `LLM__MODEL`             | (none)  | Model name the server exposes                   |
| `LLM__API_KEY`           | (none)  | Omitted entirely when unset (local servers)     |
| `LLM__TEMPERATURE`       | `0.0`   | Deterministic output recommended for refinement |
| `LLM__TIMEOUT_SECONDS`   | `30.0`  | Per-submission provider timeout                 |
| `LLM__MIN_CONFIDENCE`    | `0.7`   | Verdicts below this land in needsReview         |
| `LLM__MAX_OUTPUT_TOKENS` | `0`     | 0 omits the cap (best cross-provider compat)    |

Enabling with a missing `LLM__BASE_URL` or `LLM__MODEL` fails the run
endpoint loudly (503 problem+json), not silently.

### Decision policy

First failure wins; every needsReview path records why in `aiNotes`.

| Condition                                        | Outcome                                 |
| ------------------------------------------------ | --------------------------------------- |
| Unknown submission kind (no field guide)         | needsReview, no network call            |
| Provider unreachable / HTTP error / bad envelope | needsReview                             |
| Model output not one schema-valid verdict object | needsReview                             |
| Refined payload breaks the kind's shape          | needsReview, original payload preserved |
| Model verdict is needsReview                     | needsReview                             |
| Confidence < `LLM__MIN_CONFIDENCE`               | needsReview                             |
| Approved + confidence >= threshold + shape valid | approved                                |

A crashing pipeline never aborts the batch: the router counts it in the
run summary's `failed` bucket and moves on.

### Cost and latency

- **Local (Ollama/LM Studio)**: free, but expect ~0.5-5s per submission
  depending on model size and hardware. A full pass over the default
  claim limit of 25 runs sequentially, so budget minutes, not seconds.
- **Hosted**: short submissions cost fractions of a cent each on
  mini-class models; temperature 0 keeps outputs stable. Set
  `LLM__MAX_OUTPUT_TOKENS` (e.g. 512) to bound runaway completions.
- The run endpoint processes submissions one at a time by design (each
  completion reports back to Convex before the next claim is judged).
  Raise throughput by calling the endpoint more often, not by raising
  `CONVEX__CLAIM_LIMIT` blindly.
- Watch the run summary: rising `needsReview` with "unavailable" notes
  means the provider is down; rising `failed` means the pipeline itself
  is crashing and rows will pile up until the cron sweep releases them.

### Enabling in production

Ops checklist:

1. Store the key in the deployment secret store (never a committed
   `.env`; same discipline as `CONVEX__WORKER_SECRET` per SECURITY.md).
2. Set `LLM__ENABLED=true`, `LLM__BASE_URL`, `LLM__MODEL`,
   `LLM__API_KEY` (hosted providers only).
3. Start with a low `CONVEX__CLAIM_LIMIT` canary pass and inspect
   `aiNotes` on completed submissions before opening the throttle.
4. Keep `ENVIRONMENT=production`'s existing requirement intact:
   `CONVEX__WORKER_SECRET` must still be set regardless of LLM state.

## Gotcha: middleware registration order

Starlette's `add_middleware` PREPENDS, so the last-added middleware is
OUTERMOST on the request path. To get PY-031's order (correlation ->
security headers -> CORS), `setup_middleware` registers them in reverse.
Do not "fix" the call order back without re-reading
`tests/middleware/test_middleware_order.py`.

Track 3 domains land as modules in these packages; see
`docs/knowledge/modules/track-03/`.
