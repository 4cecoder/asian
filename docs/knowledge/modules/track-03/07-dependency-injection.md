---
id: t03-dependency-injection
title: "Domain 7: Dependency Injection Framework & Security Primitives"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-061–PY-070"
status: complete
tags: [python, fastapi, auth, jwt, rbac, security]
related: [t03-scaffolding-settings, t03-exception-architecture, t03-api-routing-openapi]
---

# Domain 7: Dependency Injection Framework & Security Primitives

Typed FastAPI dependencies for storage, auth (JWT + API key), RBAC scopes,
HMAC webhook verification, pagination/sorting, and idempotency-key replay
protection — the reusable building blocks every route composes from.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| PY-061 | Core dependency registry & type aliases | PY-010 | Create `app/api/deps.py`: `SettingsDep`, `HttpClientDep`, `RedisDep` as `Annotated[..., Depends(...)]` type aliases. | Typed dependencies resolve cleanly in endpoint signatures. `uv run pytest tests/api/test_deps.py -k test_core_deps`. |
| PY-062 | Async S3/cloud storage client dependency | PY-061 | `get_storage_client(settings: SettingsDep) -> AsyncStorageClient`, injecting the configured S3/R2 client. | Injects an active client with presigned-URL and byte-upload capability. `uv run pytest tests/api/test_deps.py -k test_storage_dep`. |
| PY-063 | Bearer JWT validator & identity injector | PY-007, PY-061 | `oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")`. `get_current_user(token, settings) -> UserIdentity` decodes JWT, verifies signature/expiry, extracts `sub` and roles. | Valid JWT returns `UserIdentity`; expired/invalid JWT raises 401. `uv run pytest tests/api/test_deps_auth.py -k test_jwt_validator`. |
| PY-064 | API key header/query security dependency | PY-061 | `api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)`; `verify_api_key(...)`. | Valid key grants access; missing/invalid key raises 401. `uv run pytest tests/api/test_deps_auth.py -k test_api_key_validator`. |
| PY-065 | Scoped RBAC dependency factory | PY-063 | `require_roles(required_roles: list[str])` returns a dependency verifying `current_user.roles` covers the requirement. | Insufficient role raises 403. `uv run pytest tests/api/test_deps_auth.py -k test_rbac_factory`. |
| PY-066 | HMAC webhook signature verification | PY-061 | `verify_hmac_signature(request, x_signature, settings)` computes `hmac.new(secret, body, sha256).hexdigest()`, checks with `hmac.compare_digest`. | Tampered payload/invalid signature → 401; valid signature passes. `uv run pytest tests/api/test_deps_security.py -k test_hmac_verifier`. |
| PY-067 | Standard pagination query params | PY-061 | `PaginationParams(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100))`, with an `offset` helper. | Page/size out of bounds → 422. `uv run pytest tests/api/test_deps_pagination.py`. |
| PY-068 | Standard sorting & filter query params | PY-061 | `SortingParams(allowed_fields)` factory parsing `sort_by=created_at&order=asc\|desc`. | Disallowed sort fields → validation error; valid fields parse into a sort tuple. `uv run pytest tests/api/test_deps_sorting.py`. |
| PY-069 | Idempotency key validator (`Idempotency-Key`) | PY-013, PY-061 | `require_idempotency_key(idempotency_key: Header, redis)`. If the key was already processed, return the cached response from Redis directly. | Replayed requests with the same key return the cached response without re-executing. `uv run pytest tests/api/test_idempotency.py`. |
| PY-070 | DI mocking harness for unit testing | PY-061–PY-069 | Test harness for clean `app.dependency_overrides` across all auth/DB/storage dependencies. | Overrides swap cleanly during tests, reset cleanly in teardown. `uv run pytest tests/fixtures/test_dep_overrides.py`. |

## Related packages
- [[t03-scaffolding-settings]] — `SecuritySettings` feeds JWT/HMAC config
- [[t03-exception-architecture]] — auth deps raise `AuthenticationException`/`AuthorizationException`
- [[t03-api-routing-openapi]] — these dependencies are wired into `/api/v1` routes
