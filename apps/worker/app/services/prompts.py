"""Prompt construction for the LLM refinement pipeline.

Prompts are pure functions of ``(kind, language, payload)``: no I/O and
no state, so they are trivial to unit-test. The JSON output contract
described here is what
:class:`~app.services.refinement.LlmRefinementPipeline` parses.

Refinement goals mirror ``docs/knowledge/content-packet-format.md``:
orthography normalization, romanization rules per language, natural
English glosses, and register/level tagging using the packet's enums.
Refined payloads keep the submission's own field names (the Convex
``complete`` contract) and may add only the enrichment keys each kind
allows, moving values toward the published packet shapes.
"""

import json
import typing

if typing.TYPE_CHECKING:
    from collections.abc import Mapping

#: Register enum from content-packet-format.md.
REGISTER_VALUES = ("formal", "informal", "neutral")

_ROMANIZATION_RULE = (
    "Revised Romanization for Korean (ko), Hepburn for Japanese (ja), "
    "pinyin with tone marks for Mandarin (zh); leave out when the writing "
    "system makes romanization meaningless"
)

_OUTPUT_CONTRACT = (
    "Respond with EXACTLY ONE JSON object and nothing else - no markdown "
    "fences, no commentary:\n"
    "{\n"
    '  "verdict": "approved" or "needsReview",\n'
    '  "confidence": <number 0.0-1.0, your certainty in the verdict>,\n'
    '  "notes": "<1-2 sentences for the human review queue>",\n'
    '  "payload": { <the refined submission payload, same field names '
    "as the input> }\n"
    "}"
)

_SYSTEM_PROMPT_PREFIX = (
    "You are the refinement engine for a community language-learning "
    "platform (phrasebook, SRS decks, dictionary). You judge and improve "
    "one submission at a time.\n"
    "\n"
    "Goals, in order:\n"
    "1. Orthography: fix spelling, spacing, and punctuation in the learning "
    "language. Preserve meaning; never rewrite style.\n"
    f"2. Romanization: {_ROMANIZATION_RULE}.\n"
    "3. Gloss quality: English text must read as a natural, concise "
    "equivalent, not word-for-word.\n"
    f"4. Register: tag one of {', '.join(REGISTER_VALUES)} where the kind "
    "supports it; infer it from politeness markers.\n"
    "5. Level: learner level tag such as TOPIK-1, JLPT-N5, HSK-3 where the "
    "kind supports it.\n"
    "6. Scenario: reduce situational descriptions to one short lowercase "
    "token (cafe, transit, shopping, emergency).\n"
    "\n"
    "Hard rules:\n"
    '- Keep every input field name inside "payload"; fill empty optional '
    "fields and sharpen values, but never delete fields.\n"
    "- Never invent facts that change what the submission says.\n"
    "- If the submission is unusable (wrong language, gibberish, spam, "
    'unsafe), set verdict to "needsReview".\n'
    "\n"
    f"{_OUTPUT_CONTRACT}"
)

# Per-kind field guidance shown to the model. Keys mirror the submission
# kinds validated by app.services.refinement._validate_payload.
_KIND_FIELD_GUIDES: dict[str, str] = {
    "phrase": (
        'Required: "text" (the phrase), "english" (natural gloss). Optional: '
        '"romanization" (fill or fix it per goal 2), "situation" (replace with '
        'one lowercase scenario token per goal 6). Also add "register" and '
        '"level" per goals 4-5; these feed the published phrase-pack entry.'
    ),
    "card": (
        'Required: "front", "back". Optional: "notes" (usage caveats a learner '
        'benefits from). You may add "reading" (pronunciation or romanization '
        'of "front") when it helps.'
    ),
    "correction": (
        'Required: "targetType", "targetId", "field", "proposedValue". Optional: '
        '"reason". Never change targetId or targetType. Judge whether '
        "proposedValue is linguistically sound for that field; reflect doubt in "
        '"confidence" and strengthen "reason". You may add "confidence" (number '
        "0-1)."
    ),
    "exampleSentence": (
        'Required: "sentence", "english". Optional: "targetHeadword". Fix '
        "grammar and naturalness of the sentence; keep the headword present "
        'when given. Add "register" and "level" per goals 4-5.'
    ),
    "situationPack": (
        'Required: "situation" (one lowercase scenario token per goal 6) and '
        '"phrases" (array of objects with "text" and "english"). Normalize '
        "every phrase; keep array length and order identical."
    ),
}

_GENERIC_FIELD_GUIDE = (
    "Normalize the payload's strings (orthography, spacing) and assess "
    "quality. Keep all field names unchanged."
)


def build_system_prompt(language: str) -> str:
    """System prompt establishing platform refinement goals."""
    return _SYSTEM_PROMPT_PREFIX + f"\n\nSubmission language (BCP-47): {language}"


def build_user_prompt(
    kind: str,
    language: str,
    payload: "Mapping[str, typing.Any]",
) -> str | None:
    """User prompt for one submission, or ``None`` for unknown kinds.

    ``None`` lets the pipeline skip the network entirely for kinds it has
    no field guide for; those land in needsReview deterministically.
    """
    guide = _KIND_FIELD_GUIDES.get(kind)
    if guide is None:
        return None
    return (
        f"Submission kind: {kind}\n"
        f"Learning language: {language}\n"
        f"Field guide: {guide}\n"
        f"Original payload JSON:\n{json.dumps(dict(payload), ensure_ascii=False)}"
    )
