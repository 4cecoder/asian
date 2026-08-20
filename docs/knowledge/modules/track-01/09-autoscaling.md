---
id: t01-autoscaling
title: "Module 9: Autoscaling, Compute Optimization & Node Scheduling"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-086–TASK-092"
status: complete
tags: [k8s, hpa, vpa, cluster-autoscaler, node-affinity]
related: [t01-workload-deployments, t01-observability]
---

# Module 9: Autoscaling, Compute Optimization & Node Scheduling

HPA v2 for both frontend and worker (CPU/memory-based, plus a custom
`active_websocket_sessions_per_pod` metric for the worker), the VKE
cluster autoscaler for node-pool expansion, node-pool partitioning between
general and AI-inference nodes with taints/tolerations, and a
recommendation-only VPA for right-sizing.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-086 | Horizontal Pod Autoscaler (HPA v2) for Frontend Workload | TASK-076 | Create `k8s/base/hpa-frontend.yaml`: `minReplicas: 2`, `maxReplicas: 6`, target avg CPU 75%, avg memory 80%, scale-down stabilization window 300s. | `kubectl apply --dry-run=client -f k8s/base/hpa-frontend.yaml -n lingo-prod` validates against `autoscaling/v2`. |
| TASK-087 | Horizontal Pod Autoscaler (HPA v2) for Python Worker Workload | TASK-078 | Create `k8s/base/hpa-worker.yaml`: `minReplicas: 2`, `maxReplicas: 8`, target avg CPU 70%, avg memory 75%, scale-up behavior +2 pods every 15s. | Synthetic CPU load triggers automatic scale from 2 to 4 worker pods within 60s. |
| TASK-088 | Custom Metric Adapter for WebSocket Active Sessions HPA | TASK-087 | Create `k8s/base/hpa-worker-custom.yaml`: Prometheus metric rule `active_websocket_sessions_per_pod`, target 25 concurrent audio streams per pod. | HPA queries the custom metric API and scales the worker Deployment on real-time stream count. |
| TASK-089 | Vultr Kubernetes Engine (VKE) Cluster Autoscaler Configuration | None | Create `vultr/cluster-autoscaler-values.yaml`: VKE node pool auto-expands 3→8 worker nodes (`vc2-4c-8gb`) on pod scheduling failure. | Unschedulable pods (ResourceQuota exhaustion) trigger automatic provisioning of a new VKE node. |
| TASK-090 | Node Pool Partitioning (General Compute vs AI Inference Nodes) | TASK-089 | Label node pools `workload-type=general` (frontend) and `workload-type=ai-inference` (Python speech/TTS worker). | `kubectl get nodes -L workload-type` shows the distinct pool classifications. |
| TASK-091 | Node Taints, Tolerations & NodeAffinity Rules | TASK-090 | In `k8s/base/deployment-worker.yaml`: toleration `key: "ai-workload"`, `operator: "Exists"`, `effect: "NoSchedule"`; nodeAffinity for `workload-type=ai-inference`. | Worker pods land exclusively on dedicated AI compute nodes; general workloads can't schedule onto AI nodes. |
| TASK-092 | Vertical Pod Autoscaler (VPA) in Recommendation Mode | TASK-076, TASK-078 | Create `k8s/base/vpa-recommendations.yaml` (`updateMode: "Off"`): tracks actual CPU/memory usage, outputs optimal resource-request suggestions. | `kubectl describe vpa lingo-worker-vpa -n lingo-prod` outputs target sizing recommendations. |

## Related packages
- [[t01-workload-deployments]] — the Deployments these autoscalers target.
- [[t01-observability]] — where HPA/VPA behavior gets monitored and alerted on.
