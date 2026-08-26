"""Typed application settings (PY-005..PY-010 minimal slice).

Reads configuration from environment variables and an optional `.env`
file. Secrets are `SecretStr`, so they never leak through `repr` or log
lines.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "staging", "production"]

_DEV_SECRET_KEY = "dev-insecure-secret-key-0123456789abcdef"


class ServerSettings(BaseModel):
    """HTTP server / network configuration."""

    host: str = "0.0.0.0"
    port: int = Field(default=8000, ge=1024, le=65535)
    workers: int = Field(default=2, ge=1)
    reload: bool = False
    keep_alive_timeout: int = 65


class SecuritySettings(BaseModel):
    """Security, CORS, and crypto key configuration."""

    secret_key: SecretStr = SecretStr(_DEV_SECRET_KEY)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: list[AnyHttpUrl] = []
    cors_allow_credentials: bool = True

    @model_validator(mode="after")
    def _require_strong_secret_in_production(self) -> "SecuritySettings":
        return self


class ConvexSettings(BaseModel):
    """Convex ingestion endpoints (community pipeline, ADR 0005).

    ``base_url`` is the deployment's **HTTP-actions host**:
    ``https://<deployment>.convex.site`` (queries/mutations use
    ``.convex.cloud``; httpActions do not). ``worker_secret`` must match
    the deployment's ``WORKER_SECRET`` env var (set via
    ``bunx convex env set``, per SECURITY.md — never committed).
    """

    base_url: str = ""
    worker_secret: SecretStr = SecretStr("")
    #: Max submissions claimed and refined in one /internal/ingestion/run pass.
    claim_limit: int = Field(default=25, ge=1, le=100)
    timeout_seconds: float = Field(default=10.0, gt=0)


class AppSettings(BaseSettings):
    """Root settings model for the worker service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",
        extra="ignore",
    )

    environment: Environment = "development"
    debug: bool = False
    project_name: str = "asian-worker"
    version: str = "1.0.0"

    # Connection scaffolding flags. The lifespan only opens a Redis pool
    # when this is enabled, so the scaffold runs green with no external
    # services present. PY-008's full ServiceSettings block replaces this
    # once the sibling domain lands.
    redis_enabled: bool = False
    redis_url: str = "redis://localhost:6379/0"

    server: ServerSettings = ServerSettings()
    security: SecuritySettings = SecuritySettings()
    convex: ConvexSettings = ConvexSettings()

    @model_validator(mode="after")
    def _require_strong_secret_in_production(self) -> "AppSettings":
        if self.environment == "production":
            key = self.security.secret_key.get_secret_value()
            if len(key) < 32 or key == _DEV_SECRET_KEY:
                raise ValueError(
                    "SECURITY__SECRET_KEY must be a real value of at least "
                    "32 characters when ENVIRONMENT=production"
                )
            if not self.convex.worker_secret.get_secret_value():
                raise ValueError("CONVEX__WORKER_SECRET must be set when ENVIRONMENT=production")
        return self


@lru_cache
def get_settings() -> AppSettings:
    """Return the cached settings singleton.

    Tests override it via ``get_settings.cache_clear()`` plus environment
    variables set before the first call.
    """
    return AppSettings()
