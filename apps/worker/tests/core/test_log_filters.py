"""PII / sensitive-data redaction filter tests (PY-025).

Acceptance per t03-structured-logging: `authorization: "Bearer secret"`
becomes `[REDACTED]` in logs, and masking is recursive.
"""

from app.core.logging import REDACTED, SENSITIVE_KEYS, redact_sensitive_data


def _process(event_dict: dict[str, object]) -> dict[str, object]:
    return dict(redact_sensitive_data(None, "info", event_dict))  # type: ignore[arg-type]


def test_authorization_value_is_masked() -> None:
    result = _process({"authorization": "Bearer secret"})
    assert result["authorization"] == REDACTED


def test_all_spec_keys_are_sensitive() -> None:
    """Every key named by PY-025 masks its value."""
    for key in ("password", "token", "authorization", "api_key", "secret", "access_token"):
        assert key in SENSITIVE_KEYS
        assert _process({key: "leak-me"})[key] == REDACTED


def test_masking_is_case_insensitive() -> None:
    assert _process({"API_KEY": "leak"})["API_KEY"] == REDACTED
    assert _process({"Password": "leak"})["Password"] == REDACTED


def test_non_sensitive_keys_pass_through() -> None:
    event = {"event": "login", "user": "ana", "attempts": 3}
    assert _process(dict(event)) == event


def test_masking_is_recursive_into_nested_dicts() -> None:
    result = _process(
        {
            "request": {
                "headers": {"Authorization": "Bearer abc"},
                "body": {"password": "hunter2", "name": "ana"},
            }
        }
    )
    nested = result["request"]
    assert isinstance(nested, dict)
    headers = nested["headers"]
    body = nested["body"]
    assert isinstance(headers, dict) and isinstance(body, dict)
    assert headers["Authorization"] == REDACTED
    assert body["password"] == REDACTED
    assert body["name"] == "ana"


def test_masking_recurses_into_lists_and_tuples() -> None:
    result = _process({"items": [{"api_key": "k1"}, ({"secret": "x"},)]})
    items = result["items"]
    assert isinstance(items, list)
    first = items[0]
    second = items[1]
    assert isinstance(first, dict) and first["api_key"] == REDACTED
    assert isinstance(second, tuple)
    nested = second[0]
    assert isinstance(nested, dict) and nested["secret"] == REDACTED


def test_bare_values_are_not_key_masking_targets() -> None:
    """Redaction is key-based: plain strings pass through untouched."""
    assert _process({"note": "the secret is out"})["note"] == "the secret is out"
