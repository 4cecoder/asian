---
id: t01-observability
title: "Module 10: Observability, Alerting, Logging & CI/CD Rollout"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-093–TASK-100"
status: complete
tags: [k8s, prometheus, grafana, github-actions, rollout]
related: [t01-autoscaling, t01-volterra-edge, t02-cd-rollout-rollbacks]
---

# Module 10: Observability, Alerting, Logging & CI/CD Rollout

Closes out Track 1: kube-prometheus-stack with multi-tenant scrape
scoping, ServiceMonitors for frontend and worker, alert rules for 5xx
rate/latency/crash-looping, a production Grafana dashboard, the
infra-focused GitHub Actions CI/CD pipeline (manifest lint → Kustomize
validate → Trivy scan → apply → rollout verify → auto-rollback), and a
single `cluster-health.sh` script that closes the loop across all 100
Track 1 tasks.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-093 | Kube-Prometheus-Stack Helm Values & Multi-Tenant Scrape Scoping | None | Create `helm/prometheus/values.yaml`: Prometheus server retention 30d, persistent storage 50Gi, `serviceMonitorNamespaceSelector: {}`. | Prometheus server successfully scrapes targets in `lingo-prod`. |
| TASK-094 | ServiceMonitor Resource for Next.js Metrics Exporter | TASK-076, TASK-093 | Create `k8s/observability/servicemonitor-frontend.yaml`: scrape port 3000 `/api/metrics` every 15s. | Next.js HTTP request duration and memory metrics appear in the Prometheus target dashboard. |
| TASK-095 | ServiceMonitor Resource for Python FastAPI Metrics | TASK-078, TASK-093 | Create `k8s/observability/servicemonitor-worker.yaml`: scrape port 8000 `/metrics` every 15s (TTS latency, STT inference duration, active WebSockets). | Prometheus targets list shows `lingo-worker-service` state `UP`. |
| TASK-096 | Custom PrometheusRule Alerts (5xx Rates, Latency Spikes, CrashLoops) | TASK-093 | Create `k8s/observability/prometheus-rules.yaml`: `LingoHighHttp5xxRate` (5xx > 2% over 5m), `LingoSpeechLatencyP95TooHigh` (TTS stream p95 > 2.0s over 5m), `LingoPodCrashLooping` (restarts > 3 within 10m). | `promtool check rules k8s/observability/prometheus-rules.yaml` passes syntax validation. |
| TASK-097 | Production Grafana Dashboard Definition | TASK-093, TASK-094, TASK-095 | Create `k8s/observability/grafana-dashboard-lingo.json` with panels: request rate & HTTP status codes, p50/p95/p99 ingress & worker latency, real-time WebSocket voice stream counter, CPU/memory vs. ResourceQuota limits. | Dashboard JSON imports into Grafana; all panel queries render active telemetry. |
| TASK-098 | GitHub Actions Multi-Stage CI Pipeline | TASK-066, TASK-069 | Create `.github/workflows/infra-ci.yml`: lint all K8s manifests with `kubeconform` (strict schemas), validate Kustomize overlays (`kustomize build k8s/overlays/prod`), run Trivy scans on generated images. | PR checks enforce 100% pass rate before merge to `main`. |
| TASK-099 | GitHub Actions CD Workflow with Automated Rollout Verification | TASK-076, TASK-078, TASK-098 | Create `.github/workflows/deploy-k8s.yml`: triggers on merge to `main`; applies Kustomize prod manifests to VKE; runs `kubectl rollout status deployment/lingo-frontend -n lingo-prod --timeout=180s` and the same for `lingo-worker`; auto-rollback if health probes fail. | Successful automated zero-downtime deployment verified on a `main`-branch commit. |
| TASK-100 | Master Cluster Deployment, Reconciliation & Health Check CLI Tool | TASK-001…TASK-099 | Create `scripts/cluster-health.sh`: queries namespace health across `lingo-prod`, `easycv`, `ingress-nginx`; inspects Volterra edge origin connectivity, cert-manager certificate status, HPA target utilization; outputs a green/red CLI diagnostic table. | `bash scripts/cluster-health.sh` exits 0 only when all 100 Track 1 components, policies, issuers, and routes are fully reconciled and healthy. |

## Related packages
- [[t01-autoscaling]] — the scaling behavior this module's alerts and dashboards watch.
- [[t01-volterra-edge]] — edge-layer telemetry feeding the same observability stack.
- [[t02-cd-rollout-rollbacks]] — Track 2's application-level CD pipeline, parallel to this module's infra-level one.
