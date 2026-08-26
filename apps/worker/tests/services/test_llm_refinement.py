"""Tests for LlmRefinementPipeline (respx-mocked OpenAI-compatible server).

No test here touches a real network: every case either mocks
``POST {base}/chat/completions`` via respx or never issues a request.
"""

import json

from app.core.exceptions import ConfigurationException
from app.services.refinement import (
    ClaimedSubmission,
    DeterministicNormalizationPipeline,
    LlmRefinementError,
    LlmRefinementPipeline,
    build_refinement_pipeline,
    extract_json_object,
    sanitize_enrichment,
)
from app.settings import AppSettings
from httpx import ConnectError, Response
import pytest
import respx

BASE_URL = "http://llm.test/v1"
CHAT_URL = f"{BASE_URL}/chat/completions"
MODEL = "test-model"


def _pipeline(min_confidence: float = 0.7) -> LlmRefinementPipeline:
    return LlmRefinementPipeline(
        base_url=BASE_URL,
        model=MODEL,
        min_confidence=min_confidence,
        timeout_seconds=5.0,
    )


def _submission(kind: str = "phrase", payload: dict | None = None) -> ClaimedSubmission:
    return ClaimedSubmission(
        submission_id="sub_1",
        kind=kind,
        language="ko",
        payload=payload or {"text": " 감사합니다 ", "english": "thank you"},
    )


def _verdict(**overrides: object) -> str:
    body = {
        "verdict": "approved",
        "confidence": 0.93,
        "notes": "Orthography fine; romanization corrected.",
        "payload": {
            "text": "감사합니다",
            "english": "thank you",
            "romanization": "gamsahamnida",
            "register": "formal",
            "level": "TOPIK-1",
        },
    }
    body.update(overrides)
    return json.dumps(body, ensure_ascii=False)


def _chat_response(content: str) -> Response:
    return Response(
        200,
        json={"choices": [{"index": 0, "message": {"role": "assistant", "content": content}}]},
    )


class TestExtractJsonObject:
    def test_plain_object_parses(self) -> None:
        assert extract_json_object('{"a": 1}') == {"a": 1}

    def test_fenced_and_surrounded_text_recovered(self) -> None:
        text = 'Sure! Here you go:\n```json\n{"verdict": "approved"}\n```\nDone.'
        assert extract_json_object(text) == {"verdict": "approved"}

    def test_garbage_raises(self) -> None:
        with pytest.raises(LlmRefinementError, match="no JSON object"):
            extract_json_object("this is not json at all")

    def test_non_object_json_raises(self) -> None:
        with pytest.raises(LlmRefinementError):
            extract_json_object("[1, 2, 3]")


class TestSanitizeEnrichment:
    def test_allowed_enrichment_kept_for_phrase(self) -> None:
        payload = {"text": "t", "english": "e", "register": "formal", "level": "TOPIK-1"}
        cleaned, dropped = sanitize_enrichment("phrase", payload)
        assert cleaned == payload
        assert dropped == []

    def test_disallowed_and_invalid_keys_dropped(self) -> None:
        payload = {
            "text": "t",
            "english": "e",
            "hallucinated": "x",  # not in allowlist
            "register": "polite",  # allowed key, invalid enum value
            "level": "",  # allowed key, empty string
        }
        cleaned, dropped = sanitize_enrichment("phrase", payload)
        assert cleaned == {"text": "t", "english": "e"}
        assert dropped == ["hallucinated", "level", "register"]

    def test_correction_confidence_must_be_number_in_range(self) -> None:
        base = {"targetType": "phrase", "targetId": "x", "field": "f", "proposedValue": "v"}
        _, dropped_bad = sanitize_enrichment("correction", {**base, "confidence": 3.0})
        cleaned_good, dropped_none = sanitize_enrichment("correction", {**base, "confidence": 0.5})
        assert dropped_bad == ["confidence"]
        assert dropped_none == []
        assert cleaned_good["confidence"] == 0.5


class TestLlmPipelineHappyPath:
    @respx.mock
    async def test_high_confidence_verdict_is_approved(self) -> None:
        route = respx.post(CHAT_URL).mock(return_value=_chat_response(_verdict()))
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())
        await pipeline.aclose()

        assert route.called
        assert result.outcome == "approved"
        # Enrichment toward the phrase-pack entry shape survives.
        assert result.refined_payload["text"] == "감사합니다"
        assert result.refined_payload["romanization"] == "gamsahamnida"
        assert result.refined_payload["register"] == "formal"
        assert MODEL in result.ai_notes
        assert "0.93" in result.ai_notes

    @respx.mock
    async def test_request_sends_model_messages_and_json_mode(self) -> None:
        route = respx.post(CHAT_URL).mock(return_value=_chat_response(_verdict()))
        pipeline = _pipeline()
        await pipeline.refine(_submission())
        await pipeline.aclose()

        body = json.loads(route.calls.last.request.content)
        assert body["model"] == MODEL
        assert body["response_format"] == {"type": "json_object"}
        assert [m["role"] for m in body["messages"]] == ["system", "user"]
        assert "ko" in body["messages"][0]["content"]  # language in system prompt
        assert "Submission kind: phrase" in body["messages"][1]["content"]
        # No API key configured -> no Authorization header.
        assert "authorization" not in route.calls.last.request.headers

    @respx.mock
    async def test_api_key_is_sent_as_bearer(self) -> None:
        from pydantic import SecretStr

        route = respx.post(CHAT_URL).mock(return_value=_chat_response(_verdict()))
        keyed = LlmRefinementPipeline(base_url=BASE_URL, model=MODEL, api_key=SecretStr("sk-test"))
        await keyed.refine(_submission())
        await keyed.aclose()

        assert route.calls.last.request.headers["Authorization"] == "Bearer sk-test"

    @respx.mock
    async def test_max_output_tokens_omitted_unless_configured(self) -> None:
        default_route = respx.post(CHAT_URL).mock(return_value=_chat_response(_verdict()))
        pipeline = _pipeline()
        await pipeline.refine(_submission())
        await pipeline.aclose()
        assert "max_tokens" not in json.loads(default_route.calls.last.request.content)

        capped_route = respx.post(CHAT_URL).mock(return_value=_chat_response(_verdict()))
        capped = LlmRefinementPipeline(base_url=BASE_URL, model=MODEL, max_output_tokens=512)
        await capped.refine(_submission())
        await capped.aclose()
        assert json.loads(capped_route.calls.last.request.content)["max_tokens"] == 512

    @respx.mock
    async def test_fenced_markdown_output_still_parsed(self) -> None:
        fenced = f"Here is my assessment:\n```json\n{_verdict()}\n```"
        respx.post(CHAT_URL).mock(return_value=_chat_response(fenced))
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())
        await pipeline.aclose()

        assert result.outcome == "approved"


