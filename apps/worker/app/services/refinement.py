"""Community-submission refinement (ADR 0005).

This module owns two seams of the ingestion pipeline:

- :class:`RefinementPipeline` — the protocol both implementations satisfy.
  :class:`DeterministicNormalizationPipeline` (the default) does
  deterministic cleanup only: trim, collapse whitespace, and validate the
  payload shape against the same per-kind rules the Convex
  ``submitContent`` validator enforces. :class:`LlmRefinementPipeline`
  adds AI refinement over any OpenAI-compatible chat-completions server,
  applying the platform's content rules (orthography, romanization,
  gloss quality, register/level tagging per
  ``docs/knowledge/content-packet-format.md``) under a conservative
  decision policy — anything uncertain lands in ``needsReview``, never
  crashes the loop.
- :class:`ConvexIngestionClient` — thin authenticated client for the
  Convex worker endpoints (``POST /api/worker/claim`` and
  ``POST /api/worker/complete``, see ``apps/web/convex/http.ts``).
"""

from dataclasses import dataclass
import json
from typing import Any, Literal, Protocol

import httpx
from pydantic import BaseModel, ConfigDict, Field, SecretStr, ValidationError
from pydantic.alias_generators import to_camel

from app.core.exceptions import ConfigurationException
from app.core.logging import get_logger
from app.services import prompts

logger = get_logger(__name__)

Outcome = Literal["approved", "needsReview"]


class ClaimedSubmission(BaseModel):
    """One submission handed over by ``POST /api/worker/claim``.

    Field names match the Convex wire format exactly; construct with
    snake_case keyword arguments (``populate_by_name`` is enabled).
    """

    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    submission_id: str
    kind: str
    language: str
    payload: dict[str, Any]


@dataclass(frozen=True)
class RefinementResult:
    """What a pipeline decided about one submission."""

    outcome: Outcome
    ai_notes: str
    refined_payload: dict[str, Any]


class RefinementPipeline(Protocol):
    """Seam for submission refinement.

    Implementations receive an already-claimed submission and must return
    a verdict plus (possibly transformed) payload. The loop treats a
    raised exception as a processing failure: the submission is counted
    in the run summary's ``failed`` bucket and left for the cron sweep to
    release back to pending. Well-behaved implementations catch their
    own recoverable errors and return ``needsReview`` instead of raising.
    """

    async def refine(self, submission: ClaimedSubmission) -> RefinementResult:
        """Judge one claimed submission."""
        ...


# ---------------------------------------------------------------------------
# Deterministic default implementation
# ---------------------------------------------------------------------------

_CORRECTION_TARGETS = frozenset({"dictionaryEntry", "phrase", "card"})

# Per-kind required/optional string fields — mirrors validatePayloadForKind
# in apps/web/convex/submissions.ts so both sides accept exactly the same
# shapes.
_REQUIRED_FIELDS: dict[str, tuple[str, ...]] = {
    "phrase": ("text", "english"),
    "card": ("front", "back"),
    "correction": ("targetType", "targetId", "field", "proposedValue"),
    "exampleSentence": ("sentence", "english"),
}
_OPTIONAL_STRING_FIELDS: dict[str, tuple[str, ...]] = {
    "phrase": ("romanization", "situation"),
    "card": ("notes",),
    "correction": ("reason",),
    "exampleSentence": ("targetHeadword",),
}


def normalize_text(value: str) -> str:
    """Trim and collapse internal whitespace runs to single spaces."""
    return " ".join(value.split())


def _is_nonempty_str(value: Any) -> bool:
    return isinstance(value, str) and len(value.strip()) > 0


def _validate_situation_pack(payload: dict[str, Any]) -> list[str]:
    """Shape rules for situationPack (mirrors the Convex validator)."""
    problems: list[str] = []
    if not _is_nonempty_str(payload.get("situation")):
        problems.append("situationPack requires a non-empty 'situation' string.")
    phrases = payload.get("phrases")
    if not isinstance(phrases, list) or not phrases:
        problems.append("situationPack requires a non-empty 'phrases' array.")
    else:
        for i, phrase in enumerate(phrases):
            if not isinstance(phrase, dict):
                problems.append(f"phrases[{i}] must be an object.")
                continue
            for field_name in ("text", "english"):
                if not _is_nonempty_str(phrase.get(field_name)):
                    problems.append(f"phrases[{i}].{field_name} must be a non-empty string.")
    return problems


