---
id: t03-health-probes-testing
title: "Domain 10: Health Probes, Readiness Engine & Testing Infrastructure"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-091–PY-100"
status: complete
tags: [python, kubernetes, health-checks, testing]
related: [t03-lifespan-connections, t03-dependency-injection]
---

# Domain 10: Health Probes, Readiness Engine & Testing Infrastructure

The three Kubernetes probe endpoints (`/healthz`, `/readyz`, `/livez`),
per-dependency health checkers (Redis, storage), and the shared pytest
fixture/mocking harness the whole Track 3 test suite is built on — closing
with an end-to-end gateway quality gate.

## Tasks

| ID     | Title                                         | Depends on             | Spec (condensed)                                                                                                                                                                                    | Acceptance check                                                                                                                   |
| ------ | --------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| PY-091 | Health check service & checker protocol       | PY-010                 | Create `app/services/health.py`: `HealthCheckResult(status: "healthy"\|"unhealthy"\|"degraded", details, latency_ms)`. `DependencyChecker(Protocol)` with `async def check() -> HealthCheckResult`. | Protocol validates check implementations cleanly. `uv run pytest tests/services/test_health_service.py`.                           |
| PY-092 | Liveness probe (`GET /healthz`)               | PY-091                 | Return `{"status": "ok", "timestamp": ..., "version": "1.0.0"}` with HTTP 200 immediately — shallow check, no dependency calls.                                                                     | Returns 200 in < 2ms even under load. `uv run pytest tests/routers/test_health_probes.py -k test_healthz`.                         |
| PY-093 | Readiness probe (`GET /readyz`)               | PY-091                 | Parallel checks on Redis, S3 storage, downstream AI APIs, 2.0s timeout. 200 if all healthy, 503 if any critical dependency fails.                                                                   | 200 when deps up; 503 naming the failing dependency when down. `uv run pytest tests/routers/test_health_probes.py -k test_readyz`. |
| PY-094 | Startup probe (`GET /livez`)                  | PY-015, PY-091         | Checks `app.state.is_warmed_up`; returns 503 until cache pre-warm and connection pools finish initializing.                                                                                         | 503 during startup, 200 once lifespan warmup finishes. `uv run pytest tests/routers/test_health_probes.py -k test_livez`.          |
| PY-095 | Redis/cache readiness evaluator               | PY-013, PY-091         | `RedisDependencyChecker`: `await redis.ping()` within a 500ms timeout, returns round-trip latency.                                                                                                  | Ping succeeds with recorded latency; timeouts report unhealthy. `uv run pytest tests/services/test_redis_health.py`.               |
| PY-096 | S3/R2 storage readiness evaluator             | PY-062, PY-091         | `StorageDependencyChecker`: bucket reachability via head-bucket, 1.0s timeout.                                                                                                                      | Valid credentials → healthy; invalid permissions → degraded. `uv run pytest tests/services/test_storage_health.py`.                |
| PY-097 | Pytest global fixtures & async client harness | PY-004, PY-010, PY-061 | Create `tests/conftest.py`: `async def client() -> AsyncIterator[AsyncClient]` using `httpx.ASGITransport(app=app)`. `ENVIRONMENT=test` overrides.                                                  | Async test client runs requests through the full middleware stack. `uv run pytest tests/test_conftest.py`.                         |
| PY-098 | Redis & upstream mocking test fixtures        | PY-097                 | `mock_redis` via `fakeredis.aioredis`; `mock_moonshot` via `pytest-httpx`.                                                                                                                          | Unit tests run fully offline, no real network calls. `uv run pytest tests/fixtures/test_mocks.py`.                                 |
| PY-099 | Automated coverage & benchmark gate           | PY-004, PY-097         | Coverage assertion script requiring > 90% line and branch coverage on core modules.                                                                                                                 | `uv run pytest --cov=app --cov-fail-under=90` exits 0. `uv run pytest tests/test_coverage_gate.py`.                                |
| PY-100 | End-to-end API gateway quality gate           | PY-001–PY-099          | E2E test verifying: liveness/readiness probes, request-ID propagation, rate-limit enforcement + headers, gzip + security headers, `/metrics` recording, versioned API execution.                    | `uv run pytest tests/e2e/test_gateway_e2e.py -v` passes in < 15s with 0 failures.                                                  |

## Related packages

- [[t03-lifespan-connections]] — `/livez` gates on the same warmup state
- [[t03-dependency-injection]] — `tests/conftest.py` builds on the DI overrides harness
