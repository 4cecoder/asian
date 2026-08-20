---
id: t01-namespaces-governance
title: "Module 1: Multi-Tenant Namespaces & Resource Governance"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-001–TASK-010"
status: complete
tags: [k8s, namespaces, resource-quota, psa, cost-governance]
related: [t01-rbac-identity, t01-networkpolicies]
---

# Module 1: Multi-Tenant Namespaces & Resource Governance

This module sets the ground rules for the `lingo-prod` namespace before any
workload runs in it: labels, hard compute/object quotas, per-container
defaults, pod priority, staging isolation, and cost tagging. The cluster is
shared with Easy CV, so every limit here exists to stop one tenant from
starving the other.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-001 | Dedicated Production Namespace with Labels & PSA Enforcement | None | Create `k8s/base/namespace.yaml` for namespace `lingo-prod`. Set labels `app.kubernetes.io/part-of: lingo-platform`, `environment: production`, `pod-security.kubernetes.io/enforce: restricted` (version `latest`), `pod-security.kubernetes.io/warn: restricted`. | `kubectl apply --dry-run=client -f k8s/base/namespace.yaml` exits 0. `kubectl get ns lingo-prod --show-labels` shows all PSA and environment metadata. |
| TASK-002 | Hard ResourceQuota for Multi-Tenant Compute & Pod Limits | TASK-001 | Create `k8s/base/resource-quota.yaml` in `lingo-prod`. Set `requests.cpu: "4"`, `requests.memory: 8Gi`, `limits.cpu: "12"`, `limits.memory: 16Gi`, `count/pods: "30"`, `count/services: "10"`, `count/secrets: "25"`, `count/configmaps: "25"`. | `kubectl apply --dry-run=client -f k8s/base/resource-quota.yaml -n lingo-prod` validates cleanly. Cluster refuses new pods once namespace memory exceeds 16Gi. |
| TASK-003 | LimitRange for Default Container Resource Allocation | TASK-001 | Create `k8s/base/limit-range.yaml`. Set container `default` cpu 250m / memory 256Mi, `defaultRequest` cpu 100m / memory 128Mi, `max` cpu 2000m / memory 4Gi, `min` cpu 25m / memory 32Mi. | `kubectl apply --dry-run=client -f k8s/base/limit-range.yaml -n lingo-prod` passes. Pods with no resource block inherit 100m/128Mi requests. |
| TASK-004 | PriorityClasses for Production Workload Preemption Hierarchy | None | Create `k8s/base/priority-classes.yaml`. Define `lingo-critical-priority` (value `1000000`, `globalDefault: false`, description "For core Ingress and Python TTS Gateway pods") and `lingo-standard-priority` (value `500000`, `globalDefault: false`). | `kubectl apply --dry-run=client -f k8s/base/priority-classes.yaml` succeeds, no schema warnings. |
| TASK-005 | Staging and Preview Namespace Specifications | TASK-001, TASK-002, TASK-003 | Create `k8s/overlays/staging/namespace.yaml` (`lingo-staging`) and `k8s/overlays/staging/resource-quota.yaml` at 50% of prod quota (`requests.cpu: "2"`, `requests.memory: 4Gi`). | `kubectl apply --dry-run=client -k k8s/overlays/staging` succeeds. |
| TASK-006 | Pod Security Admission (PSA) Restricted Baseline Audit | TASK-001 | Create `scripts/audit-psa-compliance.sh`. Script checks every deployment manifest against the PSA restricted profile: `allowPrivilegeEscalation: false`, `runAsNonRoot: true`, `seccompProfile.type: RuntimeDefault`, `capabilities.drop: ["ALL"]`. | `bash scripts/audit-psa-compliance.sh` exits 0 with zero violations across all manifests. |
| TASK-007 | Ephemeral Storage Quota & Limit Enforcement | TASK-002, TASK-003 | Update `k8s/base/resource-quota.yaml`: add `requests.ephemeral-storage: 4Gi`, `limits.ephemeral-storage: 10Gi`. Update `k8s/base/limit-range.yaml`: default ephemeral request 512Mi, limit 2Gi. | `kubectl apply --dry-run=client -f k8s/base/resource-quota.yaml` validates cleanly. |
| TASK-008 | Namespace Object Count Limits (Services, PVCs, Secrets) | TASK-002 | Add to `k8s/base/resource-quota.yaml`: `persistentvolumeclaims: "5"`, `services.loadbalancers: "0"` — blocks any in-cluster creation of a cloud LoadBalancer Service. | Creating a `Type: LoadBalancer` Service in `lingo-prod` fails quota admission. |
| TASK-009 | TerminationGracePeriod & Container Lifecycle Governance | TASK-001 | Create `k8s/base/lifecycle-policy.md`. Enforce `terminationGracePeriodSeconds: 45` on every deployment template so active WebSocket connections drain cleanly. | Manifest linter confirms every deployment has `terminationGracePeriodSeconds >= 30`. |
| TASK-010 | Cluster Metadata & Cost-Allocation Tagging Specification | TASK-001 | Create `k8s/base/kustomization.yaml`. Set `commonLabels`: `cost-center: engineering`, `project: lingo-app`, `managed-by: kustomize`. | `kustomize build k8s/base` injects the tracking labels into every generated resource. |

## Related packages
- [[t01-rbac-identity]] — ServiceAccounts and RBAC layer on top of this namespace.
- [[t01-networkpolicies]] — traffic isolation within/between namespaces defined here.
