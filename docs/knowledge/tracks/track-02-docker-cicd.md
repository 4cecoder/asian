---
id: track-02-docker-cicd
title: "Track 2: Docker Containerization, Multi-Arch Image Pipelines & GitHub Actions CI/CD"
track: "Track 2 of 10"
task_range: "TASK-CI-001–TASK-CI-100"
status: complete
tags: [k8s, moc, docker, cicd]
related: [t02-dockerfile-architecture, t02-multiarch-buildx, t02-security-signing, t02-ci-quality-gates, t02-cd-rollout-rollbacks]
---

# Track 2: Docker Containerization, Multi-Arch Image Pipelines & GitHub Actions CI/CD

100 tasks (TASK-CI-001–TASK-CI-100) building the full CI/CD pipeline on
top of Track 1's infrastructure: from writing the production Dockerfiles
through multi-arch builds, security scanning and Cosign signing, PR
quality gates, to staged rollout with automated rollback and canary
promotion. Fully present in the source spec, organized into 5 sub-tracks
of 20 tasks each — no gaps.

## Sub-tracks

1. [[t02-dockerfile-architecture]] (A) — staged Bun/Next.js and uv/Python Dockerfiles, health endpoints, Hadolint, local Compose (TASK-CI-001–020).
2. [[t02-multiarch-buildx]] (B) — buildx/QEMU, GHCR auth, tagging, GHA layer caching, multi-arch push, provenance/SBOM attestation (TASK-CI-021–040).
3. [[t02-security-signing]] (C) — Trivy scanning, SARIF upload, SBOM generation, Cosign keyless signing, Kyverno policy, Gitleaks, dependency audits (TASK-CI-041–060).
4. [[t02-ci-quality-gates]] (D) — path filtering, frontend/backend lint+typecheck+tests, Codecov, Convex schema check, Playwright E2E, bundle budget, commitlint (TASK-CI-061–080).
5. [[t02-cd-rollout-rollbacks]] (E) — GitHub Environments, staging/prod Kustomize, rollout+auto-rollback, canary analysis, release notes, master pipeline validator (TASK-CI-081–100).

## Overlap note
Sub-track A's Dockerfiles cover the same artifacts as Track 1's
[[t01-containerization]] module — the two packages describe the same
files from different ownership angles (CI/CD build-out vs. infra
baseline). Build the Dockerfile once; both packages' acceptance criteria
should hold against it.
