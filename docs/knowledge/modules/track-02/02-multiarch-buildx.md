---
id: t02-multiarch-buildx
title: "Sub-Track B: Multi-Arch Buildx, QEMU & Layer Caching Pipelines"
track: "Track 2: Docker Containerization, Multi-Arch Image Pipelines & GitHub Actions CI/CD"
task_range: "TASK-CI-021–TASK-CI-040"
status: complete
tags: [github-actions, buildx, qemu, ghcr, provenance, sbom]
related: [t02-dockerfile-architecture, t02-security-signing]
---

# Sub-Track B: Multi-Arch Buildx, QEMU & Layer Caching Pipelines

Turns the Dockerfiles from Sub-Track A into a GitHub Actions pipeline that
builds `linux/amd64` + `linux/arm64` images: buildx + QEMU setup, GHCR
login, semver/SHA tagging via `docker/metadata-action`, GHA-backed layer
caching (with a GHCR registry fallback), the actual multi-arch build/push
for both services, digest verification and pinning, a reusable composite
action, cross-arch smoke tests, registry pruning, a manual on-demand build
workflow, weekly base-image update monitoring, SLSA provenance/SBOM
attestation, OCI annotations, and build-speed telemetry — capped by one
workflow that wires it all together.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-CI-021 | GitHub Actions Docker Buildx Setup Action | None | Add `docker/setup-buildx-action@v3` to `.github/workflows/build-images.yml`, `driver: docker-container`, custom buildkit config with parallel downloads. | `docker buildx ls \| grep -E "docker-container.*running"` |
| TASK-CI-022 | QEMU Multi-Architecture Emulation Setup Action | TASK-CI-021 | Add `docker/setup-qemu-action@v3`, `platforms: linux/amd64,linux/arm64`. | `cat /proc/sys/fs/binfmt_misc/qemu-aarch64 \| grep "enabled"` |
| TASK-CI-023 | GitHub Container Registry (GHCR) Login Action Configuration | None | Add `docker/login-action@v3`: registry `ghcr.io`, `username: ${{ github.actor }}`, `password: ${{ secrets.GITHUB_TOKEN }}`. | `echo $GITHUB_TOKEN \| docker login ghcr.io -u $ACTOR --password-stdin` succeeds with write access. |
| TASK-CI-024 | Docker Metadata Action for Semantic & Commit SHA Tagging | None | Configure `docker/metadata-action@v5`: `type=semver,pattern={{version}}`, `type=semver,pattern={{major}}.{{minor}}`, `type=sha,prefix=sha-,format=short`, `type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}`. | Action output produces a verified tag-list JSON for branches, PRs, and releases. |
| TASK-CI-025 | GitHub Actions Cache Backend (`type=gha,mode=max`) for Next.js Buildx | TASK-CI-021 | `cache-from: type=gha,scope=nextjs`, `cache-to: type=gha,mode=max,scope=nextjs` on the Next.js buildx step. | Build log shows `CACHED` hits for base/builder stages; rebuild time drops > 70%. |
| TASK-CI-026 | GitHub Actions Cache Backend (`type=gha,mode=max`) for Python UV Buildx | TASK-CI-021 | `cache-from: type=gha,scope=python-worker`, `cache-to: type=gha,mode=max,scope=python-worker` on the Python worker buildx step. | Build log shows a cache hit on `/root/.cache/uv` when `uv.lock` is unchanged. |
| TASK-CI-027 | GHCR Registry-Based Remote Cache Fallback | TASK-CI-023, TASK-CI-025 | Add `cache-from: type=registry,ref=ghcr.io/${{ github.repository }}/cache:nextjs` as a fallback. | Buildx resolves the registry cache manifest with no auth errors when runner cache misses. |
| TASK-CI-028 | Buildx Build & Push Action for Next.js Multi-Arch Image | TASK-CI-021…025 | `docker/build-push-action@v5`: `context: ./web`, `file: ./web/Dockerfile`, `platforms: linux/amd64,linux/arm64`, `push: ${{ github.event_name != 'pull_request' }}`, tags/labels from `meta-web`. | `docker buildx imagetools inspect ghcr.io/<repo>/lingo-frontend:latest` lists both amd64 and arm64 digests. |
| TASK-CI-029 | Buildx Build & Push Action for Python Worker Multi-Arch Image | TASK-CI-021…026 | Same `build-push-action@v5` pattern for `./api`: both platforms, push gated on non-PR events, tags from `meta-api`. | `docker buildx imagetools inspect ghcr.io/<repo>/lingo-worker:latest` shows a pushed multi-arch manifest. |
| TASK-CI-030 | Docker Manifest Inspection & Multi-Platform Digest Extraction | TASK-CI-028, TASK-CI-029 | Post-build step: `docker buildx imagetools inspect --raw`, verify both `linux/amd64` and `linux/arm64` sub-manifests present. | `jq '.manifests \| length' <<< $(docker buildx imagetools inspect --raw)` → `2`; step fails if an arch is missing. |
| TASK-CI-031 | Immutable Image Digest Pinning and Output Parameter Passing | TASK-CI-028, TASK-CI-029 | Capture `steps.build-web.outputs.digest` / `steps.build-api.outputs.digest` as `IMAGE_WEB_DIGEST` / `IMAGE_API_DIGEST` for downstream deploy jobs. | `echo "${{ steps.build-web.outputs.digest }}" \| grep "^sha256:"` — downstream jobs use immutable digests, not mutable tags. |
| TASK-CI-032 | Reusable Composite Action for Docker Buildx Pipeline | TASK-CI-021…031 | Create `.github/actions/build-multiarch-image/action.yml` encapsulating setup-qemu, setup-buildx, login, metadata, build-push, parameterized by `context`, `dockerfile`, `image-name`, `cache-scope`. | Both frontend and backend workflows call this action with no duplicated steps. |
| TASK-CI-033 | Automated Multi-Arch Image Smoke Test Matrix | TASK-CI-028, TASK-CI-029 | Create `.github/workflows/smoke-test-images.yml`: matrix `platform: [linux/amd64, linux/arm64]`, pull the built image, hit `/healthz`, expect 200. | `gh workflow run smoke-test-images.yml` passes on both architectures. |
| TASK-CI-034 | Ephemeral Container Registry Cleanup & Prune Script | TASK-CI-023 | Create `scripts/prune-ghcr-untagged.sh` using the GitHub REST API to delete untagged/dangling image versions older than 14 days. | `bash scripts/prune-ghcr-untagged.sh --dry-run` identifies untagged blobs, leaves semver tags untouched. |
| TASK-CI-035 | Dedicated GitHub Actions Workflow for Manual Multi-Arch Image Build | TASK-CI-032 | Create `.github/workflows/manual-image-build.yml`, `workflow_dispatch` inputs `service` (`web`/`api`/`all`), `tag_override`, `push_to_registry` (bool). | `gh workflow run manual-image-build.yml -f service=web -f tag_override=test-v1` builds and publishes with the custom tag. |
| TASK-CI-036 | Base Image Automatic Security Update Checker Workflow | None | Create `.github/workflows/base-image-monitor.yml`, weekly cron: check Docker Hub/GHCR for new digests of `oven/bun:1-alpine` and `python:3.13-slim-bookworm`, open a PR on update. | Detects an upstream digest change and dispatches a rebuild. |
| TASK-CI-037 | Build Provenance Attestation Generation | TASK-CI-028, TASK-CI-029 | Set `provenance: mode=max` and `sbom: true` in the `build-push-action` steps to generate in-toto build provenance attestations. | `gh attestation verify oci://ghcr.io/<repo>/lingo-frontend:latest --owner <owner>` — SLSA provenance attached to the OCI manifest. |
| TASK-CI-038 | OpenContainer Initiative (OCI) Standard Annotations Injection | TASK-CI-024 | Add OCI annotations to the buildx step: `org.opencontainers.image.source`, `.revision`, `.licenses=MIT`, `.title`. | `docker inspect \| jq '.[0].Config.Labels'` shows the annotations, visible in GHCR's package metadata. |
| TASK-CI-039 | Container Build Speed & Cache Hit Ratio Telemetry Script | TASK-CI-025, TASK-CI-026 | Create `scripts/measure-build-speed.sh`: pull build duration and cache hit/miss stats from GitHub Actions run logs via `gh api`. | `bash scripts/measure-build-speed.sh --run-id <id>` outputs a per-service layer-cache-hit report. |
| TASK-CI-040 | Comprehensive Multi-Arch Image Pipeline CI Workflow | TASK-CI-021…039 | Create `.github/workflows/build-images.yml` unifying metadata, QEMU, buildx, multi-arch build/push, provenance, and digest outputs. | Push to `main` completes the multi-arch build for both services in < 4 minutes. |

## Related packages
- [[t02-dockerfile-architecture]] — the Dockerfiles this pipeline builds.
- [[t02-security-signing]] — scanning and signing layered on top of these built images.
