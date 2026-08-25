"""RequestValidationError -> RFC 7807 handler tests (PY-053)."""

from collections.abc import AsyncIterator

from fastapi import FastAPI, Query
from fastapi.routing import APIRouter
import httpx
import pytest
from tests.conftest import ClientFactory

router = APIRouter()


def _include_router(app: object) -> None:
    assert isinstance(app, FastAPI)
    app.include_router(router)


@router.get("/items")
async def list_items(limit: int = Query(default=10, ge=1, le=100)) -> dict[str, int]:
    return {"limit": limit}


@pytest.fixture
async def client(
    make_client: ClientFactory,
) -> AsyncIterator[httpx.AsyncClient]:
    async with make_client(_include_router) as http:
        yield http


async def test_invalid_param_returns_422_problem_json(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/items", params={"limit": "not-a-number"})
    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json", (
        "validation errors must be application/problem+json (RFC 7807)"
    )

    body = response.json()
    # RFC 7807 mandatory members.
    assert body["type"] == "about:blank"
    assert body["title"] == "Validation Error"
    assert body["status"] == 422
    assert body["instance"] == "/items"
    assert "timestamp" in body


async def test_invalid_params_list_shape(client: httpx.AsyncClient) -> None:
    response = await client.get("/items", params={"limit": "nope"})
    (param,) = response.json()["invalid_params"]
    assert param["field"] == "query.limit"
    assert isinstance(param["reason"], str) and param["reason"]
    assert param["rejected_value"] == "nope"


async def test_out_of_range_value_is_rejected_with_field_path(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/items", params={"limit": 0})
    assert response.status_code == 422
    (param,) = response.json()["invalid_params"]
    assert param["field"] == "query.limit"


async def test_valid_request_still_succeeds(client: httpx.AsyncClient) -> None:
    response = await client.get("/items", params={"limit": 5})
    assert response.status_code == 200
    assert response.json() == {"limit": 5}
