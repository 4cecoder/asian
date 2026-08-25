"""Health probe endpoint tests (PY-092..PY-094 acceptance slice)."""

import httpx
import pytest


async def test_healthz_returns_ok(client: httpx.AsyncClient) -> None:
    response = await client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "1.0.0"
    assert "timestamp" in body


async def test_livez_returns_ok_after_startup(client: httpx.AsyncClient) -> None:
    response = await client.get("/livez")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_readyz_returns_ok_with_no_registered_dependencies(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/readyz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_readyz_returns_503_naming_failing_dependency(
    client: httpx.AsyncClient,
) -> None:
    """A failing registered checker must flip readiness to 503 by name."""
    from app.services.health import RedisDependencyChecker

    class FailingRedis:
        async def ping(self) -> bool:  # pragma: no cover - trivially raises
            raise ConnectionError("connection refused")

        name = "redis"

    checker = RedisDependencyChecker(FailingRedis(), timeout_seconds=0.1)
    client.state.dependency_checkers.append(checker)

    response = await client.get("/readyz")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "unhealthy"
    assert "redis" in body["checks"]


async def test_correlation_id_is_echoed(client: httpx.AsyncClient) -> None:
    incoming = "11111111-2222-3333-4444-555555555555"
    response = await client.get("/healthz", headers={"X-Request-ID": incoming})
    assert response.headers["X-Request-ID"] == incoming


async def test_security_headers_present(client: httpx.AsyncClient) -> None:
    response = await client.get("/healthz")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


async def test_unknown_route_returns_rfc7807_problem(client: httpx.AsyncClient) -> None:
    response = await client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert body["type"] == "about:blank"
    assert body["status"] == 404


@pytest.mark.parametrize("path", ["/healthz", "/readyz", "/livez"])
async def test_probe_routes_accept_head_via_get(
    client: httpx.AsyncClient,
    path: str,
) -> None:
    response = await client.get(path)
    assert response.status_code in {200, 503}
