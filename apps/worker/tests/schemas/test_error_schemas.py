"""RFC 7807/9457 ProblemDetails schema tests (PY-051)."""

import json

from app.schemas.errors import InvalidParam, ProblemDetails, utc_now


def test_minimal_problem_serializes_rfc7807_members() -> None:
    problem = ProblemDetails(title="Not Found", status=404)
    data = json.loads(problem.model_dump_json())
    assert data["type"] == "about:blank"
    assert data["title"] == "Not Found"
    assert data["status"] == 404
    assert "timestamp" in data


def test_full_problem_with_invalid_params() -> None:
    problem = ProblemDetails(
        title="Validation Error",
        status=422,
        detail="One or more request fields failed validation.",
        instance="/items",
        error_code="VALIDATION_ERROR",
        invalid_params=[
            InvalidParam(field="limit", reason="not a valid integer", rejected_value="abc")
        ],
    )
    data = problem.model_dump(mode="json")
    assert data["instance"] == "/items"
    assert data["error_code"] == "VALIDATION_ERROR"
    assert data["invalid_params"][0]["field"] == "limit"


def test_timestamp_defaults_to_utc_now() -> None:
    before = utc_now()
    assert ProblemDetails(title="x", status=400).timestamp >= before


def test_nullables_default_to_none() -> None:
    data = ProblemDetails(title="x", status=400).model_dump()
    assert data["detail"] is None
    assert data["instance"] is None
    assert data["error_code"] is None
    assert data["invalid_params"] is None
