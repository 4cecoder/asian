"""Kubernetes health probe routes (PY-092..PY-094 minimal slice)."""

from typing import Any

from fastapi import APIRouter, Request, Response, status

from app.schemas.errors import ProblemDetails, utc_now
from app.services.health import run_dependency_checks
from app.settings import get_settings

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    """Shallow liveness check: no dependency calls, always cheap."""
    settings = get_settings()
    return {"status": "ok", "timestamp": utc_now().isoformat(), "version": settings.version}


@router.get("/readyz")
async def readyz(request: Request, response: Response) -> dict[str, Any]:
    """Readiness: run registered dependency checks concurrently."""
    state = request.app.state
    if getattr(state, "is_shutting_down", False):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unhealthy", "checks": {}, "reason": "shutting_down"}

    checkers = getattr(state, "dependency_checkers", [])
    all_healthy, details = await run_dependency_checks(checkers)
    if not all_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    checks = {
        name: {"status": result.status, "latency_ms": round(result.latency_ms, 3)}
        for name, result in details.items()
    }
    overall = "ok" if all_healthy else "unhealthy"
    return {"status": overall, "checks": checks}


@router.get("/livez")
async def livez(request: Request, response: Response) -> dict[str, str] | ProblemDetails:
    """Startup gate: 503 until lifespan warmup finishes."""
    state = request.app.state
    warmed_up = getattr(state, "is_warmed_up", False)
    shutting_down = getattr(state, "is_shutting_down", False)
    if not warmed_up or shutting_down:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ProblemDetails(title="Service Unavailable", status=503)
    return {"status": "ok"}
