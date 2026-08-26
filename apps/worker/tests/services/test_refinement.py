"""Unit tests for the deterministic refinement pipeline."""

from app.services.refinement import (
    ClaimedSubmission,
    DeterministicNormalizationPipeline,
    RefinementResult,
)
import pytest

pipeline = DeterministicNormalizationPipeline()


def _submission(kind: str, payload: dict) -> ClaimedSubmission:
    return ClaimedSubmission(submission_id="sub_1", kind=kind, language="ko", payload=payload)


class TestNormalization:
    def test_trims_and_collapses_whitespace_in_string_fields(self) -> None:
        result = pipeline.refine(
            _submission("phrase", {"text": "  감사합니다\n\n 하습니다  ", "english": "thank   you"})
        )
        assert result.outcome == "approved"
        assert result.refined_payload["text"] == "감사합니다 하습니다"
        assert result.refined_payload["english"] == "thank you"

    def test_normalizes_nested_situation_pack_phrases(self) -> None:
        result = pipeline.refine(
            _submission(
                "situationPack",
                {
                    "situation": " at a  cafe ",
                    "phrases": [{"text": " 아이스  아메리카노 ", "english": "iced americano"}],
                },
            )
        )
        assert result.outcome == "approved"
        assert result.refined_payload["situation"] == "at a cafe"
        assert result.refined_payload["phrases"][0]["text"] == "아이스 아메리카노"

    @pytest.mark.parametrize(
        ("kind", "payload"),
        [
            ("phrase", {"text": "x", "english": "y"}),
            ("card", {"front": "f", "back": "b", "notes": None}),
            (
                "correction",
                {
                    "targetType": "dictionaryEntry",
                    "targetId": "abc",
                    "field": "definition",
                    "proposedValue": "better",
                },
            ),
            ("exampleSentence", {"sentence": "s", "english": "e"}),
        ],
    )
    def test_valid_kinds_are_approved(self, kind: str, payload: dict) -> None:
        result = pipeline.refine(_submission(kind, payload))
        assert result.outcome == "approved"
        assert isinstance(result, RefinementResult)
        assert "no AI refinement applied yet" in result.ai_notes


class TestValidation:
    @pytest.mark.parametrize(
        ("kind", "payload"),
        [
            ("phrase", {"text": "", "english": "y"}),  # empty required field
            ("card", {"front": "f"}),  # missing back
            (
                "correction",
                {  # bad targetType
                    "targetType": "user",
                    "targetId": "abc",
                    "field": "f",
                    "proposedValue": "v",
                },
            ),
            ("exampleSentence", {"sentence": "s"}),  # missing english
            ("situationPack", {"situation": "s", "phrases": []}),  # empty phrases
            ("situationPack", {"phrases": [{"text": "t", "english": "e"}]}),  # no situation
            ("mysteryKind", {"anything": True}),  # unknown kind entirely
        ],
    )
    def test_invalid_payloads_land_in_needs_review_unchanged(
        self, kind: str, payload: dict
    ) -> None:
        result = pipeline.refine(_submission(kind, payload))
        assert result.outcome == "needsReview"
        # The original payload is preserved untouched for human reviewers.
        assert result.refined_payload == payload
        assert kind in result.ai_notes
