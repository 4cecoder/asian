---
id: t03-lifespan-connections
title: "Domain 2: Application Lifespan & Connection Management"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-011–PY-020"
status: complete
tags: [python, fastapi, lifespan, redis, concurrency]
related: [t03-scaffolding-settings, t03-observability-otel]
---

# Domain 2: Application Lifespan & Connection Management

Everything the app needs alive before it accepts traffic and cleanly torn
down on shutdown: HTTP/Redis pools, a CPU-bound thread pool, cache
pre-warming, signal handling, WebSocket drain, and a background task
tracker.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| PY-011 | Async lifespan context manager | PY-010 | Create `app/core/lifespan.py`: `@asynccontextmanager async def lifespan(app: FastAPI) -> AsyncIterator[None]`. Structure startup/shutdown stages with structured log timestamps. | Clean context yield and graceful termination. `uv run pytest tests/core/test_lifespan.py -k test_lifespan_execution`. |
| PY-012 | `httpx.AsyncClient` pool lifecycle | PY-011 | Create `app/core/http_client.py`. Global client with `limits=httpx.Limits(max_keepalive_connections=50, max_connections=200, keepalive_expiry=30.0)`, `timeout=httpx.Timeout(15.0, connect=5.0)`. Attach to `app.state.http_client`; `aclose()` at shutdown. | Connects successfully; pool closes with no "unclosed client" warnings. `uv run pytest tests/core/test_http_client.py`. |
| PY-013 | Async Redis pool & health ping | PY-011 | Create `app/core/redis.py`. `redis.asyncio.ConnectionPool.from_url(REDIS_URL, max_connections=50, decode_responses=True)`; instantiate `redis.asyncio.Redis` on `app.state.redis`; `await app.state.redis.ping()`. Close pool on shutdown. | Ping succeeds when Redis is up; connection error logs informatively when down. `uv run pytest tests/core/test_redis.py`. |
| PY-014 | CPU-bound thread pool executor | PY-011 | Create `app/core/executor.py`. `ThreadPoolExecutor(max_workers=min(32, (os.cpu_count() or 1) + 4))` on `app.state.thread_pool`. Shutdown via `shutdown(wait=True, cancel_futures=True)`. | Dispatches CPU-heavy work without blocking the async event loop. `uv run pytest tests/core/test_executor.py`. |
| PY-015 | In-memory cache & tone-data pre-warm | PY-011 | Create `app/core/warmup.py`: `async def warmup_cache(app) -> None`. Pre-load static JSON pitch-accent maps (Mandarin, Thai, Vietnamese, Japanese) into `app.state.tone_data`. | Buffers populated during startup, before traffic is accepted. `uv run pytest tests/core/test_warmup.py`. |
| PY-016 | Graceful SIGTERM/SIGINT handling | PY-011 | Register handlers that set `app.state.is_shutting_down = True`. Fail readiness checks immediately; give active HTTP requests 15s to finish. | SIGTERM flips the flag without dropping in-flight requests. `uv run pytest tests/core/test_signals.py`. |
| PY-017 | Connection drain & WebSocket teardown | PY-016 | Track active connections in `app.state.active_websockets: set[WebSocket]`. On shutdown, send close code 1001 (Going Away) to every client and await closure. | WebSockets receive the close code and disconnect before process exit. `uv run pytest tests/core/test_teardown.py`. |
| PY-018 | Background task queue & lifecycle manager | PY-011 | Create `app/core/tasks.py`. Track `asyncio.Task`s in `app.state.background_tasks: set[asyncio.Task]`. `spawn_background_task(coro)` attaches done-callbacks and logs unhandled exceptions. | Tasks run concurrently; failures log tracebacks without killing the event loop. `uv run pytest tests/core/test_tasks.py`. |
| PY-019 | App state container & context accessors | PY-011–PY-018 | Create `app/core/state.py` with typed accessors (`get_http_client`, `get_redis_client`, `get_thread_pool`). | Type checker validates access; raises `RuntimeError` if accessed pre-init. `uv run pytest tests/core/test_state.py`. |
| PY-020 | Lifespan mocking & test fixtures | PY-011–PY-019 | Pytest fixtures for mocked `httpx.AsyncClient`, mocked `redis.Redis`, and dummy app state. | Test client starts and stops cleanly in unit tests. `uv run pytest tests/fixtures/test_lifespan_fixtures.py`. |

## Related packages
- [[t03-scaffolding-settings]] — settings consumed at startup
- [[t03-observability-otel]] — instruments the same lifespan hooks
