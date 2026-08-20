---
id: t03-rate-limiting
title: "Domain 5: Advanced Rate Limiting & Token Bucket Algorithms"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-041–PY-050"
status: complete
tags: [python, redis, rate-limiting, resilience]
related: [t03-middleware-suite, t03-exception-architecture]
---

# Domain 5: Advanced Rate Limiting & Token Bucket Algorithms

Two interchangeable Redis-backed limiter algorithms (sliding window and
token bucket), a local in-memory fallback, tiered policy config, and the
response headers/exceptions that surface limit state to clients.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| PY-041 | Rate limiter abstract base & data models | PY-005 | Create `app/core/rate_limit/base.py`. `RateLimitResult(is_allowed, limit, remaining, reset_after_seconds)`. `BaseRateLimiter(ABC)` with abstract `async def check_rate_limit(key, limit, window_seconds) -> RateLimitResult`. | Interface types validate cleanly. `uv run pytest tests/core/test_rate_limit_base.py`. |
| PY-042 | Redis sliding window counter limiter | PY-013, PY-041 | `RedisSlidingWindowRateLimiter(BaseRateLimiter)` using atomic Redis sorted sets (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`, `EXPIRE`). Remove timestamps older than `now - window_seconds`, count, then add if under limit. | Strict sliding-window accuracy, no burst spikes across boundary resets. `uv run pytest tests/core/test_redis_rate_limiter.py`. |
| PY-043 | Token bucket engine for burst traffic | PY-013, PY-041 | `TokenBucketRateLimiter(BaseRateLimiter)` via a Lua script on Redis. Params: `capacity`, `refill_rate_per_sec`, `requested_tokens`. Atomically updates token balance by elapsed time. | Allows bursts up to capacity, limits sustained throughput to refill rate. `uv run pytest tests/core/test_token_bucket.py`. |
| PY-044 | In-memory thread-safe fallback limiter | PY-041 | `MemoryRateLimiter(BaseRateLimiter)` using `collections.deque` + `asyncio.Lock`, for local dev or when Redis is unreachable. | Limits correctly in-memory; expired deque timestamps get cleaned up. `uv run pytest tests/core/test_memory_limiter.py`. |
| PY-045 | Dynamic client identifier strategy | PY-035, PY-041 | `generate_rate_limit_key(request, scope="default") -> str`. Hierarchy: authenticated `user_id` > `api_key` > `client_ip`. | Consistent scoped keys (`rl:user:123:roleplay`, `rl:ip:192.168.1.1:default`). `uv run pytest tests/core/test_key_generator.py`. |
| PY-046 | Route decorator & tiered policy matrix | PY-041–PY-045 | `@rate_limit(limit=60, window=60, scope="roleplay")` dependency factory. Tiers: Free 10 req/min, Pro 60 req/min, Internal 1000 req/min. | Decorator enforces the configured limit on its route. `uv run pytest tests/core/test_rate_limit_decorator.py`. |
| PY-047 | `X-RateLimit-*` response header injector | PY-041, PY-046 | Inject `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (epoch) on rate-limited responses. | Headers accurately reflect remaining quota and reset time. `uv run pytest tests/middleware/test_rate_limit_headers.py`. |
| PY-048 | HTTP 429 exception & Retry-After formatter | PY-047 | `RateLimitExceededException` → HTTP 429, JSON error payload, `Retry-After` header, on quota breach. | 429 response includes integer `Retry-After`. `uv run pytest tests/core/test_rate_limit_exceptions.py`. |
| PY-049 | Rate limiting whitelist & internal bypass | PY-045 | IP/token whitelist checked against internal K8s cluster CIDRs (`10.0.0.0/8`, `172.16.0.0/12`) to bypass limits for internal health checks. | Whitelisted cluster IPs bypass rate limiting entirely. `uv run pytest tests/core/test_whitelist.py`. |
| PY-050 | Redis mock & concurrency stress test suite | PY-041–PY-049 | Simulate 100 parallel workers hitting a 50 req/min endpoint, verify zero race-condition over-allocation. | Exactly 50 requests succeed, exactly 50 return 429. `uv run pytest tests/core/test_rate_limit_stress.py`. |

## Related packages
- [[t03-middleware-suite]] — `RateLimiterMiddleware` sits in the shared stack
- [[t03-exception-architecture]] — `RateLimitExceededException` follows the shared exception hierarchy
