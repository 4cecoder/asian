---
id: t01-networkpolicies
title: "Module 3: NetworkPolicies, CNI & Multi-Tenant Isolation"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-021–TASK-030"
status: complete
tags: [k8s, networkpolicy, cilium, security, multi-tenant]
related: [t01-namespaces-governance, t01-rbac-identity, t01-ingress-gateway]
---

# Module 3: NetworkPolicies, CNI & Multi-Tenant Isolation

Default-deny network posture for `lingo-prod`, then explicit allow rules
opening exactly the paths the app needs: DNS, ingress-to-frontend,
frontend-to-worker, worker-to-external-APIs, worker-to-object-storage —
plus a hard block against the co-tenant `easycv` namespace, Cilium L7
HTTP-path whitelisting, Hubble drop observability, and an automated
connectivity-matrix test.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-021 | Default-Deny All Ingress and Egress NetworkPolicy | TASK-001 | Create `k8s/network-policies/00-default-deny.yaml`: `NetworkPolicy` `default-deny-all` in `lingo-prod`, `podSelector: {}`, `policyTypes: [Ingress, Egress]`. | `kubectl apply --dry-run=client -f k8s/network-policies/00-default-deny.yaml -n lingo-prod` passes. All non-whitelisted ingress/egress is dropped. |
| TASK-022 | CoreDNS Egress NetworkPolicy Rule | TASK-021 | Create `k8s/network-policies/01-allow-dns.yaml`: allow egress from all `lingo-prod` pods to `kube-system` on port 53 UDP+TCP. | Pods resolve `kubernetes.default.svc.cluster.local` and external hostnames via CoreDNS. |
| TASK-023 | Ingress-NGINX to Frontend Inbound Routing NetworkPolicy | TASK-021 | Create `k8s/network-policies/02-allow-ingress-to-frontend.yaml`: allow ingress to `app=lingo-frontend` on TCP 3000, only from pods labeled `app.kubernetes.io/name: ingress-nginx`. | Ingress-controller traffic reaches frontend port 3000; direct cross-namespace pod traffic is rejected. |
| TASK-024 | Frontend to Python Worker Intra-Namespace Policy | TASK-021 | Create `k8s/network-policies/03-allow-frontend-to-worker.yaml`: allow ingress to `app=lingo-worker` on TCP 8000, only from `app=lingo-frontend` in `lingo-prod`. | Frontend connects (HTTP/WebSocket) to `lingo-worker-service:8000`; unauthorized pods time out. |
| TASK-025 | Python Worker Egress Policy for Convex DB & Moonshot API | TASK-021 | Create `k8s/network-policies/04-allow-worker-egress-apis.yaml`: allow egress from `app=lingo-worker` to external HTTPS 443 (Convex DB cloud, Moonshot API). | Worker reaches `api.moonshot.cn:443` and Convex DB; non-443 outbound stays blocked. |
| TASK-026 | Python Worker Egress Policy for S3/R2 Object Storage | TASK-021 | Create `k8s/network-policies/05-allow-worker-egress-storage.yaml`: allow egress from `app=lingo-worker` to port 443 CIDRs for Cloudflare R2 / AWS S3. | Audio clip uploads to S3/R2 succeed. |
| TASK-027 | Cross-Namespace Isolation Rule (Blocking Easy CV Cross-Talk) | TASK-021…TASK-026 | Create `k8s/network-policies/06-block-cross-namespace-easycv.yaml`: verify no rule matches namespace `easycv`. | `kubectl exec -n easycv -- curl -m 2 http://lingo-worker-service.lingo-prod:8000` times out / drops. |
| TASK-028 | Cilium L7 NetworkPolicy with HTTP Path & Method Whitelisting | TASK-024 | Create `k8s/network-policies/cilium-l7-worker-policy.yaml` (`CiliumNetworkPolicy`): frontend→worker restricted to `GET /healthz`, `POST /api/v1/srs/*`, `GET /api/v1/ws/roleplay` with WebSocket upgrade headers. | `cilium policy validate k8s/network-policies/cilium-l7-worker-policy.yaml` passes. Non-whitelisted HTTP methods blocked at proxy layer. |
| TASK-029 | Hubble Flow Observability & Network Drops Monitoring Setup | TASK-028 | Create `k8s/observability/hubble-metrics-config.yaml`: enable Hubble L7 metrics export (DNS, HTTP rate, drops) into Prometheus. | `hubble observe --namespace lingo-prod --verdict DROPPED` shows real-time drop telemetry. |
| TASK-030 | Automated NetworkPolicy Validation & Connectivity Matrix Test | TASK-021…TASK-029 | Create `scripts/test-network-policies.sh`: matrix connection tests between frontend, worker, `easycv`, and external endpoints. | Script runs all 8 permutations, verifies exact expected pass/fail states. |

## Related packages
- [[t01-namespaces-governance]] — namespace these policies scope to.
- [[t01-rbac-identity]] — identity-layer isolation this complements at the network layer.
- [[t01-ingress-gateway]] — the ingress path this module's rules gate traffic into.
