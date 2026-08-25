"""Security headers middleware tests (PY-033).

Every response must carry the full header set from the spec, verbatim.
"""

from app.middleware.security_headers import SECURITY_HEADERS
import httpx
import pytest


async def test_every_response_carries_all_spec_headers(
    client: httpx.AsyncClient,
) -> None:
    for path in ("/healthz", "/readyz", "/livez"):
        response = await client.get(path)
        for header, expected in SECURITY_HEADERS.items():
            assert response.headers.get(header) == expected, f"{path} missing or wrong {header}"


async def test_security_headers_on_error_responses_too(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


def test_header_set_matches_py033_verbatim() -> None:
    assert SECURITY_HEADERS == {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": ("max-age=31536000; includeSubDomains; preload"),
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Content-Security-Policy": (
            "default-src 'self'; img-src 'self' data: https:; media-src 'self' blob: https:;"
        ),
    }


@pytest.mark.parametrize("header", list(SECURITY_HEADERS))
async def test_header_not_duplicated(client: httpx.AsyncClient, header: str) -> None:
    response = await client.get("/healthz")
    assert len(response.headers.get_list(header)) == 1
