---
id: t03-api-routing-openapi
title: "Domain 8: API Versioning, Routing Topology & OpenAPI 3.1 Engine"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-071–PY-080"
status: complete
tags: [python, fastapi, openapi, routing]
related: [t03-dependency-injection, t03-exception-architecture]
---

# Domain 8: API Versioning, Routing Topology & OpenAPI 3.1 Engine

The `/api/v1` router tree (SRS, TTS, STT, roleplay, phrasebook, decks) and a
customized OpenAPI 3.1 schema generator that produces predictable operation
IDs, documented error responses, offline-rendered docs, and deprecation
headers for the eventual TypeScript SDK generator.

## Tasks

| ID     | Title                                       | Depends on     | Spec (condensed)                                                                                                                                                                                                                    | Acceptance check                                                                                                                     |
| ------ | ------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| PY-071 | `/api/v1` root router aggregator            | PY-061         | Create `api_v1_router = APIRouter(prefix="/api/v1")` in `app/api/v1/__init__.py`. Include domain sub-routers with consistent tags/prefixes.                                                                                         | Mounting the root router exposes all v1 routes under `/api/v1/*`. `uv run pytest tests/api/v1/test_router_aggregation.py`.           |
| PY-072 | Modular sub-router registration             | PY-071         | Register `/api/v1/srs` (Spaced Repetition), `/api/v1/tts` (Moonshot TTS), `/api/v1/stt` (Speech Recognition), `/api/v1/roleplay` (AI Travel Roleplay), `/api/v1/phrasebook` (Travel Phrasebook), `/api/v1/decks` (Flashcard Decks). | All sub-routers register without path collisions. `uv run pytest tests/api/v1/test_subrouters.py`.                                   |
| PY-073 | Deterministic operation ID generator        | PY-071         | `custom_generate_unique_id(route) -> str` returns `{tags[0]}_{name}` (e.g. `SpacedRepetition_submit_review`).                                                                                                                       | Operation IDs are clean, unique, predictable for TS SDK generation. `uv run pytest tests/core/test_operation_ids.py`.                |
| PY-074 | OpenAPI 3.1 metadata & docs customization   | PY-005, PY-073 | Custom `app.openapi()` producing OpenAPI 3.1.0 with description, contact, license, servers list, tag groups.                                                                                                                        | `GET /openapi.json` returns a valid OpenAPI 3.1 schema. `uv run pytest tests/core/test_openapi_schema.py`.                           |
| PY-075 | Security schemes in OpenAPI                 | PY-074         | Inject `components.securitySchemes` for `HTTPBearer` and `APIKeyHeader`.                                                                                                                                                            | Swagger UI shows an Authorize button for both Bearer JWT and API Key. `uv run pytest tests/core/test_openapi_security.py`.           |
| PY-076 | Global error response docs in OpenAPI       | PY-051, PY-074 | Attach standard `ProblemDetails` responses (400, 401, 403, 404, 422, 429, 500, 502) to every documented endpoint.                                                                                                                   | Every endpoint in Swagger UI shows structured error models. `uv run pytest tests/core/test_openapi_errors.py`.                       |
| PY-077 | Offline Swagger UI & Redoc endpoints        | PY-074         | Custom `/docs` and `/redoc` routes serving local static JS/CSS bundles — no external CDN.                                                                                                                                           | `/docs` and `/redoc` render fully offline. `uv run pytest tests/routers/test_docs_routes.py`.                                        |
| PY-078 | OpenAPI schema export CLI                   | PY-074         | `scripts/export_openapi.py` dumps the current schema to `openapi.json` for frontend `openapi-typescript` generation.                                                                                                                | `uv run python scripts/export_openapi.py` writes a formatted `openapi.json`. `python scripts/export_openapi.py --check`.             |
| PY-079 | Route deprecation & Sunset headers          | PY-071         | `@deprecated_route(sunset_date="2027-01-01", alternative="/api/v2/...")` decorator injecting `Deprecation: true` and `Sunset` headers.                                                                                              | Deprecated routes return RFC 8594 `Sunset` headers and show `deprecated` in OpenAPI. `uv run pytest tests/core/test_deprecation.py`. |
| PY-080 | Routing & OpenAPI contract validation suite | PY-071–PY-079  | Suite validating every registered route against the OpenAPI schema.                                                                                                                                                                 | No undocumented routes, no schema mismatches. `uv run pytest tests/api/test_openapi_contract.py`.                                    |

## Related packages

- [[t03-dependency-injection]] — DI is wired into every route mounted here
- [[t03-exception-architecture]] — `ProblemDetails` schema documented via PY-076
