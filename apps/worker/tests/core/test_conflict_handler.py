"""Conflict handler test (PY-057)."""

from collections.abc import AsyncIterator

from app.core.exceptions import ConflictException, ExternalServiceException
from fastapi import FastAPI
from fastapi.routing import APIRouter
import httpx
import pytest
from tests.conftest import ClientFactory

router = APIRouter()


def _include_router(app: object) -> None:
    assert isinstance(app, FastAPI)
    app.include_router(router)


@router.post("/decks")
async def create_deck() -> None:
    raise ConflictException("deck title already exists")


@router.get("/upstream")
async def upstream() -> None:
    raise ExternalServiceException("tts provider refused connection")


@pytest.fixture
async def client(
    make_client: ClientFactory,
) -> AsyncIterator[httpx.AsyncClient]:
    async with make_client(_include_router) as http:
        yield http


async def test_conflict_returns_409_with_spec_error_code(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post("/decks")
    assert response.status_code == 409
    assert response.headers["content-type"] == "application/problem+json"

    body = response.json()
    assert body["error_code"] == "RESOURCE_ALREADY_EXISTS"
    assert body["detail"] == "deck title already exists"


async def test_external_service_maps_to_502(client: httpx.AsyncClient) -> None:
    response = await client.get("/upstream")
    assert response.status_code == 502
    assert response.json()["error_code"] == "UPSTREAM_UNAVAILABLE"
