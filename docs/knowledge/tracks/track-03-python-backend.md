---
id: track-03-python-backend
title: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
track: meta
task_range: "PY-001–PY-100"
status: complete
tags: [python, fastapi, backend, moc]
related: [t03-scaffolding-settings, t03-lifespan-connections, t03-structured-logging, t03-middleware-suite, t03-rate-limiting, t03-exception-architecture, t03-dependency-injection, t03-api-routing-openapi, t03-observability-otel, t03-health-probes-testing]
---

# Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway

The FastAPI gateway all other backend tracks (TTS, STT, roleplay LLM
orchestration, SRS) sit behind. Python 3.13 + `uv`, a strict middleware
stack, RFC 7807 error handling, Redis-backed rate limiting, typed
dependency injection for auth/storage/pagination, a versioned `/api/v1`
router with a custom OpenAPI 3.1 generator, and full Prometheus/OpenTelemetry
observability — closing with Kubernetes-style health probes and a 90%
test-coverage gate. 100/100 tasks present in the source spec, split across
10 domains of 10 tasks each.

## Modules

| # | Package | Range | Scope |
|---|---|---|---|
| 1 | [[t03-scaffolding-settings]] | PY-001–010 | `uv`, Ruff, Mypy, pytest config; typed `pydantic-settings` tree |
| 2 | [[t03-lifespan-connections]] | PY-011–020 | Startup/shutdown lifecycle, HTTP/Redis pools, thread pool, signal handling |
| 3 | [[t03-structured-logging]] | PY-021–030 | `structlog` JSON pipeline, correlation IDs, PII redaction, Sentry |
| 4 | [[t03-middleware-suite]] | PY-031–040 | Ordered middleware stack: CORS, security headers, size limits, compression |
| 5 | [[t03-rate-limiting]] | PY-041–050 | Redis sliding-window & token-bucket limiters, tiered policy, 429 handling |
| 6 | [[t03-exception-architecture]] | PY-051–060 | RFC 7807 `ProblemDetails`, custom exception hierarchy, fault-injection tests |
| 7 | [[t03-dependency-injection]] | PY-061–070 | JWT/API-key auth, RBAC, HMAC verification, pagination, idempotency keys |
| 8 | [[t03-api-routing-openapi]] | PY-071–080 | `/api/v1` router tree, OpenAPI 3.1 generator, offline docs, deprecation headers |
| 9 | [[t03-observability-otel]] | PY-081–090 | Prometheus metrics (HTTP + business), OTel tracer, FastAPI/httpx instrumentation |
| 10 | [[t03-health-probes-testing]] | PY-091–100 | `/healthz` `/readyz` `/livez`, dependency checkers, pytest harness, E2E gate |

## Related tracks
- [[track-04-tts-audio]] — mounts under `/api/v1/tts`, uses this gateway's middleware/auth
- [[track-05-stt-pronunciation]] — mounts under `/api/v1/stt`
- [[track-02-docker-cicd]] — containerizes this backend (`uv` multi-stage Dockerfile)
