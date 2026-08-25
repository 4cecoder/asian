"""Security headers middleware (PY-033 minimal slice)."""

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": (
        "default-src 'self'; img-src 'self' data: https:; media-src 'self' blob: https:;"
    ),
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add the standard security headers to every response."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            if header not in response.headers:
                response.headers[header] = value
        return response
