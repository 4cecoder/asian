---
id: t01-workload-deployments
title: "Module 8: Workload Deployments, Lifecycle & Health Probes"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-076–TASK-085"
status: complete
tags: [k8s, deployment, health-probes, pdb, configmap, sealed-secrets]
related: [t01-containerization, t01-rbac-identity, t01-autoscaling]
---

# Module 8: Workload Deployments, Lifecycle & Health Probes

The actual Deployment specs for frontend and worker: rolling-update
strategy, three-tier health probes, graceful WebSocket-drain termination
hooks, PodDisruptionBudgets, anti-affinity spread across nodes, the two
ConfigMaps, and a SealedSecrets template for the credentials that can't be
plaintext.

## Tasks

| ID       | Title                                                               | Depends on                             | Spec (condensed)                                                                                                                                                                                                                                                  | Acceptance check                                                                                          |
| -------- | ------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| TASK-076 | Next.js Frontend Deployment Specification with RollingUpdate        | TASK-001, TASK-003, TASK-011, TASK-066 | Create `k8s/base/deployment-frontend.yaml`: `replicas: 2`, `strategy.type: RollingUpdate` (`maxSurge: 1`, `maxUnavailable: 0`), `securityContext: runAsNonRoot: true, runAsUser: 1001, readOnlyRootFilesystem: true`, `serviceAccountName: lingo-frontend-sa`.    | `kubectl apply --dry-run=client -f k8s/base/deployment-frontend.yaml -n lingo-prod` passes.               |
| TASK-077 | Frontend Health Probes (Startup, Liveness, Readiness)               | TASK-076                               | In the frontend Deployment, target `/api/health`: `startupProbe` port 3000, `periodSeconds: 2`, `failureThreshold: 15`; `readinessProbe` port 3000, `periodSeconds: 5`, `timeoutSeconds: 2`; `livenessProbe` port 3000, `periodSeconds: 10`, `timeoutSeconds: 2`. | Pod reports `Ready` only once `/api/health` returns HTTP 200.                                             |
| TASK-078 | Python Worker Deployment Specification with ConfigMap/Secret Mounts | TASK-001, TASK-003, TASK-012, TASK-069 | Create `k8s/base/deployment-worker.yaml`: `replicas: 2`, `serviceAccountName: lingo-worker-sa`, env vars from `lingo-worker-config` ConfigMap and `lingo-worker-secrets` Secret, ephemeral `emptyDir` mounted at `/tmp/audio_cache`.                              | `kubectl apply --dry-run=client -f k8s/base/deployment-worker.yaml -n lingo-prod` validates.              |
| TASK-079 | Python Worker Startup & Deep Readiness Probes                       | TASK-078                               | `startupProbe` path `/healthz` port 8000, `failureThreshold: 30`; `readinessProbe` path `/readyz` (checks S3 & Moonshot connectivity), `periodSeconds: 10`; `livenessProbe` path `/healthz`, `periodSeconds: 15`.                                                 | Worker pod removes itself from Service endpoints when `/readyz` fails an upstream dependency check.       |
| TASK-080 | Graceful Termination Hooks & WebSocket Drain Lifecycle Handling     | TASK-078                               | Add to `k8s/base/deployment-worker.yaml`: `lifecycle.preStop.exec.command: ["/bin/sh","-c","python -m app.scripts.drain_connections --timeout 30"]`.                                                                                                              | During a rolling update, active speech streams complete gracefully before the container receives SIGKILL. |
| TASK-081 | Pod Disruption Budgets (PDB) for Zero-Downtime Maintenance          | TASK-076, TASK-078                     | Create `k8s/base/pdb.yaml`: `lingo-frontend-pdb` (`minAvailable: 1`, selector `app: lingo-frontend`), `lingo-worker-pdb` (`minAvailable: 1`, selector `app: lingo-worker`).                                                                                       | `kubectl drain --ignore-daemonsets` respects the PDBs, evicts pods sequentially with no downtime.         |
| TASK-082 | Pod Anti-Affinity Rules for Multi-Node Failure Domain Distribution  | TASK-076, TASK-078                     | Add `affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution` with `topologyKey: "kubernetes.io/hostname"` to all Deployment specs.                                                                                                              | Pod replicas land on separate physical worker nodes.                                                      |
| TASK-083 | ConfigMap Definition for Frontend Environment Configurations        | TASK-001                               | Create `k8s/base/configmap-frontend.yaml`: `NODE_ENV: "production"`, `PORT: "3000"`, `NEXT_PUBLIC_CONVEX_URL: "https://lingo.convex.cloud"`, `PYTHON_API_URL: "http://lingo-worker-service.lingo-prod.svc.cluster.local:8000"`.                                   | `kubectl apply --dry-run=client -f k8s/base/configmap-frontend.yaml -n lingo-prod` passes.                |
| TASK-084 | ConfigMap Definition for Python NLP & Worker Configurations         | TASK-001                               | Create `k8s/base/configmap-worker.yaml`: `ENVIRONMENT: "production"`, `PORT: "8000"`, `LOG_LEVEL: "info"`, `MAX_AUDIO_CHUNK_SIZE_BYTES: "5242880"`, `DEFAULT_TTS_VOICE: "moonshot-v1-zh"`.                                                                        | ConfigMap mounts cleanly into worker pods as environment variables.                                       |
| TASK-085 | SealedSecrets Template & Automated Decryption Pipeline              | TASK-001                               | Create `k8s/base/sealed-secrets.template.yaml`: encrypted schema for `MOONSHOT_API_KEY`, `CONVEX_DEPLOY_KEY`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.                                                                                                         | SealedSecrets controller decrypts into K8s Secret `lingo-worker-secrets` in `lingo-prod`.                 |

## Related packages

- [[t01-containerization]] — the images these Deployments run.
- [[t01-rbac-identity]] — ServiceAccounts referenced by `serviceAccountName`.
- [[t01-autoscaling]] — HPA/scheduling layered on top of these Deployments.
