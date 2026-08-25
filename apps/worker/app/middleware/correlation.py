"""Correlation ID middleware (PY-023).

Extracts an incoming `X-Request-ID` or generates a fresh UUIDv4, stores
it in `request_id_ctx` for the whole request, and echoes it back on the
response header — including on error responses, which is why this is a
pure ASGI middleware rather than `BaseHTTPMiddleware` (an exception
bubbling through `BaseHTTPMiddleware.dispatch` skips its response-header
mutation entirely).
"""

import uuid

from starlette.datastructures import Headers
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.context import request_id_ctx

REQUEST_ID_HEADER = "X-Request-ID"


class CorrelationIdMiddleware:
    """Propagate `X-Request-ID` through the request/response cycle."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = Headers(scope=scope).get(REQUEST_ID_HEADER)
        request_id = incoming or str(uuid.uuid4())
        token = request_id_ctx.set(request_id)

        async def send_with_request_id(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((REQUEST_ID_HEADER.lower().encode(), request_id.encode()))
                message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            request_id_ctx.reset(token)


def current_request_id() -> str:
    """Read the active request ID (empty outside a request)."""
    return request_id_ctx.get()
