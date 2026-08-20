---
id: t03-middleware-suite
title: "Domain 4: Custom Middleware Suite & Traffic Control"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-031–PY-040"
status: complete
tags: [python, fastapi, middleware, security, cors]
related: [t03-scaffolding-settings, t03-structured-logging, t03-rate-limiting]
---

# Domain 4: Custom Middleware Suite & Traffic Control

The full request-processing middleware stack in strict execution order:
correlation → security headers → CORS → rate limiting → size limits →
compression → access log → metrics. This is the backbone every request and
response passes through.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| PY-031 | Middleware dispatcher & stack ordering | PY-005 | Create `app/middleware/__init__.py`: `setup_middleware(app)` registers, in order: `CorrelationIdMiddleware` → `SecurityHeadersMiddleware` → `CORSMiddleware` → `RateLimiterMiddleware` → `RequestSizeLimitMiddleware` → `GZipMiddleware` → `AccessLogMiddleware` → `PrometheusMetricsMiddleware`. | Stack runs in that order on request, reverse order on response. `uv run pytest tests/middleware/test_middleware_order.py`. |
| PY-032 | Strict CORS middleware config | PY-007, PY-031 | `CORSMiddleware(allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"], allow_headers=["*"], max_age=86400)`. | Allowed origins get `Access-Control-Allow-Origin`; disallowed origins get no CORS headers. `uv run pytest tests/middleware/test_cors.py`. |
| PY-033 | Security headers middleware (CSP, HSTS, X-Frame) | PY-031 | Create `app/middleware/security_headers.py` adding `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; media-src 'self' blob: https:;`. | Every response carries all of the above headers. `uv run pytest tests/middleware/test_security_headers.py`. |
| PY-034 | Request payload size limiting middleware | PY-031 | Create `app/middleware/size_limit.py`. Check `Content-Length` against a max (25MB for audio, 2MB for JSON). Abort with HTTP 413 before streaming the full body into memory if over. | Oversized requests get HTTP 413. `uv run pytest tests/middleware/test_size_limit.py`. |
| PY-035 | Client IP resolution & trusted proxy parser | PY-031 | Create `app/middleware/client_ip.py`. Parse `X-Forwarded-For`/`X-Real-IP` only from trusted proxy CIDRs (Volterra/K8s Ingress). Attach to `request.state.client_ip`. | Spoofed `X-Forwarded-For` from untrusted clients is ignored. `uv run pytest tests/middleware/test_client_ip.py`. |
| PY-036 | Response compression middleware (Gzip & Brotli) | PY-031 | `GZipMiddleware(minimum_size=1000)` compresses JSON responses > 1KB when `Accept-Encoding: gzip` is present. Exclude `audio/mpeg`, `audio/opus` from re-compression. | Text/JSON > 1KB gzipped; audio passes through uncompressed. `uv run pytest tests/middleware/test_compression.py`. |
| PY-037 | Server-Timing header middleware | PY-031 | Create `app/middleware/server_timing.py` tracking DB lookup, audio synthesis, and LLM inference timings. Inject `Server-Timing: total;dur=24.5, db;dur=3.2, tts;dur=18.1`. | Response `Server-Timing` values match actual execution timings. `uv run pytest tests/middleware/test_server_timing.py`. |
| PY-038 | Client disconnect & request cancellation detector | PY-031 | Monitor `await request.is_disconnected()`. Cancel ongoing upstream LLM/TTS streaming tasks if the client closes the socket early. | Client disconnect cancels the background inference task and frees compute. `uv run pytest tests/middleware/test_cancellation.py`. |
| PY-039 | Maintenance mode & circuit breaker middleware | PY-031 | Create `app/middleware/maintenance.py` reading `app.state.maintenance_mode`. When enabled, return HTTP 503 with `Retry-After: 300` for all non-admin routes. | Maintenance mode returns 503 on public routes, admin bypass routes still work. `uv run pytest tests/middleware/test_maintenance.py`. |
| PY-040 | Comprehensive middleware test suite | PY-031–PY-039 | End-to-end HTTP tests through the entire stack verifying headers, compression, size limits, error handling. | All middleware tests pass, 100% branch coverage. `uv run pytest tests/middleware/test_suite.py`. |

## Related packages
- [[t03-scaffolding-settings]] — `SecuritySettings.CORS_ORIGINS` feeds PY-032
- [[t03-structured-logging]] — `CorrelationIdMiddleware`/`AccessLogMiddleware` live in this stack
- [[t03-rate-limiting]] — `RateLimiterMiddleware` slot in the ordered stack
