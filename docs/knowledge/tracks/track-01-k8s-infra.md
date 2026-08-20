---
id: track-01-k8s-infra
title: "Track 1: Kubernetes, Cloud Infrastructure, Multi-Tenant Governance & Volterra Edge Mesh"
track: "Track 1 of 10"
task_range: "TASK-001–TASK-100"
status: complete
tags: [k8s, moc, infra]
related:
  [
    t01-namespaces-governance,
    t01-rbac-identity,
    t01-networkpolicies,
    t01-ingress-gateway,
    t01-cert-manager,
    t01-volterra-edge,
    t01-containerization,
    t01-workload-deployments,
    t01-autoscaling,
    t01-observability,
  ]
---

# Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh

100 tasks (TASK-001–TASK-100) standing up the multi-tenant Vultr
Kubernetes (VKE) cluster the Asian Language Learning Platform shares with
Easy CV: namespace/quota governance, RBAC identity, network isolation,
Ingress-NGINX, cert-manager TLS, the Volterra (F5 Distributed Cloud) edge
mesh/CDN/WAF, the base Dockerfiles, Deployment specs with health probes
and graceful drain, autoscaling, and the observability/CI/CD stack that
watches and rolls all of it out. Fully present in the source spec — no
gaps.

## Modules

1. [[t01-namespaces-governance]] — namespace, ResourceQuota, LimitRange, PriorityClass, staging isolation, PSA audit, cost tagging (TASK-001–010).
2. [[t01-rbac-identity]] — ServiceAccounts, least-privilege Roles/RoleBindings for app/CI/dev/cert-manager/ingress/Prometheus, RBAC audit script (TASK-011–020).
3. [[t01-networkpolicies]] — default-deny CNI policy, explicit allow rules, cross-tenant block, Cilium L7 whitelisting, Hubble observability (TASK-021–030).
4. [[t01-ingress-gateway]] — Ingress-NGINX HA config, audio-sized buffers, WebSocket timeouts, host/path routing, rate limiting, compression (TASK-031–040).
5. [[t01-cert-manager]] — Let's Encrypt HTTP-01/DNS-01 issuers, Certificate resources, expiry alerts, TLS 1.3 hardening, secret mirroring (TASK-041–050).
6. [[t01-volterra-edge]] — Volterra origin pool, load balancer, WAF, edge caching, WebSocket bypass, bot defense, failover, SIEM export (TASK-051–065).
7. [[t01-containerization]] — base Bun/Next.js and uv/FastAPI Dockerfiles, multi-arch buildx, Compose dev stack, Trivy/Syft (TASK-066–075).
8. [[t01-workload-deployments]] — frontend/worker Deployments, health probes, drain hooks, PDBs, anti-affinity, ConfigMaps, SealedSecrets (TASK-076–085).
9. [[t01-autoscaling]] — HPA v2 (incl. custom WebSocket-session metric), VKE cluster autoscaler, node-pool partitioning, VPA (TASK-086–092).
10. [[t01-observability]] — kube-prometheus-stack, ServiceMonitors, alert rules, Grafana dashboard, infra CI/CD, master health-check script (TASK-093–100).