def _validate_payload(kind: str, payload: dict[str, Any]) -> list[str]:
    """Return a list of shape problems (empty means valid)."""
    if kind == "situationPack":
        return _validate_situation_pack(payload)

    problems: list[str] = []
    required = _REQUIRED_FIELDS.get(kind)
    if required is None:
        problems.append(f"Unknown submission kind: {kind}")
        return problems

    for field_name in required:
        if not _is_nonempty_str(payload.get(field_name)):
            problems.append(f"'{field_name}' must be a non-empty string.")
    for field_name in _OPTIONAL_STRING_FIELDS.get(kind, ()):
        value = payload.get(field_name)
        if value is not None and not isinstance(value, str):
            problems.append(f"'{field_name}' must be a string when present.")
    if kind == "correction":
        target_type = payload.get("targetType")
        if target_type not in _CORRECTION_TARGETS:
            allowed = ", ".join(sorted(_CORRECTION_TARGETS))
            problems.append(f"'targetType' must be one of: {allowed}.")
    return problems


def _normalize_strings(value: Any) -> Any:
    """Recursively trim/collapse whitespace in every string of the payload."""
    if isinstance(value, str):
        return normalize_text(value)
    if isinstance(value, list):
        return [_normalize_strings(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_strings(item) for key, item in value.items()}
    return value


class DeterministicNormalizationPipeline:
    """Default pipeline: normalize text, validate shape, no LLM calls.

    Approved when the payload matches its declared kind's shape after
    normalization; needsReview otherwise (including unknown kinds).
    Selected whenever ``LLM__ENABLED`` is false — the default — so CI and
    dev environments never make network calls.
    """

    async def refine(self, submission: ClaimedSubmission) -> RefinementResult:
        refined = {key: _normalize_strings(value) for key, value in submission.payload.items()}
        problems = _validate_payload(submission.kind, refined)
        if problems:
            return RefinementResult(
                outcome="needsReview",
                ai_notes=(
                    f"Deterministic check failed for kind '{submission.kind}': "
                    + "; ".join(problems)
                ),
                refined_payload=submission.payload,
            )
        return RefinementResult(
            outcome="approved",
            ai_notes=(
                f"Deterministic normalization passed for kind '{submission.kind}' "
                "(trim + whitespace collapse); no AI refinement applied yet."
            ),
            refined_payload=refined,
        )


# ---------------------------------------------------------------------------
# LLM refinement over an OpenAI-compatible provider
# ---------------------------------------------------------------------------

#: Extra payload keys the LLM may add per kind. Each moves a submission
# toward its content-packet-format entry shape without breaking the
# Convex wire contract (refinedPayload is stored as-is downstream).
_ALLOWED_ENRICHMENT: dict[str, frozenset[str]] = {
    "phrase": frozenset({"register", "level"}),
    "card": frozenset({"reading"}),
    "correction": frozenset({"confidence"}),
    "exampleSentence": frozenset({"register", "level"}),
}

_REGISTER_VALUES = frozenset(prompts.REGISTER_VALUES)

#: Upper bound on LLM notes stored on the submission row.
_NOTES_LIMIT = 600


class LlmRefinementError(Exception):
    """Provider interaction or output parse failed.

    Internal control-flow only: :class:`LlmRefinementPipeline` converts
    every instance into a ``needsReview`` verdict so the ingestion loop
    keeps running through provider outages.
    """

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class LlmVerdict(BaseModel):
    """The JSON object the prompt requires the model to return."""

    model_config = ConfigDict(extra="ignore")

    verdict: Literal["approved", "needsReview"]
    confidence: float = Field(ge=0.0, le=1.0)
    notes: str = ""
    payload: dict[str, Any]


def extract_json_object(content: str) -> dict[str, Any]:
    """Pull one JSON object out of model output, defensively.

    Tries the whole string first, then the span between the first ``{``
    and the last ``}`` — which also recovers objects wrapped in prose or
    markdown fences. Raises :class:`LlmRefinementError` when nothing
    parses into an object.
    """
    text = content.strip()
    candidates = [text]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start : end + 1])
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except ValueError:
            continue
        if isinstance(parsed, dict):
            return parsed
    raise LlmRefinementError("no JSON object found in model output")


