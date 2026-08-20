---
id: t02-cd-rollout-rollbacks
title: "Sub-Track E: CD Deployment Workflows, Multi-Environment Release, Rollback & Migration"
track: "Track 2: Docker Containerization, Multi-Arch Image Pipelines & GitHub Actions CI/CD"
task_range: "TASK-CI-081–TASK-CI-100"
status: complete
tags: [github-actions, kustomize, rollout, rollback, canary, convex]
related: [t02-ci-quality-gates, t02-security-signing, t01-observability]
---

# Sub-Track E: CD Deployment Workflows, Multi-Environment Release, Rollback & Migration

Everything from merged PR to running in production: GitHub Environments
with a manual approval gate, kubeconfig auth, staging/prod Kustomize
overlays, an automatic staging deploy on push to `develop`, Convex schema
migration before rollout, digest-pinned image mutation, the rollout apply
+ status poll + automatic rollback-on-failure sequence, the gated
production release workflow, a manual emergency-rollback dispatch, post-
deploy smoke tests and Volterra edge health checks, pre-migration DB
backup, Slack/Discord notifications, canary traffic shifting with
automated Prometheus-based promotion/rollback, GitHub Release generation,
and a master end-to-end pipeline validation script.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-CI-081 | GitHub Environments Definition with Protection Rules | None | Configure GitHub environments `staging` (auto-deploy) and `production` (requires manual reviewer approval + passed status checks). | Production deployment pauses at the approval gate in the Actions UI; `gh api repos/:owner/:repo/environments/production` confirms the rule. |
| TASK-CI-082 | Kubernetes Kubeconfig Secret Handling & Context Switching | None | Add `azure/k8s-set-context@v4` using `secrets.KUBECONFIG` to authenticate against the Vultr K8s cluster. | `kubectl cluster-info` succeeds after context is set. |
| TASK-CI-083 | Kustomize Overlay Configuration for Staging | None | Create `k8s/overlays/staging/kustomization.yaml`: namespace `lingo-staging`, `replicas: 1`, host `staging.lingo.yourdomain.com`, staging ConfigMaps. | `kustomize build k8s/overlays/staging \| kubectl apply --dry-run=client -f -` passes. |
| TASK-CI-084 | Kustomize Overlay Configuration for Production | None | Create `k8s/overlays/prod/kustomization.yaml`: namespace `lingo-prod`, `replicas: 2+` with HPA, host `lingo.yourdomain.com`, Volterra annotations, production secrets. | `kustomize build k8s/overlays/prod \| kubectl apply --dry-run=client -f -` passes. |
| TASK-CI-085 | Automated Staging Deployment Workflow on Push to `develop` | TASK-CI-032, TASK-CI-082, TASK-CI-083 | Create `.github/workflows/deploy-staging.yml`: on push to `develop`, build multi-arch images, update staging image tags, deploy, verify rollout. | Push to `develop` updates staging automatically in < 5 minutes. |
| TASK-CI-086 | Pre-Deployment Convex Database Schema Migration Action | TASK-CI-063 | Pre-deployment step: `bun x convex deploy` using `secrets.CONVEX_DEPLOY_KEY` to apply schema/mutations before pod rollout. | `bun x convex deploy --dry-run` applies backward-compatibly, doesn't break running pods. |
| TASK-CI-087 | Kustomize Image Tag Mutation Step | TASK-CI-031, TASK-CI-084 | In the CD runner: `cd k8s/overlays/prod && kustomize edit set image ghcr.io/<repo>/lingo-frontend=ghcr.io/<repo>/lingo-frontend@<web_digest>` (and the same for `lingo-worker`/`api_digest`). | `grep -E "digest\|@" k8s/overlays/prod/kustomization.yaml` shows exact SHA256 digests, not mutable tags. |
| TASK-CI-088 | Kubernetes Deployment Rollout Execution | TASK-CI-082, TASK-CI-087 | `kustomize build k8s/overlays/prod \| kubectl apply -f -`. | `kubectl get deployments -n lingo-prod` shows the rolling update in progress. |
| TASK-CI-089 | Kubernetes Rollout Status Poller & Timeout Watcher | TASK-CI-088 | `kubectl rollout status deployment/lingo-frontend -n lingo-prod --timeout=180s` and the same for `lingo-worker`. | Step succeeds once new pods pass readiness; fails on timeout. |
| TASK-CI-090 | Automated Instant Rollback Trigger on Rollout Timeout / Pod CrashLoop | TASK-CI-089 | `if: failure()` step: `kubectl rollout undo deployment/lingo-frontend -n lingo-prod` (+ worker), then re-poll rollout status with a 120s timeout. | Deploying a bad image tag auto-reverts to the previous healthy revision. |
| TASK-CI-091 | Production Manual Approval Gate & Release Tag Trigger Workflow | TASK-CI-081, TASK-CI-084, TASK-CI-086…090 | Create `.github/workflows/deploy-production.yml`: triggers on release tag `v*.*.*` push or manual dispatch; requires `production` environment approval; deploys to `lingo-prod`. | Workflow halts at the approval gate until an authorized maintainer approves. |
| TASK-CI-092 | Manual Emergency Rollback Workflow via `workflow_dispatch` | TASK-CI-082 | Create `.github/workflows/emergency-rollback.yml`, inputs `environment` (staging/production), `target_revision` (default: previous), `reason`; runs `kubectl rollout undo`, posts an alert. | `gh workflow run emergency-rollback.yml -f environment=production -f reason="latency spike"` rolls back cluster state in < 30s. |
| TASK-CI-093 | Post-Deployment Synthetic Smoke Testing Action | TASK-CI-089 | Create `scripts/run-smoke-tests.sh`: hit homepage (200), API health, mock TTS synthesis call, search query. | `bash scripts/run-smoke-tests.sh https://lingo.yourdomain.com` verifies end-to-end traffic over public DNS/Ingress. |
| TASK-CI-094 | Post-Deployment Ingress & Volterra Origin Pool Health Verification Script | TASK-CI-089 | Create `scripts/verify-ingress-health.sh`: query the Volterra API for origin pool health = 100% and clean TLS handshakes. | `bash scripts/verify-ingress-health.sh` exits 0 on healthy edge routing. |
| TASK-CI-095 | Database Backup & Snapshot Trigger Step Prior to Migration | TASK-CI-086 | Pre-migration step: run a Convex snapshot export/backup before applying breaking schema changes. | Snapshot timestamp is logged and verifiable in runner artifacts. |
| TASK-CI-096 | Slack / Discord Webhook Notification Action on Deployment Success / Failure | TASK-CI-085, TASK-CI-091 | Add `rtCamp/action-slack-notify@v2` (or Discord webhook): status, commit author/message, image digests, link to the GitHub deployment. | Notification delivers with a green (success) or red (failure/rollback) embed in real time. |
| TASK-CI-097 | Blue-Green Traffic Shifting Manifest & Ingress Canary Annotation Setup | TASK-CI-084 | Create `k8s/overlays/prod/canary-ingress.yaml`: `nginx.ingress.kubernetes.io/canary: "true"`, `canary-weight: "10"`. | `kubectl apply --dry-run=client -f k8s/overlays/prod/canary-ingress.yaml` — 10% of traffic routes to canary, 90% to stable. |
| TASK-CI-098 | Canary Deployment Analysis & Automated Promotion / Rollback Step | TASK-CI-097 | Create `scripts/evaluate-canary.sh`: query Prometheus for 5 minutes — error rate < 0.1%, p95 latency < 1.5s. Healthy → promote canary weight to 100%; degraded → cut to 0%. | `bash scripts/evaluate-canary.sh --namespace lingo-prod` — auto-promotes on healthy metrics, cuts traffic immediately on threshold breach. |
| TASK-CI-099 | Production Release Notes Generator & GitHub Release Creation Action | TASK-CI-091 | Add `softprops/action-gh-release@v2`: auto-generate changelog from merged PR titles, attach SBOM artifacts and image digests. | `gh release view v1.0.0` shows a formatted release created on semantic tag push. |
| TASK-CI-100 | Master End-to-End Release & Rollback Orchestration Validation Script | TASK-CI-001…099 | Create `scripts/verify-ci-cd-pipeline.sh`: (1) Hadolint syntax, (2) multi-arch buildx build, (3) Trivy scan + SBOM, (4) Cosign sign, (5) Kustomize staging/prod validation, (6) rollout-watcher + rollback script verification. | `bash scripts/verify-ci-cd-pipeline.sh` runs the full sequence and exits 0. |

## Related packages
- [[t02-ci-quality-gates]] — the PR gates that must pass before this pipeline runs.
- [[t02-security-signing]] — signing/scanning steps this pipeline's rollout depends on.
- [[t01-observability]] — Track 1's infra-level CI/CD and monitoring, running in parallel to this application-level one.

## Note: source doc's own swarm-batch suggestion
The source spec ends this track with a "Swarm Agent Work Distribution
Guide" splitting the 100 TASK-CI tasks into 4 daily batches for parallel
autonomous agents (Batch 1: 001–020 + 061–073; Batch 2: 021–040 + 074–080;
Batch 3: 041–060 + 081–086; Batch 4: 087–100). That's an execution-order
suggestion, not part of the technical spec — kept here for reference only,
not reflected in this package's own task table.
