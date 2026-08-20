---
id: t02-ci-quality-gates
title: "Sub-Track D: CI Quality Gates, Linting, Typecheck & Testing"
track: "Track 2: Docker Containerization, Multi-Arch Image Pipelines & GitHub Actions CI/CD"
task_range: "TASK-CI-061–TASK-CI-080"
status: complete
tags: [github-actions, eslint, ruff, mypy, pytest, playwright, codecov]
related: [t02-security-signing, t02-cd-rollout-rollbacks]
---

# Sub-Track D: CI Quality Gates, Linting, Typecheck & Testing

The PR-time quality gate: concurrency auto-cancellation, monorepo path
filtering so unrelated jobs skip, Bun/uv environment setup, frontend
ESLint + strict `tsc` + unit tests, backend ruff + strict mypy + pytest
(>85% coverage), Codecov PR commenting, Convex schema dry-run validation,
seed-dataset schema tests, Playwright install/caching + E2E matrix +
HTML report upload, a client-bundle-size budget check, Conventional
Commits linting, and a branch-protection audit script — merged into one
consolidated PR workflow.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-CI-061 | Concurrency Grouping & Auto-Cancellation for Outdated PR Runs | None | Add to every workflow: `concurrency: { group: "${{ github.workflow }}-${{ github.ref }}", cancel-in-progress: "${{ github.event_name == 'pull_request' }}" }`. | Pushing two rapid commits to an open PR cancels the first run's in-flight jobs. |
| TASK-CI-062 | Monorepo Path Filtering with `dorny/paths-filter` | None | Add `dorny/paths-filter@v3` with filters: `web: ["web/","packages/","package.json","bun.lockb"]`, `api: ["api/**","pyproject.toml","uv.lock"]`, `k8s: ["k8s/","volterra/"]`. | PR touching only `web/` skips the `api` job, and vice versa. |
| TASK-CI-063 | Bun Dependency Setup & Lockfile Freezing Action | None | Add `oven-sh/setup-bun@v2` (`bun-version: latest`); `bun install --frozen-lockfile` in `web/`. | `cd web && bun install --frozen-lockfile` completes < 5s with runner cache. |
| TASK-CI-064 | Next.js ESLint & Code Style Verification Job | TASK-CI-063 | Job `frontend-lint`: `bun run lint` (ESLint 9 flat config, Next.js core-web-vitals + React rules). | `cd web && bun run lint` fails on unhandled lint errors/unused imports. |
| TASK-CI-065 | TypeScript Strict Typechecking Job for Next.js | TASK-CI-063 | Job `frontend-typecheck`: `bun x tsc --noEmit` under `strict: true` in `tsconfig.json`. | `cd web && bun x tsc --noEmit` exits 0, zero TS errors. |
| TASK-CI-066 | Frontend Unit & Component Tests Job with Coverage | TASK-CI-063 | Job `frontend-unit-tests`: `bun test --coverage` covering React UI components, audio controller, review hooks. | `cd web && bun test --coverage` — all pass, coverage report generated. |
| TASK-CI-067 | Python Environment Setup with `astral-sh/setup-uv` | None | Add `astral-sh/setup-uv@v3` (`version: "latest"`, `enable-cache: true`); `uv python install 3.13`; `uv sync --frozen --all-extras`. | `cd api && uv sync --frozen` initializes the venv with locked deps in < 8s. |
| TASK-CI-068 | Python Code Formatting & Linting Job (`ruff`) | TASK-CI-067 | Job `backend-lint`: `uv run ruff check app tests` and `uv run ruff format --check app tests`. | `cd api && uv run ruff check . && uv run ruff format --check .` fails on formatting/PEP8/unresolved-import issues. |
| TASK-CI-069 | Python Strict Static Type Analysis Job (`mypy`) | TASK-CI-067 | Job `backend-typecheck`: `uv run mypy app --strict`, enforcing full Pydantic model + annotation coverage. | `cd api && uv run mypy app --strict` exits 0, "Success: no issues found in X source files." |
| TASK-CI-070 | Python Microservice Unit & Integration Tests Job (`pytest`) | TASK-CI-067 | Job `backend-tests`: `uv run pytest --cov=app --cov-report=xml --cov-report=term-missing tests/`. | `cd api && uv run pytest tests/` — all suites pass, > 85% line coverage. |
| TASK-CI-071 | Codecov / Coverage Report Aggregator and PR Commenter | TASK-CI-066, TASK-CI-070 | Add `codecov/codecov-action@v4` uploading `web/coverage/lcov.info` and `api/coverage.xml`. | Codecov posts a unified coverage-diff comment on the open PR. |
| TASK-CI-072 | Convex DB Schema Typecheck & Dry-Run Validation Job | TASK-CI-063 | Job `convex-schema-check`: `bun x convex dev --typecheck=enable --dry-run`. | Schema validation passes with 0 type errors. |
| TASK-CI-073 | Language Seed Datasets Schema & Syntax Validation Job | TASK-CI-063 | Job `validate-seed-data`: `bun test packages/seed-data/tests/` — Zod schema checks for Japanese, Mandarin, Thai, Vietnamese, Korean datasets. | `bun test packages/seed-data/tests/` — 100% of seed phrases pass schema validation. |
| TASK-CI-074 | Playwright Browser Binary Installation & Caching Action | TASK-CI-063 | Cache `~/.cache/ms-playwright`; run `bun x playwright install --with-deps chromium` in the E2E job. | `test -d ~/.cache/ms-playwright` — Chromium binaries cached/restored across runs. |
| TASK-CI-075 | Headless Playwright End-to-End Test Matrix Job | TASK-CI-074 | Job `e2e-tests`: `bun x playwright test` against a local Next.js build on port 3000, covering flashcard review, voice HUD, offline phrasebook flows. | `cd web && bun x playwright test` — all specs pass headless. |
| TASK-CI-076 | Playwright HTML Test Report & Artifact Upload Action | TASK-CI-075 | Add `actions/upload-artifact@v4` (`if: always()`) uploading `web/playwright-report/`, 14-day retention. | Traces, failure screenshots, and the HTML report attach to the Actions run summary. |
| TASK-CI-077 | Bundle Size Budget Analysis & Next.js Bundle Analyzer Job | TASK-CI-063 | Assert the Next.js production client JS bundle is < 150KB gzipped. | `cd web && bun run build && bash scripts/check-bundle-size.sh` fails the build over budget. |
| TASK-CI-078 | Git Commit Message Linting with Commitlint | None | Add `wagoid/commitlint-github-action@v6`, enforce Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `ci:`). | `echo "feat: add tts streaming" \| bun x commitlint` — non-conforming titles fail PR validation. |
| TASK-CI-079 | Branch Protection Rule Validation Script | None | Create `scripts/check-branch-protection.sh`: query the GitHub API to confirm `main` requires `frontend-lint`, `backend-tests`, `e2e-tests`, `security-scan` status checks. | `bash scripts/check-branch-protection.sh` verifies branch protection is active on the remote. |
| TASK-CI-080 | Consolidated Pull Request CI Pipeline Workflow | TASK-CI-061…079 | Create `.github/workflows/pull-request-ci.yml` uniting path filters, lint, typecheck, unit tests, seed tests, and Playwright E2E, run in parallel. | `gh workflow view pull-request-ci.yml` — all gates run concurrently on PR creation, report to GitHub Checks. |

## Related packages
- [[t02-security-signing]] — the vulnerability-scan/signing steps this quality-gate pipeline sits alongside.
- [[t02-cd-rollout-rollbacks]] — what runs after these gates pass on merge to `main`.
