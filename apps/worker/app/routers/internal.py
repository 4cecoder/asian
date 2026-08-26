"""Internal ingestion endpoints (not for public traffic).

``GET /internal/ingestion/run`` drives one pass of the community-submission
refinement loop (ADR 0005): claim a batch of pending submissions from
Convex, run each through the :class:`~app.services.refinement.RefinementPipeline`,
and report each outcome back. Deployments gate this route at the ingress
level (localhost / private networks only) — it carries no auth of its own.
"""

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request

from app.core.exceptions import ConfigurationException
from app.core.logging import get_logger
from app.services.refinement import (
    ClaimedSubmission,
    ConvexIngestionClient,
    ConvexIngestionError,
    LlmRefinementPipeline,
    RefinementPipeline,
    RefinementResult,
    StaleClaimError,
    build_ingestion_client,
    build_refinement_pipeline,
)
from app.settings import AppSettings, get_settings

logger = get_logger(__name__)

router = APIRouter(prefix="/internal", tags=["internal"])

#: Module-level default pipeline instance; takes precedence over the
#: settings-driven selection below. Tests (and operators who want to pin
#: one implementation) swap it via ``set_default_pipeline``.
_default_pipeline: RefinementPipeline | None = None


def set_default_pipeline(pipeline: RefinementPipeline) -> None:
    """Replace the process-wide pipeline (wiring point for real AI)."""
    global _default_pipeline  # noqa: PLW0603 - deliberate process-wide seam
    _default_pipeline = pipeline


async def get_pipeline(request: Request) -> AsyncIterator[RefinementPipeline]:
    """Resolve the refinement pipeline from settings.

    ``LLM__ENABLED=true`` selects :class:`LlmRefinementPipeline`, else the
    deterministic default. The LLM implementation owns an HTTP client, so
    this is a yield-dependency that closes it after the request; the
    deterministic pipeline needs no cleanup.
    """
    if _default_pipeline is not None:
        yield _default_pipeline
        return
    pipeline = build_refinement_pipeline(_settings_from_request(request))
    try:
        yield pipeline
    finally:
        if isinstance(pipeline, LlmRefinementPipeline):
            await pipeline.aclose()


def _settings_from_request(request: Request) -> AppSettings:
    """Prefer the app's resolved settings; fall back to the cached global."""
    state_settings = getattr(request.app.state, "settings", None)
    if isinstance(state_settings, AppSettings):
        return state_settings
    return get_settings()


def get_ingestion_client(request: Request) -> ConvexIngestionClient:
    """Build an ingestion client from the app's settings (validates config)."""
    return build_ingestion_client(_settings_from_request(request))


@dataclass
class IngestionRunSummary:
    """Counts for one run pass, mirrored into logs and the response body."""

    claimed: int = 0
    approved: int = 0
    needs_review: int = 0
    failed: int = 0
    skipped_stale_claim: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            "claimed": self.claimed,
            "approved": self.approved,
            "needsReview": self.needs_review,
            "failed": self.failed,
            "skippedStaleClaim": self.skipped_stale_claim,
        }


async def _complete_one(
    client: ConvexIngestionClient,
    submission: ClaimedSubmission,
    result: RefinementResult,
) -> str:
    """Report a refinement result; returns the disposition.

    Raises :class:`ConvexIngestionError` when reporting fails, including
    the skippable stale-claim conflict (409) callers count separately.
    """
    try:
        await client.complete(
            submission.submission_id,
            result.outcome,
            ai_notes=result.ai_notes,
            refined_payload=result.refined_payload,
        )
    except ConvexIngestionError:
        logger.warning(
            "ingestion_complete_rejected",
            submission_id=submission.submission_id,
            outcome=result.outcome,
        )
        raise
    return result.outcome


@router.get("/ingestion/run")
async def run_ingestion(
    request: Request,
    limit: Annotated[int, Query(ge=0, le=100)] = 0,
    pipeline: Annotated[RefinementPipeline, Depends(get_pipeline)] = None,  # type: ignore[assignment]
    client: Annotated[ConvexIngestionClient, Depends(get_ingestion_client)] = None,  # type: ignore[assignment]
) -> dict[str, Any]:
    """Claim up to ``limit`` pending submissions and refine them.

    ``limit=0`` (default) uses ``CONVEX__CLAIM_LIMIT``. Per submission:
    a pipeline that raises counts as ``failed`` (the loop never aborts
    on one bad refinement); a stale claim (Convex answers 409) counts in
    ``skippedStaleClaim``; any other reporting failure counts as
    ``failed``. Both failure modes leave rows in ``processing`` for the
    hourly cron sweep to release back to ``pending`` if truly stuck.
    """
    settings = _settings_from_request(request)
    effective_limit = limit or settings.convex.claim_limit

    try:
        claimed = await client.claim(effective_limit)
    except ConvexIngestionError as error:
        raise ConfigurationException(
            detail=f"Could not claim submissions from Convex: {error}"
        ) from error

    summary = IngestionRunSummary(claimed=len(claimed))
    log = logger.bind(claimed=len(claimed))

    for submission in claimed:
        try:
            result = await pipeline.refine(submission)
        except Exception:
            # A crashing pipeline must not take the batch down; the row
            # stays in processing until the cron sweep releases it.
            summary.failed += 1
            logger.exception(
                "ingestion_refine_crashed",
                submission_id=submission.submission_id,
                kind=submission.kind,
            )
            continue

        try:
            outcome = await _complete_one(client, submission, result)
        except StaleClaimError:
            # Our claim was released (cron sweep) or re-claimed elsewhere
            # between claim and complete. Skip it; the new owner proceeds.
            summary.skipped_stale_claim += 1
            log.info("ingestion_claim_stale", submission_id=submission.submission_id)
            continue
        except ConvexIngestionError:
            summary.failed += 1
            continue

        if outcome == "approved":
            summary.approved += 1
        else:
            summary.needs_review += 1
        log.info(
            "ingestion_submission_processed",
            submission_id=submission.submission_id,
            kind=submission.kind,
            language=submission.language,
            outcome=outcome,
        )

    log.info("ingestion_run_finished", **summary.as_dict())
    return summary.as_dict()
