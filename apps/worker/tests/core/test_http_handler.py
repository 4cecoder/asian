"""Starlette HTTPException -> ProblemDetails normalization tests (PY-054)."""

import httpx


async def test_unknown_route_returns_uniform_problem(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"

    body = response.json()
    assert body["status"] == 404
    assert body["instance"] == "/does-not-exist"
    assert body["type"] == "about:blank"
    assert isinstance(body["title"], str) and body["title"]
    assert "timestamp" in body


async def test_method_not_allowed_is_normalized(client: httpx.AsyncClient) -> None:
    response = await client.delete("/healthz")
    assert response.status_code == 405
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["status"] == 405