def parse_verdict(content: str) -> LlmVerdict:
    """Parse and validate the model's verdict object."""
    parsed = extract_json_object(content)
    try:
        return LlmVerdict.model_validate(parsed)
    except ValidationError as error:
        raise LlmRefinementError(f"verdict failed schema validation: {error}") from error


def _extract_message_content(response: httpx.Response) -> str:
    """Dig the assistant message content out of a chat-completions reply."""
    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError) as error:
        raise LlmRefinementError(f"malformed provider response: {error}") from error
    if not isinstance(content, str):
        raise LlmRefinementError("provider response content is not a string")
    if not content.strip():
        raise LlmRefinementError("provider returned empty content")
    return content


def _clip(text: str, limit: int = _NOTES_LIMIT) -> str:
    return text if len(text) <= limit else text[: limit - 3] + "..."


def sanitize_enrichment(kind: str, payload: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Keep allowed enrichment keys, drop anything else.

    Returns a cleaned copy plus notes naming dropped fields. Allowed keys
    are type-checked: ``register`` must use the packet enum,
    ``confidence`` must be a number in [0, 1], every other enrichment key
    must be a non-empty string. Core submission fields are never touched.
    """
    known_core = set(_REQUIRED_FIELDS.get(kind, ())) | set(_OPTIONAL_STRING_FIELDS.get(kind, ()))
    allowed = _ALLOWED_ENRICHMENT.get(kind, frozenset())
    cleaned = dict(payload)
    dropped: list[str] = []
    for key in sorted(set(cleaned) - known_core):
        value = cleaned[key]
        if key == "register":
            valid = value in _REGISTER_VALUES
        elif key == "confidence":
            valid = isinstance(value, (int, float)) and not isinstance(value, bool)
            valid = valid and 0 <= value <= 1
        else:
            valid = _is_nonempty_str(value)
        if key in allowed and valid:
            continue
        dropped.append(key)
        del cleaned[key]
    return cleaned, dropped


class ChatCompletionsClient:
    """Minimal OpenAI-compatible chat-completions caller.

    Works with any server speaking the ``POST {base_url}/chat/completions``
    dialect: Ollama, LM Studio, vLLM, OpenAI. Requests JSON mode
    (``response_format: {"type": "json_object"}``) — universally supported
    across those servers — and enforces the full verdict schema in
    :func:`parse_verdict` rather than trusting provider-side constraints.
    Sends an ``Authorization`` header only when an API key is configured,
    because local servers reject unknown headers in some strict modes.
    """

    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        api_key: SecretStr | None = None,
        temperature: float = 0.0,
        timeout_seconds: float = 30.0,
        max_output_tokens: int = 0,
    ) -> None:
        self._model = model
        self._temperature = temperature
        self._max_output_tokens = max_output_tokens
        key = api_key.get_secret_value() if api_key else ""
        headers = {"Content-Type": "application/json"}
        if key:
            headers["Authorization"] = f"Bearer {key}"
        self._http = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=timeout_seconds,
            headers=headers,
        )

    async def aclose(self) -> None:
        await self._http.aclose()

    async def complete_json(self, *, system: str, user: str) -> str:
        """Return the assistant message content for one prompt pair."""
        body: dict[str, Any] = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": self._temperature,
            "response_format": {"type": "json_object"},
        }
        if self._max_output_tokens > 0:
            body["max_tokens"] = self._max_output_tokens
        try:
            response = await self._http.post("/chat/completions", json=body)
        except httpx.HTTPError as error:
            raise LlmRefinementError(f"provider unreachable: {error}") from error
        if response.status_code >= 400:
            raise LlmRefinementError(f"provider returned HTTP {response.status_code}")
        return _extract_message_content(response)


class LlmRefinementPipeline:
    """AI refinement behind :class:`RefinementPipeline`, never raising.

    Decision policy (in order — first failure wins):

    1. Unknown submission kind (no field guide) → needsReview without a
       network call.
    2. Provider unreachable / HTTP error / malformed envelope → needsReview.
    3. Model output is not one schema-valid verdict object → needsReview.
    4. Refined payload breaks the kind's shape (same validator as Convex)
       → needsReview; the original payload is preserved for reviewers.
    5. Model says needsReview → needsReview with its notes.
    6. Confidence below ``min_confidence`` → needsReview.
    7. Otherwise approved, carrying the normalized + enriched payload.

    Every needsReview path records why in ``ai_notes`` so a human can act.
    """

    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        api_key: SecretStr | None = None,
        temperature: float = 0.0,
        timeout_seconds: float = 30.0,
        min_confidence: float = 0.7,
        max_output_tokens: int = 0,
    ) -> None:
        self._model = model
        self._min_confidence = min_confidence
        self._client = ChatCompletionsClient(
            base_url=base_url,
            model=model,
            api_key=api_key,
            temperature=temperature,
            timeout_seconds=timeout_seconds,
            max_output_tokens=max_output_tokens,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def refine(self, submission: ClaimedSubmission) -> RefinementResult:
        user_prompt = prompts.build_user_prompt(
            submission.kind, submission.language, submission.payload
        )
        if user_prompt is None:
            # No guide for this kind: fail deterministically instead of
            # spending tokens on output we would reject anyway.
            return RefinementResult(
                outcome="needsReview",
                ai_notes=(
                    f"LLM refinement skipped: unknown submission kind "
                    f"'{submission.kind}' has no refinement guide."
                ),
                refined_payload=submission.payload,
            )

        try:
            content = await self._client.complete_json(
                system=prompts.build_system_prompt(submission.language),
                user=user_prompt,
            )
            verdict = parse_verdict(content)
        except LlmRefinementError as error:
            logger.warning(
                "llm_refinement_failed",
                submission_id=submission.submission_id,
                kind=submission.kind,
                reason=error.reason,
            )
            return RefinementResult(
                outcome="needsReview",
                ai_notes=_clip(f"LLM refinement unavailable ({self._model}): {error.reason}"),
                refined_payload=submission.payload,
            )

        normalized = {key: _normalize_strings(value) for key, value in verdict.payload.items()}
        cleaned, dropped = sanitize_enrichment(submission.kind, normalized)
        problems = _validate_payload(submission.kind, cleaned)
        suffix = f" [dropped unsupported fields: {', '.join(dropped)}]" if dropped else ""

        if problems:
            logger.warning(
                "llm_refinement_rejected_shape",
                submission_id=submission.submission_id,
                kind=submission.kind,
                problems=problems,
            )
            return RefinementResult(
                outcome="needsReview",
                ai_notes=_clip(
                    f"LLM ({self._model}) payload failed shape validation for kind "
                    f"'{submission.kind}': {'; '.join(problems)} Original kept "
                    "for review."
                ),
                refined_payload=submission.payload,
            )

        notes = _clip(verdict.notes)
        confidence_note = f"confidence {verdict.confidence:.2f}"

        if verdict.verdict == "needsReview":
            return RefinementResult(
                outcome="needsReview",
                ai_notes=f"LLM ({self._model}) flagged for review, {confidence_note}: {notes}",
                refined_payload=submission.payload,
            )
        if verdict.confidence < self._min_confidence:
            return RefinementResult(
                outcome="needsReview",
                ai_notes=(
                    f"LLM ({self._model}) suggested approval but {confidence_note} is below "
                    f"threshold {self._min_confidence:.2f}: {notes}"
                ),
                refined_payload=submission.payload,
            )

        logger.info(
            "llm_refinement_approved",
            submission_id=submission.submission_id,
            kind=submission.kind,
            model=self._model,
            confidence=verdict.confidence,
        )
        return RefinementResult(
            outcome="approved",
            ai_notes=(f"LLM ({self._model}) approved, {confidence_note}: {notes}{suffix}"),
            refined_payload=cleaned,
        )


def build_refinement_pipeline(settings: Any) -> RefinementPipeline:
    """Select a pipeline from settings: LLM when enabled, else deterministic.

    Raises :class:`ConfigurationException` when ``LLM__ENABLED`` is true
    but the provider is incompletely configured — an operator asked for
    AI refinement explicitly, so failing loudly beats silently falling
    back to the deterministic pass.
    """
    llm = settings.llm
    if not llm.enabled:
        return DeterministicNormalizationPipeline()
    base_url = (llm.base_url or "").strip()
    model = (llm.model or "").strip()
    missing = [
        name for name, value in (("LLM__BASE_URL", base_url), ("LLM__MODEL", model)) if not value
    ]
    if missing:
        raise ConfigurationException(
            detail="LLM__ENABLED is true but required setting(s) are missing: "
            + ", ".join(missing)
            + "."
        )
    return LlmRefinementPipeline(
        base_url=base_url,
        model=model,
        api_key=llm.api_key,
        temperature=llm.temperature,
        timeout_seconds=llm.timeout_seconds,
        min_confidence=llm.min_confidence,
        max_output_tokens=llm.max_output_tokens,
    )


# ---------------------------------------------------------------------------
# Convex HTTP client
# ---------------------------------------------------------------------------


class ConvexIngestionError(Exception):
    """The Convex worker endpoint rejected or failed a request."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class StaleClaimError(ConvexIngestionError):
    """``complete`` was rejected because our claim no longer holds (HTTP 409).

    Convex answers 409 when the submission is no longer ``processing`` —
    e.g. the hourly cron sweep already released a crashed worker's row back
    to pending and someone else claimed it. The right move for callers is
    to skip the submission, not retry it.
    """


class ConvexIngestionClient:
    """Authenticated client for the Convex worker ingestion endpoints."""

    def __init__(
        self,
        base_url: str,
        secret: str,
        *,
        timeout_seconds: float = 10.0,
        http: httpx.AsyncClient | None = None,
    ) -> None:
        self._secret = secret
        self._http = http or httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            timeout=timeout_seconds,
            headers={"Authorization": f"Bearer {secret}"},
        )

    async def aclose(self) -> None:
        await self._http.aclose()

    async def claim(self, limit: int) -> list[ClaimedSubmission]:
        """Claim up to ``limit`` pending submissions from the queue."""
        response = await self._request(
            "POST",
            "/api/worker/claim",
            json_body={"limit": limit},
        )
        raw = response.json().get("submissions")
        if not isinstance(raw, list):
            raise ConvexIngestionError("Malformed claim response: missing 'submissions'.")
        try:
            return [ClaimedSubmission.model_validate(item) for item in raw]
        except ValueError as error:
            raise ConvexIngestionError(f"Malformed claim response entry: {error}") from error

    async def complete(
        self,
        submission_id: str,
        outcome: Outcome,
        *,
        ai_notes: str | None = None,
        refined_payload: dict[str, Any] | None = None,
    ) -> None:
        """Report the refinement result for one claimed submission."""
        body: dict[str, Any] = {"submissionId": submission_id, "outcome": outcome}
        if ai_notes is not None:
            body["aiNotes"] = ai_notes
        if refined_payload is not None:
            body["refinedPayload"] = refined_payload
        try:
            await self._request("POST", "/api/worker/complete", json_body=body)
        except ConvexIngestionError as error:
            if error.status_code == 409:
                raise StaleClaimError(str(error), status_code=409) from error
            raise

    async def _request(
        self, method: str, path: str, *, json_body: dict[str, Any]
    ) -> httpx.Response:
        try:
            response = await self._http.request(method, path, json=json_body)
        except httpx.HTTPError as error:
            raise ConvexIngestionError(f"Convex endpoint unreachable ({path}): {error}") from error
        if response.status_code >= 400:
            # 409 from /complete means our claim went stale (the row was
            # released/reclaimed between claim and complete); callers use
            # the status to decide whether that is skippable.
            raise ConvexIngestionError(
                f"Convex rejected {method} {path}: HTTP {response.status_code}",
                status_code=response.status_code,
            )
        return response


def build_ingestion_client(settings: Any) -> ConvexIngestionClient:
    """Build a client from settings, refusing incomplete configuration.

    Raises :class:`ConfigurationException` when either the deployment URL
    or the shared secret is missing, so the run endpoint fails loudly
    (503 problem+json) instead of silently doing nothing.
    """
    base_url = (settings.convex.base_url or "").strip()
    secret = settings.convex.worker_secret.get_secret_value()
    values = (("base_url", base_url), ("worker_secret", secret))
    missing = [name for name, value in values if not value]
    if missing:
        raise ConfigurationException(
            detail="Convex ingestion is not configured; missing setting(s): "
            + ", ".join(missing)
            + ". Set CONVEX__BASE_URL and CONVEX__WORKER_SECRET.",
        )
    return ConvexIngestionClient(
        base_url=base_url,
        secret=secret,
        timeout_seconds=settings.convex.timeout_seconds,
    )
