"""Tests for the Convex ingestion HTTP client (respx-mocked)."""

import json

from app.services.refinement import (
    ClaimedSubmission,
    ConvexIngestionClient,
    ConvexIngestionError,
    StaleClaimError,
)
from httpx import Response
import pytest
import respx

BASE_URL = "https://test-deployment.convex.cloud"
SECRET = "worker-secret-value"


def _client() -> ConvexIngestionClient:
    return ConvexIngestionClient(base_url=BASE_URL, secret=SECRET, timeout_seconds=5.0)


@respx.mock
async def test_claim_sends_bearer_secret_and_parses_submissions() -> None:
    route = respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(
            200,
            json={
                "submissions": [
                    {
                        "submissionId": "abc123",
                        "kind": "phrase",
                        "language": "ko",
                        "payload": {"text": " 감사합니다 ", "english": "thanks"},
                    }
                ]
            },
        )
    )
    client = _client()
    try:
        claimed = await client.claim(10)
    finally:
        await client.aclose()

    assert route.called
    request = route.calls.last.request
    assert request.headers["Authorization"] == f"Bearer {SECRET}"
    assert json.loads(request.content) == {"limit": 10}
    assert claimed == [
        ClaimedSubmission(
            submission_id="abc123",
            kind="phrase",
            language="ko",
            payload={"text": " 감사합니다 ", "english": "thanks"},
        )
    ]


@respx.mock
async def test_complete_posts_camel_case_body() -> None:
    route = respx.post(f"{BASE_URL}/api/worker/complete").mock(
        return_value=Response(200, json={"success": True})
    )
    client = _client()
    try:
        await client.complete(
            "abc123",
            "approved",
            ai_notes="normalized",
            refined_payload={"text": "감사합니다", "english": "thanks"},
        )
    finally:
        await client.aclose()

    body = json.loads(route.calls.last.request.content)
    assert body == {
        "submissionId": "abc123",
        "outcome": "approved",
        "aiNotes": "normalized",
        "refinedPayload": {"text": "감사합니다", "english": "thanks"},
    }


@respx.mock
async def test_stale_claim_conflict_raises_skippable_error() -> None:
    """HTTP 409 from /complete maps to StaleClaimError (claim no longer holds)."""
    respx.post(f"{BASE_URL}/api/worker/complete").mock(
        return_value=Response(
            409,
            json={"error": 'Expected status "processing" to finish processing.'},
        )
    )
    client = _client()
    try:
        with pytest.raises(StaleClaimError) as exc_info:
            await client.complete("abc123", "approved")
    finally:
        await client.aclose()
    assert exc_info.value.status_code == 409


@respx.mock
async def test_other_http_errors_raise_base_error() -> None:
    respx.post(f"{BASE_URL}/api/worker/claim").mock(return_value=Response(500))
    client = _client()
    try:
        with pytest.raises(ConvexIngestionError) as exc_info:
            await client.claim(5)
    finally:
        await client.aclose()
    assert not isinstance(exc_info.value, StaleClaimError)
    assert exc_info.value.status_code == 500


@respx.mock
async def test_malformed_claim_payload_raises() -> None:
    respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(200, json={"submissions": [{"bogus": True}]})
    )
    client = _client()
    try:
        with pytest.raises(ConvexIngestionError, match="Malformed"):
            await client.claim(5)
    finally:
        await client.aclose()
