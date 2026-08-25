"""FastAPI application factory.

Run locally with:

    uv run uvicorn app.main:app --reload
"""

from fastapi import FastAPI

from app.core.error_handlers import register_exception_handlers
from app.core.lifespan import lifespan
from app.core.logging import setup_logging
from app.middleware import setup_middleware
from app.routers.health import router as health_router
from app.settings import AppSettings, get_settings


def create_app(settings: AppSettings | None = None) -> FastAPI:
    """Build a fully wired application instance."""
    resolved = settings or get_settings()
    setup_logging(environment=resolved.environment, debug=resolved.debug)

    app = FastAPI(
        title=resolved.project_name,
        version=resolved.version,
        lifespan=lifespan,
        docs_url="/docs" if resolved.environment != "production" else None,
    )
    setup_middleware(app, resolved)
    register_exception_handlers(app)
    app.include_router(health_router)
    return app


app = create_app()
