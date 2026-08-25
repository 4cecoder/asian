"""Authentication/authorization handler tests (PY-058)."""

from collections.abc import AsyncIterator

from app.core.exceptions import AuthenticationException, AuthorizationException
from fastapi import FastAPI
from fastapi.routing import APIRouter
import httpx
import pytest
from tests.conftest import ClientFactory

router = APIRouter()


def _include_router(app: object) -> None:
    assert isinstance(app, FastAPI)
    app.include_router(router)


@router.get("/private")
async def private() -> None:
    raise AuthenticationException("missing or invalid token")


@router.get("/admin")
async def admin() -> None:
    raise AuthorizationException("role 'admin' required")


@pytest.fixture
async def client(
    make_client: ClientFactory,
) -> AsyncIterator[httpx.AsyncClient]:
    async with make_client(_include_router) as http:
        yield http


async def test_authentication_returns_401_with_bearer_challenge(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/private")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.headers["content-type"] == "application/problem+json"

    body = response.json()
    assert body["error_code"] == "AUTHENTICATION_FAILED"
    assert body["status"] == 401


async def test_authorization_returns_403(client: httpx.AsyncClient) -> None:
    response = await client.get("/admin")
    assert response.status_code == 403
    assert response.headers["content-type"] == "application/problem+json"

    body = response.json()
    assert body["error_code"] == "AUTHORIZATION_FAILED"
    assert body["detail"] == "role 'admin' required"