class TestLlmPipelineFailurePaths:
    """Every failure mode lands in needsReview without raising."""

    @respx.mock
    async def test_malformed_llm_json_lands_in_needs_review(self) -> None:
        respx.post(CHAT_URL).mock(return_value=_chat_response("I think it looks good!"))
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())

        assert result.outcome == "needsReview"
        assert MODEL in result.ai_notes
        assert "unavailable" in result.ai_notes.lower()
        # Original payload preserved untouched for human reviewers.
        assert result.refined_payload == {"text": " 감사합니다 ", "english": "thank you"}

    @respx.mock
    async def test_schema_invalid_verdict_lands_in_needs_review(self) -> None:
        bad = json.dumps({"verdict": "maybe", "confidence": 2.5})
        respx.post(CHAT_URL).mock(return_value=_chat_response(bad))
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())

        assert result.outcome == "needsReview"
        assert result.refined_payload == _submission().payload

    @respx.mock
    async def test_unreachable_provider_lands_in_needs_review(self) -> None:
        respx.post(CHAT_URL).mock(side_effect=ConnectError("connection refused"))
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())

        assert result.outcome == "needsReview"
        assert "unreachable" in result.ai_notes.lower()
        assert result.refined_payload == _submission().payload

    @respx.mock
    async def test_provider_http_error_lands_in_needs_review(self) -> None:
        respx.post(CHAT_URL).mock(return_value=Response(500))
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())

        assert result.outcome == "needsReview"
        assert "500" in result.ai_notes

    @respx.mock
    async def test_malformed_provider_envelope_lands_in_needs_review(self) -> None:
        respx.post(CHAT_URL).mock(return_value=Response(200, json={"choices": []}))
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())

        assert result.outcome == "needsReview"

    @respx.mock
    async def test_low_confidence_approval_lands_in_needs_review(self) -> None:
        respx.post(CHAT_URL).mock(return_value=_chat_response(_verdict(confidence=0.42)))
        pipeline = _pipeline(min_confidence=0.7)

        result = await pipeline.refine(_submission())

        assert result.outcome == "needsReview"
        assert "0.42" in result.ai_notes
        assert "threshold" in result.ai_notes

    @respx.mock
    async def test_llm_needs_review_verdict_passes_through_with_notes(self) -> None:
        respx.post(CHAT_URL).mock(
            return_value=_chat_response(
                _verdict(verdict="needsReview", confidence=0.9, notes="Looks like spam.")
            )
        )
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())

        assert result.outcome == "needsReview"
        assert "spam" in result.ai_notes

    @respx.mock
    async def test_shape_breaking_refined_payload_lands_in_needs_review(self) -> None:
        # Model dropped a required field while refining.
        broken = _verdict(payload={"text": "감사합니다"})
        respx.post(CHAT_URL).mock(return_value=_chat_response(broken))
        pipeline = _pipeline()

        result = await pipeline.refine(_submission())

        assert result.outcome == "needsReview"
        assert "shape validation" in result.ai_notes
        assert result.refined_payload == _submission().payload

    async def test_unknown_kind_skips_the_network_entirely(self) -> None:
        with respx.mock:
            route = respx.post(CHAT_URL).mock(return_value=_chat_response(_verdict()))
            pipeline = _pipeline()
            result = await pipeline.refine(_submission(kind="mysteryKind", payload={"a": "b"}))
            await pipeline.aclose()

        assert not route.called
        assert result.outcome == "needsReview"
        assert "unknown submission kind" in result.ai_notes


class TestBuildRefinementPipelineSelection:
    def test_disabled_selects_deterministic_pipeline(self) -> None:
        settings = AppSettings(llm={"enabled": False})
        selected = build_refinement_pipeline(settings)
        assert isinstance(selected, DeterministicNormalizationPipeline)

    def test_enabled_without_provider_config_fails_loudly(self) -> None:
        settings = AppSettings(llm={"enabled": True})  # no base_url / model
        with pytest.raises(ConfigurationException, match="LLM__BASE_URL"):
            build_refinement_pipeline(settings)

    def test_enabled_with_config_selects_llm_pipeline(self) -> None:
        settings = AppSettings(llm={"enabled": True, "base_url": BASE_URL, "model": MODEL})
        selected = build_refinement_pipeline(settings)
        assert isinstance(selected, LlmRefinementPipeline)
