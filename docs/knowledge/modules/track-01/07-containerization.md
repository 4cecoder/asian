---
id: t01-containerization
title: "Module 7: Containerization & Multi-Stage Docker Architecture"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-066–TASK-075"
status: complete
tags: [docker, bun, uv, dockerfile, trivy, sbom]
related: [t02-dockerfile-architecture, t01-workload-deployments]
---

# Module 7: Containerization & Multi-Stage Docker Architecture

The base Dockerfiles this whole platform runs on: a 3-stage Bun/Next.js
frontend image and a 2-stage `uv`/Python 3.13 FastAPI image, both non-root
with hardened runtime users, plus multi-arch buildx, local Compose dev
stack, Trivy vulnerability scanning, and Syft SBOM generation. Note the
overlap with Track 2 (`[[t02-dockerfile-architecture]]`) which covers the
same Dockerfiles from the CI/CD pipeline angle — this module is the
infra-owned baseline, Track 2 builds automation on top of it.

## Tasks

| ID       | Title                                                                  | Depends on         | Spec (condensed)                                                                                                                                                                                                                                                                    | Acceptance check                                                                                                     |
| -------- | ---------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TASK-066 | Multi-Stage Next.js Production Dockerfile with Bun                     | None               | Create `web/Dockerfile`. Stage 1 `deps`: `oven/bun:1.1-alpine`, `bun install --frozen-lockfile`. Stage 2 `builder`: `bun run build`, standalone output in `.next/standalone`. Stage 3 `runner`: Alpine, non-root user `nodejs` (UID 1001), copies `.next/standalone` and `public/`. | `docker build -t lingo-frontend:prod -f web/Dockerfile ./web` builds with zero errors; image < 180MB.                |
| TASK-067 | Next.js Standalone Output & Asset Optimization Config                  | TASK-066           | Configure `web/next.config.mjs`: `output: "standalone"`, `compress: true`, `poweredByHeader: false`, image optimization domains.                                                                                                                                                    | Standalone `server.js` starts the web server without needing root `node_modules`.                                    |
| TASK-068 | Frontend Non-Root User & Read-Only Root Filesystem Configuration       | TASK-066           | In `web/Dockerfile`: `USER nodejs:nodejs`; mount `/tmp` and `.next/cache` as separate writable tmpfs points.                                                                                                                                                                        | `docker run --read-only --user 1001:1001 lingo-frontend:prod` launches and serves traffic cleanly.                   |
| TASK-069 | Multi-Stage Python 3.13 FastAPI Dockerfile with `uv`                   | None               | Create `api/Dockerfile`. Stage 1 `builder`: `ghcr.io/astral-sh/uv:python3.13-bookworm-slim`, `uv sync --frozen --no-dev`. Stage 2 `runner`: copies `/app/.venv`, non-root user `appuser` (UID 10001), entrypoint `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2`.     | `docker build -t lingo-worker:prod -f api/Dockerfile ./api` succeeds; image < 350MB.                                 |
| TASK-070 | Python Virtualenv Freezing & Minimal Distroless Runner Layer           | TASK-069           | In the builder stage: `uv export --frozen --no-dev --format requirements-txt` for deterministic binary package hashes.                                                                                                                                                              | All Python packages match strict lockfile hashes; no dynamic compile steps in the production runner.                 |
| TASK-071 | Python Worker Non-Root Execution & Ephemeral Cache Mounts              | TASK-069           | In `api/Dockerfile`: drop all root capabilities; mount `/tmp/audio_cache` as a tmpfs volume for temporary speech-chunk processing.                                                                                                                                                  | Container running as non-root processes audio without filesystem permission errors.                                  |
| TASK-072 | Multi-Architecture Buildx Configuration (`linux/amd64`, `linux/arm64`) | TASK-066, TASK-069 | Create `scripts/build-multiarch.sh`: `docker buildx create --use`, build multi-arch manifests for both `web` and `api`.                                                                                                                                                             | `docker buildx imagetools inspect` confirms both `linux/amd64` and `linux/arm64` digests exist in the manifest list. |
| TASK-073 | Local Docker Compose Simulation Linking Frontend and Python API        | TASK-066, TASK-069 | Create `docker-compose.yml`: services `web` (port 3000), `api` (port 8000), `mock-s3`, shared bridge network `lingo-dev-net`.                                                                                                                                                       | `docker compose up -d` boots all services; frontend reaches the Python backend at `http://api:8000`.                 |
| TASK-074 | Container Vulnerability Scanning via Trivy in CI Stage                 | TASK-066, TASK-069 | Create `scripts/scan-images.sh`: `trivy image --severity HIGH,CRITICAL --exit-code 1 .`.                                                                                                                                                                                            | Trivy scan finds 0 CRITICAL vulnerabilities in both production base images.                                          |
| TASK-075 | Software Bill of Materials (SBOM) Generation via Syft                  | TASK-066, TASK-069 | Create `scripts/generate-sbom.sh`: `syft packages docker:` generating SPDX JSON SBOMs `sbom-frontend.json`, `sbom-worker.json`.                                                                                                                                                     | Output SBOM files contain comprehensive license and package inventories.                                             |

## Related packages

- [[t02-dockerfile-architecture]] — same Dockerfiles, viewed from the CI/CD pipeline (Track 2, Sub-Track A).
- [[t01-workload-deployments]] — where these built images get deployed as K8s workloads.
