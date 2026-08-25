"""Unhandled-exception handler tests (PY-055).

Acceptance: unhandled errors return HTTP 500 with an `error_id` tied to
the request trace, and never leak stack traces to the client.
"""

from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.routing import APIRouter
import httpx
import pytest
from tests.conftest import ClientFactory

router = APIRouter()


def _include_router(app: object) -> None:
    assert isinstance(app, FastAPI)
    app.include_router(router)


@router.get("/boom")
async def boom() -> None:
    msg = "secret internal detail: db password is hunter2"
    raise RuntimeError(msg)


@pytest.fixture
async def client(
    make_client: ClientFactory,
) -> AsyncIterator[httpx.AsyncClient]:
    # ServerErrorMiddleware re-raises after sending its response, so the
    # transport must not propagate it into the test.
    async with make_client(_include_router, raise_app_exceptions=False) as http:
        yield http


async def test_unhandled_error_returns_500_problem_json(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/boom")
    assert response.status_code == 500
    assert response.headers["content-type"] == "application/problem+json"

    body = response.json()
    assert body["title"] == "Internal Server Error"
    assert body["status"] == 500
    assert body["instance"] == "/boom"


async def test_error_id_present_for_correlation(
    client: httpx.AsyncClient,
) -> None:
    body = (await client.get("/boom")).json()
    assert "Error ID:" in body["detail"]
    error_id = body["detail"].rsplit("Error ID: ", 1)[-1]
    assert len(error_id) == 36  # UUID shape


async def test_no_stack_trace_or_internal_detail_leaks(
    client: httpx.AsyncClient,
) -> None:
    raw = (await client.get("/boom")).text
    assert "RuntimeError" not in raw
    assert "Traceback" not in raw
    assert "hunter2" not in raw


async def test_request_id_echoed_on_handled_errors(client: httpx.AsyncClient) -> None:
    """Correlation middleware wraps the ExceptionMiddleware handlers.

    Handled errors (404s, AppException subclasses) are normalized inside
    the user-middleware stack, so they carry the X-Request-ID echo. A
    truly unhandled exception is caught by Starlette's
    ServerErrorMiddleware, which sits OUTSIDE every user middleware by
    design -- its 500 body therefore cannot carry the echo header; the
    request_id still reaches the log line via request_id_ctx.
    """
    response = await client.get("/does-not-exist", headers={"X-Request-ID": "req-404"})
    assert response.status_code == 404
    assert response.headers["X-Request-ID"] == "req-404"
