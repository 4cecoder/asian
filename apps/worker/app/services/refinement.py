"""Community-submission refinement (ADR 0005).

This module owns two seams of the ingestion pipeline:

- :class:`RefinementPipeline` — the protocol the real LLM refinement
  (Tracks 4-6) will implement. The default implementation,
  :class:`DeterministicNormalizationPipeline`, does deterministic cleanup
  only: trim, collapse whitespace, and validate the payload shape against
  the same per-kind rules the Convex ``submitContent`` validator enforces.
  No LLM calls live here yet by design.
- :class:`ConvexIngestionClient` — thin authenticated client for the
  Convex worker endpoints (``POST /api/worker/claim`` and
  ``POST /api/worker/complete``, see ``apps/web/convex/http.ts``).
"""

from dataclasses import dataclass
from typing import Any, Literal, Protocol

import httpx
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.core.exceptions import ConfigurationException

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
    """Seam for the future AI refinement pass (Tracks 4-6).

    Implementations receive an already-claimed submission and must return
    a verdict plus (possibly transformed) payload. Anything that raises is
    treated as a processing failure by the caller and left for the cron
    sweep to release back to pending.
    """

    def refine(self, submission: ClaimedSubmission) -> RefinementResult:
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
    normalization; needsReview otherwise (including unknown kinds). The
    real semantic refinement replaces this class behind the same protocol.
    """

    def refine(self, submission: ClaimedSubmission) -> RefinementResult:
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
