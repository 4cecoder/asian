# Multi-stage build for the Track 3 worker (issue #21).
# Stage 1 resolves/installs dependencies with uv into a relocatable venv.
# Stage 2 copies only the venv + application code onto a slim runtime image.

FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Dependency layer first: pyproject + lock change far less often than app
# code, so this layer stays cached across most rebuilds.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# --- runtime -----------------------------------------------------------------

FROM python:3.13-slim-bookworm AS runtime

LABEL org.opencontainers.image.title="asian-worker" \
      org.opencontainers.image.description="FastAPI worker service (Track 3)"

# Non-root user; the app never needs root at runtime.
RUN groupadd --system --gid 10001 worker \
    && useradd --system --uid 10001 --gid worker --home /app worker

WORKDIR /app

COPY --from=builder --chown=worker:worker /app/.venv /app/.venv
COPY --chown=worker:worker app ./app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER worker

EXPOSE 8000

# No curl/wget on slim: probe with the stdlib instead.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
