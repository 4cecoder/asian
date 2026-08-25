"""Request-scoped context variables (PY-022 minimal slice)."""

from contextvars import ContextVar

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
user_id_ctx: ContextVar[str] = ContextVar("user_id", default="")
tenant_id_ctx: ContextVar[str] = ContextVar("tenant_id", default="")
