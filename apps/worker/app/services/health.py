"""Health check service and checker protocol (PY-091..PY-095 minimal slice).

Sibling domain t03-health-probes-testing replaces this with the full
readiness engine (S3/storage checkers, parallel fan-out with a 2s budget).
"""

import asyncio
from dataclasses import dataclass, field
import time
from typing import Any, Literal, Protocol

HealthStatus = Literal["healthy", "unhealthy", "degraded"]


@dataclass(frozen=True)
class HealthCheckResult:
    status: HealthStatus
    details: dict[str, str] = field(default_factory=dict)
    latency_ms: float = 0.0


class DependencyChecker(Protocol):
    """Anything that can answer one health question about one dependency."""

    name: str

    async def check(self) -> HealthCheckResult: ...


class RedisDependencyChecker:
    """Ping Redis within a bounded timeout (PY-095)."""

    name = "redis"

    def __init__(self, redis_client: Any, timeout_seconds: float = 0.5) -> None:
        self._redis_client = redis_client
        self._timeout_seconds = timeout_seconds

    async def check(self) -> HealthCheckResult:
        started = time.perf_counter_ns()
        try:
            ping = self._redis_client.ping
            await asyncio.wait_for(ping(), timeout=self._timeout_seconds)
        except Exception as exc:  # noqa: BLE001 - any failure means unhealthy
            return HealthCheckResult(
                status="unhealthy",
                details={"reason": type(exc).__name__},
                latency_ms=(time.perf_counter_ns() - started) / 1_000_000,
            )
        return HealthCheckResult(
            status="healthy",
            latency_ms=(time.perf_counter_ns() - started) / 1_000_000,
        )


async def run_dependency_checks(
    checkers: list[DependencyChecker],
) -> tuple[bool, dict[str, HealthCheckResult]]:
    """Run all checkers concurrently; return overall health and per-check detail."""
    if not checkers:
        return True, {}
    results = await asyncio.gather(*(checker.check() for checker in checkers))
    details = {checker.name: result for checker, result in zip(checkers, results, strict=True)}
    all_healthy = all(result.status == "healthy" for result in details.values())
    return all_healthy, details
