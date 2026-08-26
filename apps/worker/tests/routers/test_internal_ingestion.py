"""Tests for GET /internal/ingestion/run (respx-mocked Convex)."""

import json

from app.settings import AppSettings
from httpx import Response
import pytest
import respx

BASE_URL = "https://test-deployment.convex.cloud"


def _configured_settings() -> AppSettings:
    return AppSettings(
        convex={
            "base_url": BASE_URL,
            "worker_secret": "secret-value",
            "claim_limit": 10,
        }
    )


def _claimed_body(*ids: str) -> dict:
    return {
        "submissions": [
            {
                "submissionId": i,
                "kind": "phrase",
                "language": "ko",
                "payload": {"text": f"  text {i} ", "english": f"english {i}"},
            }
            for i in ids
        ]
    }


@respx.mock
async def test_run_happy_path_approves_and_completes(make_client) -> None:  # type: ignore[no-untyped-def]
    settings = _configured_settings()
    claim_route = respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(200, json=_claimed_body("s1", "s2"))
    )
    complete_route = respx.post(f"{BASE_URL}/api/worker/complete").mock(
        return_value=Response(200, json={"success": True})
    )

    async with make_client(settings=settings) as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 200
    assert response.json() == {
        "claimed": 2,
        "approved": 2,
        "needsReview": 0,
        "failed": 0,
        "skippedStaleClaim": 0,
    }
    assert claim_route.call_count == 1
    # Default limit=0 -> settings claim_limit is sent to Convex.
    assert json.loads(claim_route.calls.last.request.content) == {"limit": 10}
    # The deterministic pipeline normalized before completing.
    first_complete = json.loads(complete_route.calls[0].request.content)
    assert first_complete["submissionId"] == "s1"
    assert first_complete["outcome"] == "approved"
    assert first_complete["refinedPayload"]["text"] == "text s1"
    assert complete_route.call_count == 2


@respx.mock
async def test_run_reports_invalid_payload_as_needs_review(make_client) -> None:  # type: ignore[no-untyped-def]
    settings = _configured_settings()
    respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(
            200,
            json={
                "submissions": [
                    {
                        "submissionId": "bad",
                        "kind": "card",
                        "language": "ja",
                        "payload": {"front": ""},  # missing back
                    }
                ]
            },
        )
    )
    complete_route = respx.post(f"{BASE_URL}/api/worker/complete").mock(
        return_value=Response(200, json={"success": True})
    )

    async with make_client(settings=settings) as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 200
    assert response.json()["needsReview"] == 1
    body = json.loads(complete_route.calls.last.request.content)
    assert body["outcome"] == "needsReview"
    assert "card" in body["aiNotes"]


@respx.mock
async def test_run_skips_stale_claim_and_finishes_batch(make_client) -> None:  # type: ignore[no-untyped-def]
    """A 409 on the first completion doesn't abort the rest of the batch."""
    settings = _configured_settings()
    respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(200, json=_claimed_body("stale", "fresh"))
    )
    complete_route = respx.route(url=f"{BASE_URL}/api/worker/complete").mock(
        side_effect=[
            Response(409, json={"error": "not processing anymore"}),
            Response(200, json={"success": True}),
        ]
    )

    async with make_client(settings=settings) as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 200
    assert response.json() == {
        "claimed": 2,
        "approved": 1,
        "needsReview": 0,
        "failed": 0,
        "skippedStaleClaim": 1,
    }
    assert complete_route.call_count == 2


async def test_run_503_problem_when_secret_missing(make_client) -> None:  # type: ignore[no-untyped-def]
    """Incomplete Convex config fails loudly as RFC 7807 503."""
    respx.post(f"{BASE_URL}/api/worker/claim").mock(return_value=Response(200, json={}))

    async with make_client() as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 503
    assert response.headers["content-type"] == "application/problem+json"
    problem = response.json()
    assert problem["error_code"] == "CONFIGURATION_INCOMPLETE"
    assert "CONVEX__WORKER_SECRET" in problem["detail"]
    # Nothing was claimed.
    assert not any(route.called for route in respx.mock.routes)


def test_production_settings_require_worker_secret() -> None:
    with pytest.raises(ValueError, match="CONVEX__WORKER_SECRET"):
        AppSettings(
            environment="production",
            security={"secret_key": "x" * 40},
        )


@respx.mock
async def test_pipeline_seam_is_swappable(make_client) -> None:  # type: ignore[no-untyped-def]
    """The run endpoint honors whatever pipeline get_pipeline returns."""
    from app.routers.internal import get_pipeline
    from app.services.refinement import RefinementResult

    class CountingPipeline:
        def __init__(self) -> None:
            self.calls: list[object] = []

        async def refine(self, submission: object) -> RefinementResult:
            self.calls.append(submission)
            raise AssertionError("no submissions were claimed")

    settings = _configured_settings()
    respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(200, json=_claimed_body())
    )  # empty batch

    counting = CountingPipeline()

    def _wire_pipeline(app: object) -> None:
        app.dependency_overrides[get_pipeline] = lambda: counting  # type: ignore[attr-defined]

    async with make_client(_wire_pipeline, settings=settings) as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 200
    assert response.json()["claimed"] == 0
    assert counting.calls == []


