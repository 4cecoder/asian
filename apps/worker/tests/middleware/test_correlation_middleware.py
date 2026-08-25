"""Correlation ID middleware tests (PY-023)."""

import uuid

import httpx


async def test_missing_header_gets_generated_uuidv4(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/healthz")
    request_id = response.headers["X-Request-ID"]
    # Must parse as a UUID, and be a v4 (random) variant.
    parsed = uuid.UUID(request_id)
    assert parsed.version == 4


async def test_existing_header_is_preserved(client: httpx.AsyncClient) -> None:
    incoming = "01234567-89ab-cdef-0123-456789abcdef"
    response = await client.get("/healthz", headers={"X-Request-ID": incoming})
    assert response.headers["X-Request-ID"] == incoming


async def test_each_request_without_header_gets_a_fresh_id(
    client: httpx.AsyncClient,
) -> None:
    first = (await client.get("/healthz")).headers["X-Request-ID"]
    second = (await client.get("/healthz")).headers["X-Request-ID"]
    assert first != second
