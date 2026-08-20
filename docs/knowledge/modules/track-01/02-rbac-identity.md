---
id: t01-rbac-identity
title: "Module 2: ServiceAccounts, RBAC & Identity Isolation"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-011–TASK-020"
status: complete
tags: [k8s, rbac, serviceaccount, security]
related: [t01-namespaces-governance, t01-networkpolicies]
---

# Module 2: ServiceAccounts, RBAC & Identity Isolation

Least-privilege identity for every workload and controller that touches
`lingo-prod`: per-tier ServiceAccounts with token automount off, scoped
Roles/RoleBindings for app pods, CI/CD, developers, cert-manager, ingress,
and Prometheus, closed out with an automated RBAC audit script.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-011 | Frontend ServiceAccount with Token Automount Disabled | TASK-001 | Create `k8s/base/sa-frontend.yaml`: ServiceAccount `lingo-frontend-sa` in `lingo-prod`, `automountServiceAccountToken: false`. | `kubectl apply --dry-run=client -f k8s/base/sa-frontend.yaml -n lingo-prod` passes. No API token mounted at `/var/run/secrets/kubernetes.io/serviceaccount` in frontend pods. |
| TASK-012 | Python Worker ServiceAccount Definition | TASK-001 | Create `k8s/base/sa-worker.yaml`: ServiceAccount `lingo-worker-sa` in `lingo-prod`, `automountServiceAccountToken: false`. | `kubectl apply --dry-run=client -f k8s/base/sa-worker.yaml -n lingo-prod` validates cleanly. |
| TASK-013 | Namespace-Scoped Read-Only ConfigMap Role | TASK-001 | Create `k8s/base/role-app-reader.yaml`: Role `lingo-config-reader`, verbs `["get","list","watch"]` on `["configmaps"]`, namespace `lingo-prod`. | `kubectl apply --dry-run=client -f k8s/base/role-app-reader.yaml -n lingo-prod` passes. |
| TASK-014 | RoleBindings for Application ServiceAccounts | TASK-011, TASK-012, TASK-013 | Create `k8s/base/rolebinding-apps.yaml` binding `lingo-config-reader` to `lingo-frontend-sa` and `lingo-worker-sa`. | `kubectl auth can-i get configmaps --as=system:serviceaccount:lingo-prod:lingo-worker-sa -n lingo-prod` → yes. `kubectl auth can-i get secrets ...` → no. |
| TASK-015 | CI/CD Deployment ServiceAccount with Scoped Rollout Permissions | TASK-001 | Create `k8s/base/rbac-cicd.yaml`: ServiceAccount `lingo-cd-deployer`, Role `lingo-deployer-role` with verbs `["get","list","watch","create","update","patch"]` on `["deployments","services","configmaps","ingresses","horizontalpodautoscalers"]`. | `kubectl auth can-i update deployment/lingo-frontend --as=...lingo-cd-deployer -n lingo-prod` → yes. `kubectl auth can-i delete namespace/lingo-prod --as=...lingo-cd-deployer` → no. |
| TASK-016 | Read-Only Developer Auditing Role & RoleBinding | TASK-001 | Create `k8s/base/role-developer-view.yaml`: view permissions plus `["get","list","watch"]` on `pods/log` in `lingo-prod`. | Developer role can stream pod logs; cannot `kubectl exec` or edit ConfigMaps. |
| TASK-017 | Cert-Manager ACME Solver ServiceAccount & Scoped RBAC | TASK-001 | Create `k8s/base/rbac-cert-manager.yaml`: permissions for cert-manager to manage HTTP-01 challenge solver pods and ingress rules, scoped exclusively to `lingo-prod`. | `kubectl apply --dry-run=client -f k8s/base/rbac-cert-manager.yaml` validates against standard cert-manager RBAC specs. |
| TASK-018 | Ingress Controller RBAC Validation & Namespace Scoping | TASK-001 | Create `k8s/base/rbac-ingress-scoping.yaml`: Ingress-NGINX gets read access to Endpoints and Secrets in `lingo-prod` only — no cluster-admin. | Ingress-NGINX validates backend services in `lingo-prod` cleanly. |
| TASK-019 | Prometheus Metric Scraper ServiceAccount & RBAC | TASK-001 | Create `k8s/base/rbac-prometheus.yaml`: Prometheus scraper role gets access to `/metrics` endpoints and pod metadata in `lingo-prod`. | `kubectl auth can-i get pods --as=system:serviceaccount:monitoring:prometheus-k8s -n lingo-prod` → yes. |
| TASK-020 | RBAC Automated Principle-of-Least-Privilege Auditing Script | TASK-011…TASK-019 | Create `scripts/audit-rbac.sh` using `kubectl-who-can` or a native `kubectl auth can-i` matrix across all ServiceAccounts. | `bash scripts/audit-rbac.sh` asserts 0 unauthorized privilege escalations, exits 0. |

## Related packages
- [[t01-namespaces-governance]] — namespace these ServiceAccounts and Roles live in.
- [[t01-networkpolicies]] — network-layer isolation complementing this identity layer.