# ---------------------------------------------------------------------------
# LLM-enabled wiring and crash-proofing
# ---------------------------------------------------------------------------

LLM_BASE_URL = "http://llm.test/v1"
LLM_CHAT_URL = f"{LLM_BASE_URL}/chat/completions"


def _llm_settings(**llm_overrides: object) -> AppSettings:
    llm = {"enabled": True, "base_url": LLM_BASE_URL, "model": "test-model"}
    llm.update(llm_overrides)
    return AppSettings(
        convex={"base_url": BASE_URL, "worker_secret": "secret-value"},
        llm=llm,
    )


def _approved_verdict() -> dict:
    return {
        "verdict": "approved",
        "confidence": 0.95,
        "notes": "Clean submission.",
        "payload": {
            "text": "안녕하세요",
            "english": "hello",
            "romanization": "annyeonghaseyo",
            "register": "formal",
        },
    }


@respx.mock
async def test_llm_enabled_wires_llm_pipeline_end_to_end(make_client) -> None:  # type: ignore[no-untyped-def]
    """Enabled settings route submissions through the LLM pipeline."""
    respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(
            200,
            json={
                "submissions": [
                    {
                        "submissionId": "s1",
                        "kind": "phrase",
                        "language": "ko",
                        "payload": {"text": " 안녕하세요 ", "english": "hello"},
                    }
                ]
            },
        )
    )
    respx.post(LLM_CHAT_URL).mock(
        return_value=Response(
            200,
            json={"choices": [{"message": {"content": json.dumps(_approved_verdict())}}]},
        )
    )
    complete_route = respx.post(f"{BASE_URL}/api/worker/complete").mock(
        return_value=Response(200, json={"success": True})
    )

    async with make_client(settings=_llm_settings()) as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 200
    assert response.json()["approved"] == 1
    body = json.loads(complete_route.calls.last.request.content)
    assert body["outcome"] == "approved"
    # LLM-refined values + packet-shape enrichment reached Convex.
    assert body["refinedPayload"]["text"] == "안녕하세요"
    assert body["refinedPayload"]["romanization"] == "annyeonghaseyo"
    assert body["refinedPayload"]["register"] == "formal"
    assert "test-model" in body["aiNotes"]


@respx.mock
async def test_llm_disabled_uses_deterministic_fallback(make_client) -> None:  # type: ignore[no-untyped-def]
    """Explicitly disabled LLM never calls the provider, even when configured."""
    respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(200, json=_claimed_body("s1"))
    )
    llm_route = respx.post(LLM_CHAT_URL).mock(return_value=Response(500))
    complete_route = respx.post(f"{BASE_URL}/api/worker/complete").mock(
        return_value=Response(200, json={"success": True})
    )

    async with make_client(settings=_llm_settings(enabled=False)) as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 200
    assert not llm_route.called
    body = json.loads(complete_route.calls.last.request.content)
    assert body["outcome"] == "approved"
    assert "no AI refinement applied" in body["aiNotes"]


@respx.mock
async def test_crashing_pipeline_counts_failed_and_batch_continues(make_client) -> None:  # type: ignore[no-untyped-def]
    """A pipeline exception on one submission never aborts the batch."""
    from app.routers.internal import get_pipeline
    from app.services.refinement import ClaimedSubmission, RefinementResult

    class FlakyPipeline:
        async def refine(self, submission: object) -> RefinementResult:
            assert isinstance(submission, ClaimedSubmission)
            if submission.submission_id == "boom":
                raise RuntimeError("refiner exploded")
            return RefinementResult(
                outcome="approved",
                ai_notes="fine",
                refined_payload=submission.payload,
            )

    settings = _configured_settings()
    respx.post(f"{BASE_URL}/api/worker/claim").mock(
        return_value=Response(200, json=_claimed_body("boom", "ok"))
    )
    complete_route = respx.post(f"{BASE_URL}/api/worker/complete").mock(
        return_value=Response(200, json={"success": True})
    )

    def _wire(app: object) -> None:
        app.dependency_overrides[get_pipeline] = lambda: FlakyPipeline()  # type: ignore[attr-defined]

    async with make_client(_wire, settings=settings, raise_app_exceptions=False) as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 200
    assert response.json() == {
        "claimed": 2,
        "approved": 1,
        "needsReview": 0,
        "failed": 1,
        "skippedStaleClaim": 0,
    }
    # Only the healthy submission was reported back.
    assert complete_route.call_count == 1
    assert json.loads(complete_route.calls.last.request.content)["submissionId"] == "ok"


@respx.mock
async def test_enabled_but_incomplete_llm_config_returns_503_problem(make_client) -> None:  # type: ignore[no-untyped-def]
    """Explicitly enabling the LLM without provider config fails loudly."""
    respx.post(f"{BASE_URL}/api/worker/claim").mock(return_value=Response(200, json={}))

    async with make_client(settings=_llm_settings(base_url="")) as http:
        response = await http.get("/internal/ingestion/run")

    assert response.status_code == 503
    problem = response.json()
    assert problem["error_code"] == "CONFIGURATION_INCOMPLETE"
    assert "LLM__BASE_URL" in problem["detail"]
