Asian Language Learning Platform: Enterprise 1,000 Micro-Tasks Specification & Architecture Blueprint
Master Project Specification
Executive Summary & Autonomous Swarm Allocation
This document contains the complete production-grade engineering backlog of 1,000 atomic, self-contained micro-tasks (100 tasks across 10 specialized tracks) for the Asian Language Learning Platform. The platform delivers situational fluency for English speakers traveling across Japan, Thailand, Vietnam, Taiwan/China, and South Korea, co-existing on the same multi-tenant Kubernetes cluster as Easy CV.
Every task specifies isolated file paths, strict technical requirements, mathematical formulas, explicit dependencies, and automated validation commands (kubectl, bun test, pytest, playwright), enabling parallel execution by autonomous developer agent swarms.
Engineering Tracks & 1,000 Micro-Tasks Allocation Map

Track #
Engineering Track Name
Task Identifier Range
Task Count
Primary Tech Stack & Scope
Track 1
Kubernetes, Cloud Infrastructure & Volterra Edge Mesh
TASK-001 – TASK-100
100 Tasks
K8s (Vultr), Volterra Edge LB, Ingress-NGINX, Calico NetworkPolicies, Cert-Manager, Prometheus
Track 2
Docker Containerization, Multi-Arch Pipelines & CI/CD
TASK-CI-001 – TASK-CI-100
100 Tasks
Bun & uv multi-stage Dockerfiles, buildx multi-arch, Trivy vulnerability gates, Cosign signing, GHA
Track 3
Python 3.13 Backend Architecture, FastAPI Core & Gateway
TASK-PY-001 – TASK-PY-100
100 Tasks
Python 3.13, uv, FastAPI, Pydantic v2, structlog, Redis token bucket, OpenTelemetry, OpenAPI 3.1
Track 4
Moonshot TTS Engine, Audio Pipeline, Storage & Streaming
TTS-001 – TTS-100
100 Tasks
Moonshot TTS API, PyAV/FFmpeg, -16 LUFS loudness normalizer, sentence boundary buffering, S3/R2
Track 5
Speech-to-Text (STT), Pronunciation Scoring & Tone Analysis
STT-001 – STT-100
100 Tasks
Faster-Whisper (INT8/FP16), Silero VAD, Yin F0 pitch tracking, DTW acoustic alignment, G2P phonemes
Track 6
Edge LLM Orchestration, Voice Roleplay & Prompt Engineering
TASK-101 – TASK-200
100 Tasks
vLLM/Ollama, WebSocket duplex streaming, travel scenario FSMs, Keigo/Jondaenmal formality grading
Track 7
Spaced Repetition System (SRS) Mathematical Engine
SRS-001 – SRS-100
100 Tasks
FSRS v4.5 17-parameter model, power forgetting curve, SM-2 fallback engine, leech quarantine, simulation
Track 8
Convex DB Schema, Reactive Queries, Mutations & Crons
TASK-801 – TASK-900
100 Tasks
Convex DB TypeScript schema, 15+ tables, ACID mutations, optimistic updates, hourly maintenance crons
Track 9
Next.js 16 Frontend, UI/UX Design System & Animations
TASK-FE-001 – TASK-FE-100
100 Tasks
Next.js 16 (App Router), Bun, Tailwind CSS, Framer Motion SRS swipe deck player, SVG tone curves, Web Audio
Track 10
Travel Phrasebook PWA, Language Seed Datasets & Quality Gates
TASK-10-001 – TASK-10-100
100 Tasks
Service Worker PWA, IndexedDB offline cache, 500+ situational phrases (JA, ZH, TH, VI, KO), Playwright E2E
Total Master Work Breakdown Structure
1,000 Tasks
Full Production Stack Coverage
Track 1 of 10
Track 1: Kubernetes, Cloud Infrastructure, Multi-Tenant Governance & Volterra Edge Mesh
Track 1: Kubernetes, Cloud Infrastructure, Multi-Tenant Governance & Volterra Edge Mesh


Module 1: Multi-Tenant Namespaces & Resource Governance


TASK-001: Dedicated Production Namespace with Labels & PSA Enforcement
Domain / Module: Infrastructure / Namespace Governance
Dependencies: None
Exact Technical Specification:
* Create k8s/base/namespace.yaml defining namespace lingo-prod.
* Configure labels:
* app.kubernetes.io/part-of: lingo-platform
* environment: production
* pod-security.kubernetes.io/enforce: restricted
* pod-security.kubernetes.io/enforce-version: latest
* pod-security.kubernetes.io/warn: restricted
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/namespace.yaml passes with code 0.
* Running kubectl get ns lingo-prod --show-labels outputs all PSA and environment metadata.



TASK-002: Hard ResourceQuota for Multi-Tenant Compute & Pod Limits
Domain / Module: Infrastructure / Quota Management
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/resource-quota.yaml in namespace lingo-prod.
* Set hard constraints:
* requests.cpu: "4"
* requests.memory: 8Gi
* limits.cpu: "12"
* limits.memory: 16Gi
* count/pods: "30"
* count/services: "10"
* count/secrets: "25"
* count/configmaps: "25"
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/resource-quota.yaml -n lingo-prod validates cleanly.
* Cluster prevents pod scheduling once total namespace limits exceed 16Gi memory.



TASK-003: LimitRange for Default Container Resource Allocation
Domain / Module: Infrastructure / Resource Governance
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/limit-range.yaml.
* Configure default and min/max container values:
* Containers default: cpu: 250m, memory: 256Mi
* Containers defaultRequest: cpu: 100m, memory: 128Mi
* Containers max: cpu: 2000m, memory: 4Gi
* Containers min: cpu: 25m, memory: 32Mi
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/limit-range.yaml -n lingo-prod passes.
* Pods submitted without explicit resource definitions inherit 100m / 128Mi requests automatically.



TASK-004: PriorityClasses for Production Workload Preemption Hierarchy
Domain / Module: Infrastructure / Scheduling
Dependencies: None
Exact Technical Specification:
* Create k8s/base/priority-classes.yaml.
* Define lingo-critical-priority (value: 1000000, globalDefault: false, description: "For core Ingress and Python TTS Gateway pods").
* Define lingo-standard-priority (value: 500000, globalDefault: false).
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/priority-classes.yaml succeeds without schema warnings.



TASK-005: Staging and Preview Namespace Specifications
Domain / Module: Infrastructure / Environment Isolation
Dependencies: TASK-001, TASK-002, TASK-003
Exact Technical Specification:
* Create k8s/overlays/staging/namespace.yaml (lingo-staging) and k8s/overlays/staging/resource-quota.yaml (50% quota of prod: requests.cpu: "2", requests.memory: 4Gi).
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -k k8s/overlays/staging succeeds.



TASK-006: Pod Security Admission (PSA) Restricted Baseline Audit
Domain / Module: Infrastructure / Security Governance
Dependencies: TASK-001
Exact Technical Specification:
* Create scripts/audit-psa-compliance.sh.
* Script tests all deployment manifests against PSA restricted profile (allowPrivilegeEscalation: false, runAsNonRoot: true, seccompProfile.type: RuntimeDefault, capabilities.drop: ["ALL"]).
Acceptance Criteria & Validation:
* bash scripts/audit-psa-compliance.sh exits 0 with zero security violations across all manifests.



TASK-007: Ephemeral Storage Quota & Limit Enforcement
Domain / Module: Infrastructure / Storage Governance
Dependencies: TASK-002, TASK-003
Exact Technical Specification:
* Update k8s/base/resource-quota.yaml with requests.ephemeral-storage: 4Gi and limits.ephemeral-storage: 10Gi.
* Update k8s/base/limit-range.yaml with default ephemeral storage request 512Mi and limit 2Gi.
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/resource-quota.yaml validates cleanly.



TASK-008: Namespace Object Count Limits (Services, PVCs, Secrets)
Domain / Module: Infrastructure / Quota Management
Dependencies: TASK-002
Exact Technical Specification:
* Add object limits in k8s/base/resource-quota.yaml: persistentvolumeclaims: "5", services.loadbalancers: "0" (prevents unauthorized cloud LB creation inside cluster).
Acceptance Criteria & Validation:
* Attempting to create a Type: LoadBalancer Service in lingo-prod fails quota admission check.



TASK-009: TerminationGracePeriod & Container Lifecycle Governance
Domain / Module: Infrastructure / Pod Lifecycle
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/lifecycle-policy.md and enforce terminationGracePeriodSeconds: 45 across all deployment templates to allow active WebSocket connections to drain cleanly.
Acceptance Criteria & Validation:
* Manifest linter script verifies all deployments have terminationGracePeriodSeconds >= 30.



TASK-010: Cluster Metadata & Cost-Allocation Tagging Specification
Domain / Module: Infrastructure / Cost Governance
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/kustomization.yaml setting commonLabels (cost-center: engineering, project: lingo-app, managed-by: kustomize).
Acceptance Criteria & Validation:
* kustomize build k8s/base injects standard tracking labels into every generated resource.


Module 2: ServiceAccounts, RBAC & Identity Isolation


TASK-011: Frontend ServiceAccount with Token Automount Disabled
Domain / Module: Security / RBAC
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/sa-frontend.yaml defining ServiceAccount lingo-frontend-sa in lingo-prod with automountServiceAccountToken: false.
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/sa-frontend.yaml -n lingo-prod passes.
* Verified no API token is mounted to /var/run/secrets/kubernetes.io/serviceaccount in frontend pods.



TASK-012: Python Worker ServiceAccount Definition
Domain / Module: Security / RBAC
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/sa-worker.yaml defining lingo-worker-sa in lingo-prod with automountServiceAccountToken: false.
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/sa-worker.yaml -n lingo-prod validates cleanly.



TASK-013: Namespace-Scoped Read-Only ConfigMap Role
Domain / Module: Security / RBAC
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/role-app-reader.yaml defining Role lingo-config-reader allowing verbs ["get", "list", "watch"] on ["configmaps"] in lingo-prod.
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/role-app-reader.yaml -n lingo-prod passes.



TASK-014: RoleBindings for Application ServiceAccounts
Domain / Module: Security / RBAC
Dependencies: TASK-011, TASK-012, TASK-013
Exact Technical Specification:
* Create k8s/base/rolebinding-apps.yaml binding lingo-config-reader to lingo-frontend-sa and lingo-worker-sa.
Acceptance Criteria & Validation:
* kubectl auth can-i get configmaps --as=system:serviceaccount:lingo-prod:lingo-worker-sa -n lingo-prod returns yes.
* kubectl auth can-i get secrets --as=system:serviceaccount:lingo-prod:lingo-worker-sa -n lingo-prod returns no.



TASK-015: CI/CD Deployment ServiceAccount with Scoped Rollout Permissions
Domain / Module: Security / CI/CD RBAC
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/rbac-cicd.yaml creating ServiceAccount lingo-cd-deployer and Role lingo-deployer-role permitting ["get", "list", "watch", "create", "update", "patch"] on ["deployments", "services", "configmaps", "ingresses", "horizontalpodautoscalers"].
Acceptance Criteria & Validation:
* kubectl auth can-i update deployment/lingo-frontend --as=system:serviceaccount:lingo-prod:lingo-cd-deployer -n lingo-prod returns yes.
* kubectl auth can-i delete namespace/lingo-prod --as=system:serviceaccount:lingo-prod:lingo-cd-deployer returns no.



TASK-016: Read-Only Developer Auditing Role & RoleBinding
Domain / Module: Security / Developer Access
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/role-developer-view.yaml granting view permissions plus ["get", "list", "watch"] on pods/log within lingo-prod.
Acceptance Criteria & Validation:
* Developer role can stream pod logs but cannot execute kubectl exec or edit ConfigMaps.



TASK-017: Cert-Manager ACME Solver ServiceAccount & Scoped RBAC
Domain / Module: Security / TLS RBAC
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/rbac-cert-manager.yaml defining role permissions allowing cert-manager to manage HTTP-01 challenge solver pods and ingress rules exclusively in lingo-prod.
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/rbac-cert-manager.yaml validates against standard cert-manager RBAC specs.



TASK-018: Ingress Controller RBAC Validation & Namespace Scoping
Domain / Module: Security / Ingress RBAC
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/rbac-ingress-scoping.yaml ensuring Ingress-NGINX controller has read access to Endpoints and Secrets within lingo-prod without requiring cluster-admin privileges.
Acceptance Criteria & Validation:
* Ingress-NGINX validates backend services in lingo-prod cleanly.



TASK-019: Prometheus Metric Scraper ServiceAccount & RBAC
Domain / Module: Observability / RBAC
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/rbac-prometheus.yaml granting Prometheus scraper role access to /metrics endpoints and pod metadata in lingo-prod.
Acceptance Criteria & Validation:
* kubectl auth can-i get pods --as=system:serviceaccount:monitoring:prometheus-k8s -n lingo-prod returns yes.



TASK-020: RBAC Automated Principle-of-Least-Privilege Auditing Script
Domain / Module: Security / Automation
Dependencies: TASK-011 through TASK-019
Exact Technical Specification:
* Create scripts/audit-rbac.sh using kubectl-who-can or native kubectl auth can-i matrix verification across all service accounts.
Acceptance Criteria & Validation:
* Running bash scripts/audit-rbac.sh asserts 0 unauthorized privilege escalations and exits code 0.


Module 3: NetworkPolicies, CNI & Multi-Tenant Isolation


TASK-021: Default-Deny All Ingress and Egress NetworkPolicy
Domain / Module: Network Security / Isolation
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/network-policies/00-default-deny.yaml:
`yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
name: default-deny-all
namespace: lingo-prod
spec:
podSelector: {}
policyTypes: [Ingress, Egress]
`
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/network-policies/00-default-deny.yaml -n lingo-prod passes.
* Verified all un-whitelisted ingress and egress traffic is dropped.



TASK-022: CoreDNS Egress NetworkPolicy Rule
Domain / Module: Network Security / Core Traffic
Dependencies: TASK-021
Exact Technical Specification:
* Create k8s/network-policies/01-allow-dns.yaml allowing egress from all pods in lingo-prod to namespace kube-system on port 53 (UDP & TCP).
Acceptance Criteria & Validation:
* Pods can resolve kubernetes.default.svc.cluster.local and external hostnames via CoreDNS.



TASK-023: Ingress-NGINX to Frontend Inbound Routing NetworkPolicy
Domain / Module: Network Security / Ingress Traffic
Dependencies: TASK-021
Exact Technical Specification:
* Create k8s/network-policies/02-allow-ingress-to-frontend.yaml allowing ingress to app=lingo-frontend on TCP port 3000 solely from pods labeled app.kubernetes.io/name: ingress-nginx.
Acceptance Criteria & Validation:
* Traffic originating from Ingress controller connects to frontend port 3000; direct pod-to-pod traffic from other namespaces is rejected.



TASK-024: Frontend to Python Worker Intra-Namespace Policy
Domain / Module: Network Security / Internal Traffic
Dependencies: TASK-021
Exact Technical Specification:
* Create k8s/network-policies/03-allow-frontend-to-worker.yaml allowing ingress to app=lingo-worker on TCP port 8000 only from app=lingo-frontend in lingo-prod.
Acceptance Criteria & Validation:
* Frontend pod can HTTP/WebSocket connect to lingo-worker-service:8000; unauthorized pods receive connection timeout.



TASK-025: Python Worker Egress Policy for Convex DB & Moonshot API
Domain / Module: Network Security / External Egress
Dependencies: TASK-021
Exact Technical Specification:
* Create k8s/network-policies/04-allow-worker-egress-apis.yaml permitting egress from app=lingo-worker to external HTTPS port 443 (Convex DB cloud endpoints and Moonshot API).
Acceptance Criteria & Validation:
* Worker pod successfully reaches api.moonshot.cn:443 and Convex DB; non-443 outbound ports remain blocked.



TASK-026: Python Worker Egress Policy for S3/R2 Object Storage
Domain / Module: Network Security / External Egress
Dependencies: TASK-021
Exact Technical Specification:
* Create k8s/network-policies/05-allow-worker-egress-storage.yaml permitting egress from app=lingo-worker to port 443 destination CIDRs for Cloudflare R2 / AWS S3 storage buckets.
Acceptance Criteria & Validation:
* Audio clip uploads to S3/R2 succeed.



TASK-027: Cross-Namespace Isolation Rule (Blocking Easy CV Cross-Talk)
Domain / Module: Network Security / Multi-Tenant Isolation
Dependencies: TASK-021 through TASK-026
Exact Technical Specification:
* Create k8s/network-policies/06-block-cross-namespace-easycv.yaml verifying no ingress or egress rules match namespace easycv.
Acceptance Criteria & Validation:
* kubectl exec -n easycv -- curl -m 2 http://lingo-worker-service.lingo-prod:8000 times out and is dropped.



TASK-028: Cilium L7 NetworkPolicy with HTTP Path & Method Whitelisting
Domain / Module: Network Security / Cilium L7
Dependencies: TASK-024
Exact Technical Specification:
* Create k8s/network-policies/cilium-l7-worker-policy.yaml (CiliumNetworkPolicy) restricting calls from frontend to worker strictly to GET /healthz, POST /api/v1/srs/*, and GET /api/v1/ws/roleplay with WebSocket upgrade headers.
Acceptance Criteria & Validation:
* cilium policy validate k8s/network-policies/cilium-l7-worker-policy.yaml passes. Non-whitelisted HTTP methods are blocked at proxy layer.



TASK-029: Hubble Flow Observability & Network Drops Monitoring Setup
Domain / Module: Observability / Cilium Hubble
Dependencies: TASK-028
Exact Technical Specification:
* Create k8s/observability/hubble-metrics-config.yaml enabling Hubble L7 metrics export (DNS, HTTP rate, drops) into Prometheus.
Acceptance Criteria & Validation:
* hubble observe --namespace lingo-prod --verdict DROPPED shows real-time drop telemetry.



TASK-030: Automated NetworkPolicy Validation & Connectivity Matrix Test
Domain / Module: Network Security / Validation
Dependencies: TASK-021 through TASK-029
Exact Technical Specification:
* Create scripts/test-network-policies.sh executing matrix connection tests between frontend, worker, easycv, and external endpoints.
Acceptance Criteria & Validation:
* Test script executes all 8 permutations and verifies exact expected pass/fail states.


Module 4: Ingress-NGINX & Gateway Traffic Architecture


TASK-031: Ingress-NGINX Controller Helm Values Customization
Domain / Module: Ingress / Helm Configuration
Dependencies: None
Exact Technical Specification:
* Create helm/ingress-nginx/values.yaml setting:
* controller.replicaCount: 2
* controller.minAvailable: 1
* controller.allowSnippetAnnotations: "false" (hardens against CVE snippet execution)
* controller.metrics.enabled: "true"
* controller.service.externalTrafficPolicy: "Local"
Acceptance Criteria & Validation:
* helm template ingress-nginx ingress-nginx/ingress-nginx -f helm/ingress-nginx/values.yaml generates valid Kubernetes manifests.



TASK-032: Proxy Buffer & Body Size Tuning for Audio Payloads
Domain / Module: Ingress / Tuning
Dependencies: TASK-031
Exact Technical Specification:
* Update helm/ingress-nginx/values.yaml with config map settings:
* proxy-body-size: "25m" (supports user voice audio uploads)
* proxy-buffer-size: "128k"
* proxy-buffers-number: "4"
* client-header-buffer-size: "64k"
Acceptance Criteria & Validation:
* Uploading a 20MB WAV test audio payload through Ingress passes without HTTP 413.



TASK-033: WebSocket Long-Lived Connection Timeouts Configuration
Domain / Module: Ingress / WebSocket Routing
Dependencies: TASK-031
Exact Technical Specification:
* Create k8s/base/ingress-worker.yaml with annotations:
* nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
* nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
* nginx.ingress.kubernetes.io/websocket-services: "lingo-worker-service"
Acceptance Criteria & Validation:
* WebSocket sessions remain active for > 30 minutes during roleplay pauses without timeout disconnects.



TASK-034: Client Real-IP & X-Forwarded-For Header Preservation
Domain / Module: Ingress / Networking
Dependencies: TASK-031
Exact Technical Specification:
* Configure use-forwarded-headers: "true" and compute-full-forwarded-for: "true" in helm/ingress-nginx/values.yaml.
Acceptance Criteria & Validation:
* Python worker logs display original client IP forwarded from Volterra edge nodes.



TASK-035: Ingress Resource for Frontend Routing (`lingo.yourdomain.com`)
Domain / Module: Ingress / Workloads
Dependencies: TASK-031
Exact Technical Specification:
* Create k8s/base/ingress-frontend.yaml routing host: lingo.yourdomain.com path / to lingo-frontend-service:80 with TLS secret lingo-tls-cert.
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/ingress-frontend.yaml -n lingo-prod passes.



TASK-036: Ingress Resource for Python Worker API & WebSockets
Domain / Module: Ingress / Workloads
Dependencies: TASK-031, TASK-033
Exact Technical Specification:
* Create k8s/base/ingress-worker.yaml routing host: lingo.yourdomain.com paths /api/py and /ws to lingo-worker-service:8000.
Acceptance Criteria & Validation:
* Ingress routes / to Next.js frontend and /api/py/* to FastAPI Python backend seamlessly.



TASK-037: Ingress Rate Limiting Annotations for Abuse Mitigation
Domain / Module: Ingress / Security
Dependencies: TASK-036
Exact Technical Specification:
* Add annotations in k8s/base/ingress-worker.yaml:
* nginx.ingress.kubernetes.io/limit-rps: "20"
* nginx.ingress.kubernetes.io/limit-connections: "10"
* nginx.ingress.kubernetes.io/limit-burst-multiplier: "3"
Acceptance Criteria & Validation:
* Exceeding 60 requests/sec triggers HTTP 429 Too Many Requests response from Ingress controller.



TASK-038: Custom Error Pages & 5xx Upstream Fallback Routing
Domain / Module: Ingress / User Experience
Dependencies: TASK-035
Exact Technical Specification:
* Create k8s/base/ingress-custom-errors.yaml with annotation nginx.ingress.kubernetes.io/custom-http-errors: "502,503,504" routing to an offline travel maintenance page.
Acceptance Criteria & Validation:
* Backend pod downtime serves graceful static fallback page instead of raw NGINX error.



TASK-039: Gzip & Brotli Compression Annotations for API Payloads
Domain / Module: Ingress / Optimization
Dependencies: TASK-035
Exact Technical Specification:
* Enable enable-brotli: "true" and enable-gzip: "true" with MIME types (application/json, text/html, application/javascript, text/css) in helm/ingress-nginx/values.yaml.
Acceptance Criteria & Validation:
* HTTP response header contains Content-Encoding: gzip or br for JSON payloads > 1KB.



TASK-040: Ingress Traffic Conformance & Routing Header Verification Script
Domain / Module: Ingress / Validation
Dependencies: TASK-031 through TASK-039
Exact Technical Specification:
* Create scripts/test-ingress-routing.sh running cURL probes across all defined hostnames and path prefixes.
Acceptance Criteria & Validation:
* Validates status codes, TLS handshake, and header preservation across all endpoints.


Module 5: Cert-Manager, Automated TLS & Key Management


TASK-041: Cert-Manager Helm Deployment with Prometheus Metrics
Domain / Module: TLS Security / Helm
Dependencies: None
Exact Technical Specification:
* Create helm/cert-manager/values.yaml setting installCRDs: true, prometheus.enabled: true, replicaCount: 2.
Acceptance Criteria & Validation:
* helm template cert-manager jetstack/cert-manager -f helm/cert-manager/values.yaml validates cleanly.



TASK-042: Let's Encrypt Staging ACME ClusterIssuer (HTTP-01 Solver)
Domain / Module: TLS Security / ACME Issuer
Dependencies: TASK-041
Exact Technical Specification:
* Create k8s/cert-manager/issuer-staging.yaml:
* Server: https://acme-staging-v02.api.letsencrypt.org/directory
* Solver: http01.ingress.class: nginx
Acceptance Criteria & Validation:
* kubectl apply -f k8s/cert-manager/issuer-staging.yaml registers ClusterIssuer in Ready: True state.



TASK-043: Let's Encrypt Production ACME ClusterIssuer (HTTP-01 Solver)
Domain / Module: TLS Security / ACME Issuer
Dependencies: TASK-041
Exact Technical Specification:
* Create k8s/cert-manager/issuer-prod.yaml:
* Server: https://acme-v02.api.letsencrypt.org/directory
* PrivateKeySecretRef: letsencrypt-prod-account-key
Acceptance Criteria & Validation:
* ClusterIssuer registers and reports valid registration with Let's Encrypt servers.



TASK-044: DNS-01 Solver ClusterIssuer for Wildcard SANs (Vultr / Cloudflare)
Domain / Module: TLS Security / DNS Solver
Dependencies: TASK-041
Exact Technical Specification:
* Create k8s/cert-manager/issuer-dns01.yaml utilizing API token stored in k8s/cert-manager/dns-secret.yaml for automated TXT record resolution.
Acceptance Criteria & Validation:
* DNS-01 solver completes validation for wildcard domain *.lingo.yourdomain.com.



TASK-045: Production TLS Certificate Resource for Application Domains
Domain / Module: TLS Security / Certificate
Dependencies: TASK-043
Exact Technical Specification:
* Create k8s/base/certificate-prod.yaml in namespace lingo-prod:
* secretName: lingo-tls-cert
* dnsNames: ["lingo.yourdomain.com", "api.lingo.yourdomain.com"]
* issuerRef.name: letsencrypt-prod
* issuerRef.kind: ClusterIssuer
Acceptance Criteria & Validation:
* kubectl describe certificate lingo-tls-cert -n lingo-prod shows CertificateIssued: True.



TASK-046: Staging TLS Certificate Resource for Pre-Production Validation
Domain / Module: TLS Security / Certificate
Dependencies: TASK-042
Exact Technical Specification:
* Create k8s/overlays/staging/certificate.yaml targeting staging issuer.
Acceptance Criteria & Validation:
* Staging certificate creates staging secret without exhausting Let's Encrypt production rate limits.



TASK-047: Automated Certificate Renewal & Expiry Alerting Configuration
Domain / Module: Observability / TLS Alerts
Dependencies: TASK-045
Exact Technical Specification:
* Create k8s/observability/prometheus-cert-alerts.yaml defining alert CertExpiryLessThan15Days triggering if certmanager_certificate_expiration_timestamp_seconds - time() < 1296000.
Acceptance Criteria & Validation:
* promtool check rules k8s/observability/prometheus-cert-alerts.yaml passes.



TASK-048: TLS Cipher Suites & Modern TLS 1.3 Strict Enforcement
Domain / Module: TLS Security / Hardening
Dependencies: TASK-031, TASK-045
Exact Technical Specification:
* Configure ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384" and ssl-protocols: "TLSv1.2 TLSv1.3" in Ingress-NGINX values.
Acceptance Criteria & Validation:
* SSL Labs test or testssl.sh verifies SSLv3, TLS 1.0, and TLS 1.1 are completely disabled.



TASK-049: Secret Synchronizer / Reflector for Wildcard Cert Sharing
Domain / Module: TLS Security / Automation
Dependencies: TASK-045
Exact Technical Specification:
* Create k8s/cert-manager/reflector-config.yaml using Emberstack Reflector annotations to mirror lingo-tls-cert across development and monitoring namespaces securely.
Acceptance Criteria & Validation:
* Updated secret in lingo-prod propagates to mirror namespaces in < 5 seconds.



TASK-050: TLS Handshake & Certificate Expiry Automated Health Check
Domain / Module: TLS Security / Verification
Dependencies: TASK-041 through TASK-049
Exact Technical Specification:
* Create scripts/verify-tls.sh using openssl s_client verifying certificate subject, validity days remaining, and TLS 1.3 cipher negotiation.
Acceptance Criteria & Validation:
* Script exits with 0 and prints full certificate chain details.


Module 6: Volterra (F5 Distributed Cloud) Edge Mesh & CDN


TASK-051: Volterra Origin Pool Specification for Vultr K8s Ingress
Domain / Module: Edge Mesh / Origin Pool
Dependencies: TASK-035, TASK-045
Exact Technical Specification:
* Create volterra/origin-pool.json:
* name: lingo-k8s-origin
* origin_servers: Public IP/CNAME of Kubernetes Ingress nodes
* port: 443
* use_tls: true
* tls_config.skip_server_verification: false
Acceptance Criteria & Validation:
* Schema validated via Volterra API client tool: jq . volterra/origin-pool.json returns valid structure.



TASK-052: Origin Pool Health Monitor (TCP & HTTP GET `/healthz`)
Domain / Module: Edge Mesh / Health Monitoring
Dependencies: TASK-051
Exact Technical Specification:
* Create volterra/health-monitor.json:
* Type: HTTP
* Path: /healthz
* Expected Status Code: 200
* Interval: 10s, Timeout: 3s, Healthy Threshold: 2, Unhealthy Threshold: 3
Acceptance Criteria & Validation:
* Volterra console / API confirms Origin Pool status reports HEALTHY.



TASK-053: Volterra HTTP Load Balancer Base Configuration
Domain / Module: Edge Mesh / Load Balancer
Dependencies: TASK-051, TASK-052
Exact Technical Specification:
* Create volterra/http-loadbalancer.json:
* Domains: ["lingo.yourdomain.com"]
* Downstream: HTTPS with auto-certificate
* Default Origin Pool: lingo-k8s-origin
Acceptance Criteria & Validation:
* volterra-cli apply -f volterra/http-loadbalancer.json creates active load balancer object.



TASK-054: Web Application Firewall (WAF) Policy in Blocking Mode
Domain / Module: Edge Security / WAF
Dependencies: TASK-053
Exact Technical Specification:
* Create volterra/waf-policy.json enabling App Firewall in BLOCKING mode with high sensitivity against SQLi, XSS, command injection, and malicious user agents.
Acceptance Criteria & Validation:
* Simulated SQLi probe (curl "https://lingo.yourdomain.com/?id=1%20OR%201=1") returns HTTP 403 Forbidden generated by Volterra Edge.



TASK-055: Volterra Edge Caching Rules for Static Next.js Assets
Domain / Module: Edge Optimization / Caching
Dependencies: TASK-053
Exact Technical Specification:
* Create volterra/cache-rules-static.json:
* Route: /_next/static/*
* Cache TTL: 2592000s (30 days)
* Honor Client Cache-Control: false
* Strip Cookie Headers: true
Acceptance Criteria & Validation:
* Response header for JS/CSS assets shows x-volterra-cache: HIT.



TASK-056: Volterra Edge Caching Rules for Audio Assets (`/audio/*`, `.mp3`)
Domain / Module: Edge Optimization / Caching
Dependencies: TASK-053
Exact Technical Specification:
* Create volterra/cache-rules-audio.json:
* Match: /audio/*, *.mp3, *.opus
* Cache TTL: 604800s (7 days)
* Range Request Support: true (enables audio byte-range streaming)
Acceptance Criteria & Validation:
* Repeated audio clip downloads return x-volterra-cache: HIT with Accept-Ranges: bytes.



TASK-057: Volterra Dynamic API Route Bypass & WebSocket Proxying
Domain / Module: Edge Routing / WebSockets
Dependencies: TASK-053
Exact Technical Specification:
* Create volterra/routes-dynamic.json:
* Paths: /api/*, /ws/*
* Cache: NO_CACHE
* WebSocket Support: ENABLED
* Idle Timeout: 3600s
Acceptance Criteria & Validation:
* Real-time WebSocket connection to voice roleplay endpoint establishes and maintains persistent streaming state through Volterra edge nodes.



TASK-058: Volterra Rate Limiting & Bot Defense Layer Configuration
Domain / Module: Edge Security / Bot Defense
Dependencies: TASK-053
Exact Technical Specification:
* Create volterra/bot-defense.json configuring JavaScript challenge for untrusted scrapers and IP rate limit of 100 requests/minute per client IP.
Acceptance Criteria & Validation:
* Automated headless bot scraper receives challenge page while legitimate browser passes cleanly.



TASK-059: Custom Domain DNS Delegation & CNAME Routing Specification
Domain / Module: Edge Mesh / DNS
Dependencies: TASK-053
Exact Technical Specification:
* Create volterra/dns-delegation.md documenting CNAME mapping from lingo.yourdomain.com to Volterra tenant edge endpoint (lingo.ves.volterra.io).
Acceptance Criteria & Validation:
* dig CNAME lingo.yourdomain.com resolves to Volterra edge domain.



TASK-060: Multi-Region Edge Failover & Zero-Downtime Origin Switching
Domain / Module: Edge Mesh / High Availability
Dependencies: TASK-051, TASK-053
Exact Technical Specification:
* Update volterra/origin-pool.json with backup origin pool pointing to secondary cluster region with automatic health-check failover weighting.
Acceptance Criteria & Validation:
* Simulating primary cluster endpoint down automatically shifts edge traffic to backup pool in < 5 seconds.



TASK-061: Volterra Client TLS Termination & Modern Cipher Profile
Domain / Module: Edge Security / TLS
Dependencies: TASK-053
Exact Technical Specification:
* Configure TLS Termination Profile in volterra/http-loadbalancer.json with automatic certificate renewal and TLS 1.3 preference.
Acceptance Criteria & Validation:
* SSL Labs scan on lingo.yourdomain.com achieves A+ rating.



TASK-062: HTTP-to-HTTPS Automatic Redirect & HSTS Header Injection
Domain / Module: Edge Security / Headers
Dependencies: TASK-053
Exact Technical Specification:
* Configure http_redirect: true and response headers injection in volterra/http-loadbalancer.json: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload.
Acceptance Criteria & Validation:
* curl -I http://lingo.yourdomain.com returns HTTP 301 redirect to HTTPS with HSTS header present.



TASK-063: Volterra Security Events & Threat Analytics Export
Domain / Module: Observability / SIEM
Dependencies: TASK-054, TASK-058
Exact Technical Specification:
* Create volterra/log-receiver.json configuring HTTP log streaming to Grafana Loki / SIEM endpoint for real-time edge security telemetry.
Acceptance Criteria & Validation:
* Blocked WAF security events stream into log ingestion within 10 seconds.



TASK-064: Volterra Synthetic Uptime Monitor & Alerting Webhooks
Domain / Module: Observability / Synthetic Probing
Dependencies: TASK-053
Exact Technical Specification:
* Create volterra/synthetic-monitor.json running global multi-region HTTP probes every 60s, triggering webhook alerts if global availability drops below 99.9%.
Acceptance Criteria & Validation:
* Synthetic probe logs visible in Volterra observability dashboard.



TASK-065: Automated Volterra API Configuration Verification Script
Domain / Module: Edge Mesh / Validation
Dependencies: TASK-051 through TASK-064
Exact Technical Specification:
* Create scripts/verify-volterra.sh querying Volterra REST API to assert status of origin pools, load balancers, WAF rules, and cache hit ratios.
Acceptance Criteria & Validation:
* Script outputs JSON validation report confirming 100% operational health across all edge policies.


Module 7: Containerization & Multi-Stage Docker Architecture


TASK-066: Multi-Stage Next.js Production Dockerfile with Bun
Domain / Module: Containerization / Frontend
Dependencies: None
Exact Technical Specification:
* Create web/Dockerfile:
* Stage 1 (deps): oven/bun:1.1-alpine, runs bun install --frozen-lockfile.
* Stage 2 (builder): Runs bun run build generating standalone output in .next/standalone.
* Stage 3 (runner): Alpine base with non-root user nodejs (UID 1001), copies .next/standalone and public/.
Acceptance Criteria & Validation:
* docker build -t lingo-frontend:prod -f web/Dockerfile ./web builds with zero errors; image size is < 180MB.



TASK-067: Next.js Standalone Output & Asset Optimization Config
Domain / Module: Containerization / Frontend Optimization
Dependencies: TASK-066
Exact Technical Specification:
* Configure web/next.config.mjs with output: "standalone", compress: true, poweredByHeader: false, and image optimization domains.
Acceptance Criteria & Validation:
* Running standalone server.js starts web server without requiring root node_modules.



TASK-068: Frontend Non-Root User & Read-Only Root Filesystem Configuration
Domain / Module: Container Security / Frontend
Dependencies: TASK-066
Exact Technical Specification:
* In web/Dockerfile, configure user USER nodejs:nodejs and configure /tmp and .next/cache as separate writable tmpfs mount points.
Acceptance Criteria & Validation:
* docker run --read-only --user 1001:1001 lingo-frontend:prod launches and serves traffic cleanly.



TASK-069: Multi-Stage Python 3.13 FastAPI Dockerfile with `uv`
Domain / Module: Containerization / Backend
Dependencies: None
Exact Technical Specification:
* Create api/Dockerfile:
* Stage 1 (builder): ghcr.io/astral-sh/uv:python3.13-bookworm-slim, compiles dependencies with uv sync --frozen --no-dev.
* Stage 2 (runner): Copies /app/.venv, non-root user appuser (UID 10001), entrypoint uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2.
Acceptance Criteria & Validation:
* docker build -t lingo-worker:prod -f api/Dockerfile ./api succeeds; image size < 350MB.



TASK-070: Python Virtualenv Freezing & Minimal Distroless Runner Layer
Domain / Module: Containerization / Optimization
Dependencies: TASK-069
Exact Technical Specification:
* Configure uv export --frozen --no-dev --format requirements-txt in builder stage to guarantee deterministic binary package hashes.
Acceptance Criteria & Validation:
* All Python packages match strict lockfile hashes without dynamic compile steps in production runner.



TASK-071: Python Worker Non-Root Execution & Ephemeral Cache Mounts
Domain / Module: Container Security / Backend
Dependencies: TASK-069
Exact Technical Specification:
* Add security directives in api/Dockerfile:
* Drop all root capabilities.
* Mount /tmp/audio_cache as tmpfs volume for temporary speech chunk processing.
Acceptance Criteria & Validation:
* Running container as non-root executes audio processing without filesystem permission errors.



TASK-072: Multi-Architecture Buildx Configuration (`linux/amd64`, `linux/arm64`)
Domain / Module: Containerization / Buildx
Dependencies: TASK-066, TASK-069
Exact Technical Specification:
* Create scripts/build-multiarch.sh configuring docker buildx create --use and building multi-arch manifests for both web and api.
Acceptance Criteria & Validation:
* docker buildx imagetools inspect confirms both linux/amd64 and linux/arm64 platform digests exist in manifest list.



TASK-073: Local Docker Compose Simulation Linking Frontend and Python API
Domain / Module: Developer Experience / Compose
Dependencies: TASK-066, TASK-069
Exact Technical Specification:
* Create docker-compose.yml defining services web (port 3000), api (port 8000), and mock-s3 on shared bridge network lingo-dev-net.
Acceptance Criteria & Validation:
* docker compose up -d boots all services; frontend can reach Python backend at http://api:8000.



TASK-074: Container Vulnerability Scanning via Trivy in CI Stage
Domain / Module: Container Security / Scanning
Dependencies: TASK-066, TASK-069
Exact Technical Specification:
* Create scripts/scan-images.sh executing trivy image --severity HIGH,CRITICAL --exit-code 1 .
Acceptance Criteria & Validation:
* Trivy scan detects 0 CRITICAL vulnerabilities in both production base images.



TASK-075: Software Bill of Materials (SBOM) Generation via Syft
Domain / Module: Container Security / SBOM
Dependencies: TASK-066, TASK-069
Exact Technical Specification:
* Create scripts/generate-sbom.sh generating SPDX JSON SBOMs (sbom-frontend.json, sbom-worker.json) using syft packages docker:.
Acceptance Criteria & Validation:
* Output SBOM files contain comprehensive license and package inventories.


Module 8: Workload Deployments, Lifecycle & Health Probes


TASK-076: Next.js Frontend Deployment Specification with RollingUpdate
Domain / Module: Kubernetes Workloads / Frontend
Dependencies: TASK-001, TASK-003, TASK-011, TASK-066
Exact Technical Specification:
* Create k8s/base/deployment-frontend.yaml:
* replicas: 2
* strategy.type: RollingUpdate (maxSurge: 1, maxUnavailable: 0)
* securityContext: runAsNonRoot: true, runAsUser: 1001, readOnlyRootFilesystem: true
* serviceAccountName: lingo-frontend-sa
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/deployment-frontend.yaml -n lingo-prod passes.



TASK-077: Frontend Health Probes (Startup, Liveness, Readiness)
Domain / Module: Kubernetes Workloads / Health
Dependencies: TASK-076
Exact Technical Specification:
* In k8s/base/deployment-frontend.yaml, define probes targeting /api/health:
* startupProbe: httpGet.port: 3000, periodSeconds: 2, failureThreshold: 15
* readinessProbe: httpGet.port: 3000, periodSeconds: 5, timeoutSeconds: 2
* livenessProbe: httpGet.port: 3000, periodSeconds: 10, timeoutSeconds: 2
Acceptance Criteria & Validation:
* Pod reports Ready only after /api/health returns HTTP 200.



TASK-078: Python Worker Deployment Specification with ConfigMap/Secret Mounts
Domain / Module: Kubernetes Workloads / Backend
Dependencies: TASK-001, TASK-003, TASK-012, TASK-069
Exact Technical Specification:
* Create k8s/base/deployment-worker.yaml:
* replicas: 2
* serviceAccountName: lingo-worker-sa
* Environment variables sourced from lingo-worker-config ConfigMap and lingo-worker-secrets Secret.
* Ephemeral emptyDir volume mounted to /tmp/audio_cache.
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/deployment-worker.yaml -n lingo-prod validates.



TASK-079: Python Worker Startup & Deep Readiness Probes
Domain / Module: Kubernetes Workloads / Health
Dependencies: TASK-078
Exact Technical Specification:
* In k8s/base/deployment-worker.yaml, configure:
* startupProbe: httpGet.path: /healthz, port: 8000, failureThreshold: 30
* readinessProbe: httpGet.path: /readyz (checks S3 & Moonshot connectivity), periodSeconds: 10
* livenessProbe: httpGet.path: /healthz, periodSeconds: 15
Acceptance Criteria & Validation:
* Worker pod removes itself from endpoints if upstream dependency check fails on /readyz.



TASK-080: Graceful Termination Hooks & WebSocket Drain Lifecycle Handling
Domain / Module: Kubernetes Workloads / Lifecycle
Dependencies: TASK-078
Exact Technical Specification:
* In k8s/base/deployment-worker.yaml, add lifecycle hook:
`yaml
lifecycle:
preStop:
exec:
command: ["/bin/sh", "-c", "python -m app.scripts.drain_connections --timeout 30"]
`
Acceptance Criteria & Validation:
* During rolling update, active speech streams complete gracefully before container receives SIGKILL.



TASK-081: Pod Disruption Budgets (PDB) for Zero-Downtime Maintenance
Domain / Module: Kubernetes Workloads / High Availability
Dependencies: TASK-076, TASK-078
Exact Technical Specification:
* Create k8s/base/pdb.yaml:
* lingo-frontend-pdb: minAvailable: 1, selector app: lingo-frontend
* lingo-worker-pdb: minAvailable: 1, selector app: lingo-worker
Acceptance Criteria & Validation:
* kubectl drain --ignore-daemonsets respects PDB and evicts pods sequentially without downtime.



TASK-082: Pod Anti-Affinity Rules for Multi-Node Failure Domain Distribution
Domain / Module: Kubernetes Workloads / Scheduling
Dependencies: TASK-076, TASK-078
Exact Technical Specification:
* Add affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution matching topologyKey: "kubernetes.io/hostname" across all deployment specs.
Acceptance Criteria & Validation:
* Pod replicas are scheduled on separate physical Kubernetes worker nodes.



TASK-083: ConfigMap Definition for Frontend Environment Configurations
Domain / Module: Configuration / Frontend
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/configmap-frontend.yaml:
* NODE_ENV: "production"
* PORT: "3000"
* NEXT_PUBLIC_CONVEX_URL: "https://lingo.convex.cloud"
* PYTHON_API_URL: "http://lingo-worker-service.lingo-prod.svc.cluster.local:8000"
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/configmap-frontend.yaml -n lingo-prod passes.



TASK-084: ConfigMap Definition for Python NLP & Worker Configurations
Domain / Module: Configuration / Backend
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/configmap-worker.yaml:
* ENVIRONMENT: "production"
* PORT: "8000"
* LOG_LEVEL: "info"
* MAX_AUDIO_CHUNK_SIZE_BYTES: "5242880"
* DEFAULT_TTS_VOICE: "moonshot-v1-zh"
Acceptance Criteria & Validation:
* ConfigMap mounts into worker pods as environment variables cleanly.



TASK-085: SealedSecrets Template & Automated Decryption Pipeline
Domain / Module: Security / Secrets
Dependencies: TASK-001
Exact Technical Specification:
* Create k8s/base/sealed-secrets.template.yaml defining encrypted secret schema for MOONSHOT_API_KEY, CONVEX_DEPLOY_KEY, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
Acceptance Criteria & Validation:
* SealedSecrets controller decrypts secret into Kubernetes Secret lingo-worker-secrets in lingo-prod.


Module 9: Autoscaling, Compute Optimization & Node Scheduling


TASK-086: Horizontal Pod Autoscaler (HPA v2) for Frontend Workload
Domain / Module: Autoscaling / Frontend
Dependencies: TASK-076
Exact Technical Specification:
* Create k8s/base/hpa-frontend.yaml:
* minReplicas: 2, maxReplicas: 6
* Metrics: Average CPU utilization 75%, Average Memory utilization 80%
* ScaleDown stabilization window: 300s
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/base/hpa-frontend.yaml -n lingo-prod validates against autoscaling/v2.



TASK-087: Horizontal Pod Autoscaler (HPA v2) for Python Worker Workload
Domain / Module: Autoscaling / Backend
Dependencies: TASK-078
Exact Technical Specification:
* Create k8s/base/hpa-worker.yaml:
* minReplicas: 2, maxReplicas: 8
* Metrics: Average CPU utilization 70%, Average Memory 75%
* ScaleUp behavior: pods: 2 every 15s
Acceptance Criteria & Validation:
* Synthetic CPU load triggers automatic scaling from 2 to 4 worker pods within 60s.



TASK-088: Custom Metric Adapter for WebSocket Active Sessions HPA
Domain / Module: Autoscaling / Custom Metrics
Dependencies: TASK-087
Exact Technical Specification:
* Create k8s/base/hpa-worker-custom.yaml defining Prometheus metric rule active_websocket_sessions_per_pod targeting 25 concurrent audio streams per pod.
Acceptance Criteria & Validation:
* HPA queries custom metric API and scales worker deployment based on real-time stream count.



TASK-089: Vultr Kubernetes Engine (VKE) Cluster Autoscaler Configuration
Domain / Module: Cloud Infrastructure / Autoscaler
Dependencies: None
Exact Technical Specification:
* Create vultr/cluster-autoscaler-values.yaml configuring VKE node pool auto-expansion from 3 to 8 worker nodes (vc2-4c-8gb) upon pod scheduling failure.
Acceptance Criteria & Validation:
* Unschedulable pods due to ResourceQuota exhaustion trigger automatic provisioning of new VKE node.



TASK-090: Node Pool Partitioning (General Compute vs AI Inference Nodes)
Domain / Module: Infrastructure / Node Architecture
Dependencies: TASK-089
Exact Technical Specification:
* Create node pool labels: workload-type=general for frontend and workload-type=ai-inference for Python speech/TTS worker pods.
Acceptance Criteria & Validation:
* kubectl get nodes -L workload-type displays distinct node pool classifications.



TASK-091: Node Taints, Tolerations & NodeAffinity Rules
Domain / Module: Infrastructure / Scheduling
Dependencies: TASK-090
Exact Technical Specification:
* In k8s/base/deployment-worker.yaml, add tolerations for key: "ai-workload", operator: "Exists", effect: "NoSchedule" and nodeAffinity for workload-type=ai-inference.
Acceptance Criteria & Validation:
* Worker pods land exclusively on dedicated AI compute nodes; general workloads cannot be scheduled on AI nodes.



TASK-092: Vertical Pod Autoscaler (VPA) in Recommendation Mode
Domain / Module: Optimization / Sizing
Dependencies: TASK-076, TASK-078
Exact Technical Specification:
* Create k8s/base/vpa-recommendations.yaml (updateMode: "Off") tracking actual CPU/memory consumption to output optimal resource request suggestions.
Acceptance Criteria & Validation:
* kubectl describe vpa lingo-worker-vpa -n lingo-prod outputs target sizing recommendations.


Module 10: Observability, Alerting, Logging & CI/CD Rollout


TASK-093: Kube-Prometheus-Stack Helm Values & Multi-Tenant Scrape Scoping
Domain / Module: Observability / Monitoring
Dependencies: None
Exact Technical Specification:
* Create helm/prometheus/values.yaml configuring Prometheus server with retention 30d, persistent storage 50Gi, and serviceMonitorNamespaceSelector: {}.
Acceptance Criteria & Validation:
* Prometheus server successfully scrapes targets in lingo-prod.



TASK-094: ServiceMonitor Resource for Next.js Metrics Exporter
Domain / Module: Observability / Monitoring
Dependencies: TASK-076, TASK-093
Exact Technical Specification:
* Create k8s/observability/servicemonitor-frontend.yaml scraping port 3000 /api/metrics every 15s.
Acceptance Criteria & Validation:
* Next.js HTTP request duration and memory metrics appear in Prometheus target dashboard.



TASK-095: ServiceMonitor Resource for Python FastAPI Metrics
Domain / Module: Observability / Monitoring
Dependencies: TASK-078, TASK-093
Exact Technical Specification:
* Create k8s/observability/servicemonitor-worker.yaml scraping port 8000 /metrics every 15s (tracking TTS latency, STT inference duration, and active WebSockets).
Acceptance Criteria & Validation:
* Prometheus targets list shows lingo-worker-service with state UP.



TASK-096: Custom PrometheusRule Alerts (5xx Rates, Latency Spikes, CrashLoops)
Domain / Module: Observability / Alerting
Dependencies: TASK-093
Exact Technical Specification:
* Create k8s/observability/prometheus-rules.yaml:
* LingoHighHttp5xxRate: 5xx rate > 2% over 5m
* LingoSpeechLatencyP95TooHigh: TTS audio stream p95 latency > 2.0s over 5m
* LingoPodCrashLooping: Restarts > 3 within 10m
Acceptance Criteria & Validation:
* promtool check rules k8s/observability/prometheus-rules.yaml passes syntax validation.



TASK-097: Production Grafana Dashboard Definition
Domain / Module: Observability / Dashboards
Dependencies: TASK-093, TASK-094, TASK-095
Exact Technical Specification:
* Create k8s/observability/grafana-dashboard-lingo.json with panels:
* Request Rate & HTTP Status Codes (2xx, 4xx, 5xx)
* p50 / p95 / p99 Ingress & Python Worker Latency
* Real-Time WebSocket Voice Streams Counter
* CPU & Memory Usage vs ResourceQuota Limits
Acceptance Criteria & Validation:
* Dashboard JSON imports into Grafana with all panel queries rendering active telemetry.



TASK-098: GitHub Actions Multi-Stage CI Pipeline
Domain / Module: CI/CD / Automated Testing
Dependencies: TASK-066, TASK-069
Exact Technical Specification:
* Create .github/workflows/infra-ci.yml:
* Lints all Kubernetes manifests using kubeconform with strict schemas.
* Validates Kustomize overlays: kustomize build k8s/overlays/prod.
* Runs Trivy vulnerability scans on generated container images.
Acceptance Criteria & Validation:
* Pull request checks enforce 100% pass rate before merging to main.



TASK-099: GitHub Actions CD Workflow with Automated Rollout Verification
Domain / Module: CI/CD / Deployment
Dependencies: TASK-076, TASK-078, TASK-098
Exact Technical Specification:
* Create .github/workflows/deploy-k8s.yml:
* Triggered on merge to main.
* Applies Kustomize production manifests to VKE cluster.
* Executes kubectl rollout status deployment/lingo-frontend -n lingo-prod --timeout=180s.
* Executes kubectl rollout status deployment/lingo-worker -n lingo-prod --timeout=180s.
* Triggers automatic rollback if health probes fail.
Acceptance Criteria & Validation:
* Successful automated zero-downtime deployment verified on master branch commit.



TASK-100: Master Cluster Deployment, Reconciliation & Health Check CLI Tool
Domain / Module: Operations / Automation
Dependencies: TASK-001 through TASK-099
Exact Technical Specification:
* Create scripts/cluster-health.sh:
* Queries namespace health across lingo-prod, easycv, and ingress-nginx.
* Inspects Volterra edge origin connectivity, cert-manager certificate status, and HPA target utilization.
* Outputs a comprehensive green/red CLI diagnostic table.
Acceptance Criteria & Validation:
* Running bash scripts/cluster-health.sh exits 0 when all 100 infrastructure components, network policies, issuers, and ingress routes are fully reconciled and healthy.
Track 2 of 10
Track 2: Docker Containerization, Multi-Arch Image Pipelines & GitHub Actions CI/CD
Technical Specification: Track 2 — Docker Containerization, Multi-Arch Image Pipelines & GitHub Actions CI/CD

This document provides an exhaustive, granular breakdown of 100 distinct micro-tasks (TASK-CI-001 through TASK-CI-100) for Track 2 of the Asian Language Learning Platform, engineered to run alongside [Easy CV - Technical Architecture & Project Blueprint](https://docs.google.com/document/d/116iOeXoI5aBulT8SaAYBeVsyi0M1VZ4KH4YyoJTkveA/edit?usp=drivesdk&ouid=108018036596709366729) and integrated with the master specification [Asian Language Learning Platform - Complete Engineering Specification & 100 Micro-Tasks](https://docs.google.com/document/d/1BvhNXtnSF5m84NLakkdHd_weZ2RXIrfeCeDIBa0cuaY/edit?usp=drivesdk&ouid=108018036596709366729).


Architecture Overview & Sub-Track Map

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │                                       TRACK 2: 100 MICRO-TASKS MATRIX                                    │ ├────────────────────────────┬─────────────┬───────────────────────────────────────────────────────────────┤ │ Sub-Track                  │ Task Range  │ Core Focus                                                    │ ├────────────────────────────┼─────────────┼───────────────────────────────────────────────────────────────┤ │ A: Dockerfile Architecture │ 001 – 020   │ Next.js 16 (Bun) & Python 3.13 (uv) multi-stage builds        │ │ B: Multi-Arch & Buildx     │ 021 – 040   │ Docker buildx, QEMU, GHA layer caching, GHCR tagging          │ │ C: Security & Signing      │ 041 – 060   │ Trivy scans, CycloneDX SBOMs, Cosign OIDC keyless signing     │ │ D: CI Quality Gates        │ 061 – 080   │ PR linting, strict typechecks, pytest, Playwright E2E, Convex │ │ E: CD Rollout & Rollbacks  │ 081 – 100   │ Staging/Prod K8s rollout, automatic rollback, smoke tests     │ └────────────────────────────┴─────────────┴───────────────────────────────────────────────────────────────┘


Sub-Track A: Dockerfile Architecture & Container Optimization (TASK-CI-001 to TASK-CI-020)

TASK-CI-001: Next.js 16 Standalone Output Configuration
Module: Frontend Containerization
Dependencies: None
Technical Specification:
* Modify web/next.config.mjs to add output: "standalone" and experimental: { outputFileTracingRoot: path.join(__dirname, "../") }.
* Ensure static assets are copied to standalone folder during build.
Acceptance Criteria & Validation:
* Running bun run build generates .next/standalone with self-contained server.js.
* Command: cd web && bun run build && test -f .next/standalone/server.js


TASK-CI-002: Next.js Monorepo Sub-Directory `.dockerignore`
Module: Container Build Context
Dependencies: TASK-CI-001
Technical Specification:
* Create web/.dockerignore ignoring: node_modules, .next, .git, .github, coverage, *.log, .env*.local, e2e, playwright-report.
Acceptance Criteria & Validation:
* Build context transferred to daemon is $< 10\text{ MB}$.
* Command: docker build --no-cache -f web/Dockerfile ./web 2>&1 | grep "transferring context"


TASK-CI-003: Next.js Base & Dependency Stage with Bun
Module: Frontend Containerization
Dependencies: TASK-CI-002
Technical Specification:
* Create web/Dockerfile Stage 1 (base): Use oven/bun:1.1-alpine AS base. Set WORKDIR /app, copy package.json, bun.lockb (or bun.lock), and run bun install --frozen-lockfile.
Acceptance Criteria & Validation:
* Dependencies install cleanly in Alpine environment without build tools errors.
* Command: docker build --target base -f web/Dockerfile ./web


TASK-CI-004: Next.js Production Build Stage with Bun
Module: Frontend Containerization
Dependencies: TASK-CI-003
Technical Specification:
* Add Stage 2 (builder) to web/Dockerfile: Inherit from base, copy application source code (src, public, next.config.mjs, tsconfig.json, tailwind.config.ts), set NODE_ENV=production, and run bun run build.
Acceptance Criteria & Validation:
* Next.js standalone build executes with exit code 0.
* Command: docker build --target builder -f web/Dockerfile ./web


TASK-CI-005: Next.js Minimal Runtime Stage with Unprivileged User
Module: Frontend Containerization
Dependencies: TASK-CI-004
Technical Specification:
* Add Stage 3 (runner) to web/Dockerfile: Use oven/bun:1.1-alpine. Create system group nodejs (GID 1001) and user nextjs (UID 1001). Copy .next/standalone, .next/static, and public. Set USER nextjs, expose port 3000, and define CMD ["bun", "server.js"].
Acceptance Criteria & Validation:
* Container runs as non-root UID 1001 and final image size is $< 180\text{ MB}$.
* Command: docker run --rm lingo-frontend id | grep "uid=1001(nextjs)"


TASK-CI-006: Next.js HTTP Health Check Endpoint & In-Container Probe
Module: Frontend Reliability
Dependencies: TASK-CI-005
Technical Specification:
* Create web/src/app/api/health/route.ts returning JSON {"status":"ok","timestamp":"...","uptime":process.uptime()} with HTTP 200.
* Add HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://localhost:3000/api/health || exit 1 to web/Dockerfile.
Acceptance Criteria & Validation:
* Healthcheck transitions container status to healthy.
* Command: docker inspect --format='{{.State.Health.Status}}' | grep "healthy"


TASK-CI-007: Bun Server Process Signal Handling & Tini Integration
Module: Container Runtime
Dependencies: TASK-CI-005
Technical Specification:
* Install tini in web/Dockerfile runner stage: apk add --no-cache tini. Set ENTRYPOINT ["/sbin/tini", "--"] to properly handle SIGTERM and SIGINT forwarding.
Acceptance Criteria & Validation:
* Container stops within 2 seconds upon docker stop without being killed by SIGKILL.
* Command: time docker stop lingo-frontend


TASK-CI-008: Python 3.13 UV Package Manager Configuration
Module: Backend Containerization
Dependencies: None
Technical Specification:
* Create api/pyproject.toml targeting Python 3.13, specifying FastAPI, Pydantic v2, Uvicorn, httpx, tenacity, faster-whisper, numpy, and dev tools (ruff, mypy, pytest).
* Generate frozen lockfile api/uv.lock via uv lock.
Acceptance Criteria & Validation:
* uv lock --check confirms lockfile is consistent with pyproject.toml.
* Command: cd api && uv lock --check


TASK-CI-009: Python Microservice `.dockerignore` Definition
Module: Container Build Context
Dependencies: TASK-CI-008
Technical Specification:
* Create api/.dockerignore ignoring: .venv, __pycache__, *.pyc, .pytest_cache, .mypy_cache, .ruff_cache, .git, .env*, tests, htmlcov.
Acceptance Criteria & Validation:
* Docker context excludes local virtualenvs and build caches.
* Command: docker build --no-cache -f api/Dockerfile ./api 2>&1 | grep "transferring context"


TASK-CI-010: Python Base & UV Virtualenv Builder Stage
Module: Backend Containerization
Dependencies: TASK-CI-009
Technical Specification:
* Create api/Dockerfile Stage 1 (builder): Use ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder. Set WORKDIR /app, set UV_COMPILE_BYTECODE=1, UV_LINK_MODE=copy. Copy pyproject.toml and uv.lock. Execute uv sync --frozen --no-install-project --no-dev.
Acceptance Criteria & Validation:
* Virtualenv is built in /app/.venv with pre-compiled bytecode .pyc files.
* Command: docker build --target builder -f api/Dockerfile ./api


TASK-CI-011: Python Slim Runtime Stage with Non-Root Security Context
Module: Backend Containerization
Dependencies: TASK-CI-010
Technical Specification:
* Add Stage 2 (runner) to api/Dockerfile: Use python:3.13-slim-bookworm. Create group appgroup (GID 1001) and user appuser (UID 1001). Copy /app/.venv from builder to /app/.venv. Copy api/app into /app/app. Set PATH="/app/.venv/bin:$PATH", USER appuser, expose port 8000, and execute CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"].
Acceptance Criteria & Validation:
* Python container runs as UID 1001 with access only to /app.
* Command: docker run --rm lingo-worker python -c "import os; print(os.getuid())" | grep 1001


TASK-CI-012: Python FastAPI Liveness, Readiness & Startup Health Probe Handlers
Module: Backend Reliability
Dependencies: TASK-CI-011
Technical Specification:
* Create api/app/routers/health.py exposing:
* GET /healthz: Liveness probe (returns 200 immediately).
* GET /readyz: Readiness probe (validates S3 and LLM endpoint reachability).
* GET /startupz: Startup probe (verifies model weights and warmup).
* Register router in api/app/main.py. Add HEALTHCHECK command to api/Dockerfile.
Acceptance Criteria & Validation:
* Probes respond with expected HTTP 200 payloads.
* Command: curl -f http://localhost:8000/readyz


TASK-CI-013: Python Graceful Shutdown & ASGI Signal Handler
Module: Backend Runtime
Dependencies: TASK-CI-011
Technical Specification:
* Implement async lifespan context manager in api/app/main.py: Handle active WebSocket drains, close HTTP client pools (httpx.AsyncClient), and flush metrics on SIGTERM.
Acceptance Criteria & Validation:
* Active connections finish processing before Uvicorn shuts down cleanly within timeout window.
* Command: uv run pytest tests/test_lifespan.py


TASK-CI-014: Hadolint Dockerfile Linter Setup & Configuration
Module: Linting & Standards
Dependencies: TASK-CI-005, TASK-CI-011
Technical Specification:
* Create .hadolint.yaml setting rules: trustedRegistries: ["docker.io", "ghcr.io"], ignore rules DL3008 (pin versions in apt-get) where intentional, enforce DL3002 (non-root).
* Create script scripts/lint-dockerfiles.sh running hadolint against web/Dockerfile and api/Dockerfile.
Acceptance Criteria & Validation:
* Hadolint passes with 0 warnings or errors.
* Command: hadolint web/Dockerfile api/Dockerfile


TASK-CI-015: Local Multi-Service Container Emulation via Docker Compose
Module: Local Development & Compose
Dependencies: TASK-CI-005, TASK-CI-011
Technical Specification:
* Create docker-compose.yml defining services web (port 3000), api (port 8000), internal bridge network lingo-net, shared volume mounts, and local environment variables.
Acceptance Criteria & Validation:
* docker compose up -d starts both services, establishing inter-container networking.
* Command: docker compose up -d && docker compose ps | grep -E "Up|running"


TASK-CI-016: Local Container Health & Inter-Service Network Validation Script
Module: Local Quality Assurance
Dependencies: TASK-CI-015
Technical Specification:
* Create scripts/test-local-compose.sh: Boots containers via compose, polls health endpoints every 2s for 30s, tests frontend-to-backend internal HTTP request, and tears down stack.
Acceptance Criteria & Validation:
* Script exits with code 0 upon verifying both services.
* Command: bash scripts/test-local-compose.sh


TASK-CI-017: Dynamic Build-Time Environment Argument Handling
Module: Build Optimization
Dependencies: TASK-CI-004
Technical Specification:
* Add ARG NEXT_PUBLIC_APP_VERSION, ARG COMMIT_SHA, ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION to web/Dockerfile.
* Inject build args during build without baking private runtime secrets into image layers.
Acceptance Criteria & Validation:
* Version and commit metadata are accessible in Next.js bundle without leaking environment variables.
* Command: docker run --rm lingo-frontend env | grep "NEXT_PUBLIC_APP_VERSION"


TASK-CI-018: Container Ephemeral Filesystem Hardening
Module: Security Hardening
Dependencies: TASK-CI-005, TASK-CI-011
Technical Specification:
* Configure Dockerfiles to run under readOnlyRootFilesystem. Add VOLUME ["/tmp"] to web/Dockerfile and api/Dockerfile for writable temporary storage.
Acceptance Criteria & Validation:
* Containers run with --read-only --tmpfs /tmp without crashing.
* Command: docker run --rm --read-only --tmpfs /tmp lingo-worker python -c "print('ok')"


TASK-CI-019: Container Resource Footprint Benchmark & Memory Limit Script
Module: Performance Benchmarking
Dependencies: TASK-CI-016
Technical Specification:
* Create scripts/benchmark-containers.sh: Measures idle RAM/CPU footprint of lingo-frontend and lingo-worker under load using docker stats --no-stream.
Acceptance Criteria & Validation:
* Idle memory footprint: lingo-frontend $< 80\text{ MB}$, lingo-worker $< 120\text{ MB}$.
* Command: bash scripts/benchmark-containers.sh


TASK-CI-020: Unified Local Container Build & Syntax Check Script
Module: Build Automation
Dependencies: TASK-CI-001 through TASK-CI-019
Technical Specification:
* Create scripts/build-containers-local.sh: Runs Hadolint, builds both images locally with buildx, and validates healthcheck outputs.
Acceptance Criteria & Validation:
* Complete local build pipeline passes in $< 60$ seconds with cached layers.
* Command: bash scripts/build-containers-local.sh


Sub-Track B: Multi-Arch Buildx, QEMU & Layer Caching Pipelines (TASK-CI-021 to TASK-CI-040)

TASK-CI-021: GitHub Actions Docker Buildx Setup Action
Module: CI/CD Workflows
Dependencies: None
Technical Specification:
* Add docker/setup-buildx-action@v3 step to .github/workflows/build-images.yml specifying driver: docker-container with custom buildkit config enabling parallel downloads.
Acceptance Criteria & Validation:
* Step initializes buildx instance successfully in GitHub Actions runner.
* Command: docker buildx ls | grep -E "docker-container.*running"


TASK-CI-022: QEMU Multi-Architecture Emulation Setup Action
Module: CI/CD Workflows
Dependencies: TASK-CI-021
Technical Specification:
* Add docker/setup-qemu-action@v3 step to workflow with platforms: linux/amd64,linux/arm64.
Acceptance Criteria & Validation:
* QEMU binfmt handlers are registered for aarch64 and x86_64.
* Command: cat /proc/sys/fs/binfmt_misc/qemu-aarch64 | grep "enabled"


TASK-CI-023: GitHub Container Registry (GHCR) Login Action Configuration
Module: CI/CD Security
Dependencies: None
Technical Specification:
* Add docker/login-action@v3 step logging into ghcr.io with username: ${{ github.actor }} and password: ${{ secrets.GITHUB_TOKEN }}.
Acceptance Criteria & Validation:
* Authentication succeeds with write permissions to package registry.
* Command: echo $GITHUB_TOKEN | docker login ghcr.io -u $ACTOR --password-stdin


TASK-CI-024: Docker Metadata Action for Semantic & Commit SHA Tagging
Module: CI/CD Tagging
Dependencies: None
Technical Specification:
* Configure docker/metadata-action@v5 in workflow with tags:
* type=semver,pattern={{version}}
* type=semver,pattern={{major}}.{{minor}}
* type=sha,prefix=sha-,format=short
* type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
Acceptance Criteria & Validation:
* Generates consistent OCI tags and labels for branches, pull requests, and releases.
* Command: Action output produces verified tag list JSON.


TASK-CI-025: GitHub Actions Cache Backend (`type=gha,mode=max`) for Next.js Buildx
Module: CI/CD Caching
Dependencies: TASK-CI-021
Technical Specification:
* Configure cache-from: type=gha,scope=nextjs and cache-to: type=gha,mode=max,scope=nextjs in Next.js buildx task.
Acceptance Criteria & Validation:
* Unchanged layers are restored from GitHub Actions cache; rebuild time is reduced by $> 70\%$.
* Command: Build log confirms CACHED step hits for base and builder stages.


TASK-CI-026: GitHub Actions Cache Backend (`type=gha,mode=max`) for Python UV Buildx
Module: CI/CD Caching
Dependencies: TASK-CI-021
Technical Specification:
* Configure cache-from: type=gha,scope=python-worker and cache-to: type=gha,mode=max,scope=python-worker in Python worker buildx task.
Acceptance Criteria & Validation:
* UV dependency layer is restored from cache when uv.lock is unchanged.
* Command: Build log confirms cache hit on /root/.cache/uv.


TASK-CI-027: GHCR Registry-Based Remote Cache Fallback
Module: CI/CD Caching
Dependencies: TASK-CI-023, TASK-CI-025
Technical Specification:
* Add fallback remote cache configuration: cache-from: type=registry,ref=ghcr.io/${{ github.repository }}/cache:nextjs.
Acceptance Criteria & Validation:
* Runners pull cache from GHCR when local runner cache misses.
* Command: Buildx resolves registry cache manifest without authentication errors.


TASK-CI-028: Buildx Build & Push Action for Next.js Multi-Arch Image
Module: Multi-Arch Build
Dependencies: TASK-CI-021 to TASK-CI-025
Technical Specification:
* Add docker/build-push-action@v5 step:
* context: ./web
* file: ./web/Dockerfile
* platforms: linux/amd64,linux/arm64
* push: ${{ github.event_name != 'pull_request' }}
* tags: ${{ steps.meta-web.outputs.tags }}
* labels: ${{ steps.meta-web.outputs.labels }}
Acceptance Criteria & Validation:
* Image manifest lists both amd64 and arm64 image digests in GHCR.
* Command: docker buildx imagetools inspect ghcr.io/${{ github.repository }}/lingo-frontend:latest


TASK-CI-029: Buildx Build & Push Action for Python Worker Multi-Arch Image
Module: Multi-Arch Build
Dependencies: TASK-CI-021 to TASK-CI-026
Technical Specification:
* Add docker/build-push-action@v5 step for ./api:
* platforms: linux/amd64,linux/arm64
* push: ${{ github.event_name != 'pull_request' }}
* tags: ${{ steps.meta-api.outputs.tags }}
Acceptance Criteria & Validation:
* Multi-arch manifest created and pushed to GHCR for lingo-worker.
* Command: docker buildx imagetools inspect ghcr.io/${{ github.repository }}/lingo-worker:latest


TASK-CI-030: Docker Manifest Inspection & Multi-Platform Digest Extraction
Module: CI/CD Verification
Dependencies: TASK-CI-028, TASK-CI-029
Technical Specification:
* Add post-build verification step executing docker buildx imagetools inspect --raw and validating presence of both linux/amd64 and linux/arm64 sub-manifests.
Acceptance Criteria & Validation:
* Step fails if any requested architecture is missing from OCI image index.
* Command: jq '.manifests | length' <<< $(docker buildx imagetools inspect --raw) | grep 2


TASK-CI-031: Immutable Image Digest Pinning and Output Parameter Passing
Module: CI/CD Pipeline
Dependencies: TASK-CI-028, TASK-CI-029
Technical Specification:
* Capture steps.build-web.outputs.digest and steps.build-api.outputs.digest in GitHub Actions outputs (IMAGE_WEB_DIGEST, IMAGE_API_DIGEST) for deployment jobs.
Acceptance Criteria & Validation:
* Downstream jobs consume exact immutable SHA256 digest (e.g. sha256:abcd...) instead of mutable tags.
* Command: echo "${{ steps.build-web.outputs.digest }}" | grep "^sha256:"


TASK-CI-032: Reusable Composite Action for Docker Buildx Pipeline
Module: CI/CD Modularization
Dependencies: TASK-CI-021 to TASK-CI-031
Technical Specification:
* Create .github/actions/build-multiarch-image/action.yml encapsulating setup-qemu, setup-buildx, login, metadata, and build-push steps with parameters (context, dockerfile, image-name, cache-scope).
Acceptance Criteria & Validation:
* Both frontend and backend workflows invoke this reusable action without code duplication.
* Command: GitHub Actions runner executes composite action without input validation errors.


TASK-CI-033: Automated Multi-Arch Image Smoke Test Matrix
Module: Automated Testing
Dependencies: TASK-CI-028, TASK-CI-029
Technical Specification:
* Create .github/workflows/smoke-test-images.yml using matrix (platform: [linux/amd64, linux/arm64]): Pulls built image on respective runner/emulator, runs /healthz, and verifies HTTP 200.
Acceptance Criteria & Validation:
* Matrix job passes for both CPU architectures.
* Command: gh workflow run smoke-test-images.yml


TASK-CI-034: Ephemeral Container Registry Cleanup & Prune Script
Module: Registry Maintenance
Dependencies: TASK-CI-023
Technical Specification:
* Create scripts/prune-ghcr-untagged.sh using GitHub REST API to delete untagged/dangling container image versions older than 14 days.
Acceptance Criteria & Validation:
* API script identifies and deletes untagged container blobs without touching semver tags.
* Command: bash scripts/prune-ghcr-untagged.sh --dry-run


TASK-CI-035: Dedicated GitHub Actions Workflow for Manual Multi-Arch Image Build
Module: Operations Tooling
Dependencies: TASK-CI-032
Technical Specification:
* Create .github/workflows/manual-image-build.yml with workflow_dispatch inputs: service (web, api, all), tag_override, push_to_registry (boolean).
Acceptance Criteria & Validation:
* Triggering workflow manually builds and publishes image with custom tag.
* Command: gh workflow run manual-image-build.yml -f service=web -f tag_override=test-v1


TASK-CI-036: Base Image Automatic Security Update Checker Workflow
Module: Security Maintenance
Dependencies: None
Technical Specification:
* Create .github/workflows/base-image-monitor.yml running on cron schedule (weekly): Checks Docker Hub/GHCR for new digest releases of oven/bun:1-alpine and python:3.13-slim-bookworm and opens PR on update.
Acceptance Criteria & Validation:
* Detects upstream digest change and dispatches rebuild.
* Command: gh workflow run base-image-monitor.yml


TASK-CI-037: Build Provenance Attestation Generation
Module: Supply Chain Security
Dependencies: TASK-CI-028, TASK-CI-029
Technical Specification:
* Configure provenance: mode=max and sbom: true in docker/build-push-action steps to generate in-toto build provenance attestations.
Acceptance Criteria & Validation:
* SLSA provenance is attached to GHCR OCI manifest.
* Command: gh attestation verify oci://ghcr.io/${{ github.repository }}/lingo-frontend:latest --owner ${{ github.repository_owner }}


TASK-CI-038: OpenContainer Initiative (OCI) Standard Annotations Injection
Module: Container Metadata
Dependencies: TASK-CI-024
Technical Specification:
* Add OCI annotations to buildx execution: org.opencontainers.image.source, org.opencontainers.image.revision, org.opencontainers.image.licenses=MIT, org.opencontainers.image.title.
Acceptance Criteria & Validation:
* Annotations are visible in GitHub Container Registry package metadata view.
* Command: docker inspect | jq '.[0].Config.Labels'


TASK-CI-039: Container Build Speed & Cache Hit Ratio Telemetry Script
Module: CI/CD Telemetry
Dependencies: TASK-CI-025, TASK-CI-026
Technical Specification:
* Create scripts/measure-build-speed.sh: Extracts build duration and cache hit/miss statistics from GitHub Actions run logs via gh api.
Acceptance Criteria & Validation:
* Outputs report detailing layer cache hit percentage per service.
* Command: bash scripts/measure-build-speed.sh --run-id


TASK-CI-040: Comprehensive Multi-Arch Image Pipeline CI Workflow
Module: Pipeline Integration
Dependencies: TASK-CI-021 through TASK-CI-039
Technical Specification:
* Create .github/workflows/build-images.yml unifying metadata generation, QEMU, buildx, multi-arch build/push, provenance generation, and digest outputs.
Acceptance Criteria & Validation:
* Push to main completes multi-arch build for both services within $< 4$ minutes.
* Command: gh workflow view build-images.yml


Sub-Track C: Security Hardening, Vulnerability Scanning & Image Signing (TASK-CI-041 to TASK-CI-060)

TASK-CI-041: Trivy Vulnerability Scanner Action for Next.js Container Image
Module: Container Security
Dependencies: TASK-CI-028
Technical Specification:
* Add aquasecurity/trivy-action@master to workflow: Scan lingo-frontend image, format table, exit-code 1, ignore-unfixed true, severity HIGH,CRITICAL.
Acceptance Criteria & Validation:
* Scanner runs after build and outputs vulnerability table.
* Command: trivy image --severity HIGH,CRITICAL lingo-frontend:test


TASK-CI-042: Trivy Vulnerability Scanner Action for Python Microservice Image
Module: Container Security
Dependencies: TASK-CI-029
Technical Specification:
* Add Trivy scan step for lingo-worker image with Python OS and package level vulnerability auditing.
Acceptance Criteria & Validation:
* Scanner flags any critical CVEs in Python OS libraries or installed pip packages.
* Command: trivy image --severity HIGH,CRITICAL lingo-worker:test


TASK-CI-043: SARIF Report Upload to GitHub Security Tab
Module: Security Reporting
Dependencies: TASK-CI-041, TASK-CI-042
Technical Specification:
* Configure Trivy scan to generate format: 'sarif', output: 'trivy-results.sarif'. Add step github/codeql-action/upload-sarif@v3 with sarif_file: 'trivy-results.sarif'.
Acceptance Criteria & Validation:
* Scan results populate in repository Security -> Code Scanning alerts dashboard.
* Command: GitHub Code Scanning API returns active SARIF analysis.


TASK-CI-044: Trivy Severity Threshold Enforcement & CRITICAL/HIGH Vulnerability Gating
Module: Quality Gates
Dependencies: TASK-CI-041
Technical Specification:
* Set step condition: Fail CI build job if unmitigated CRITICAL vulnerability with available patch is detected.
Acceptance Criteria & Validation:
* CI build blocks deployment if base image contains unpatched critical CVEs.
* Command: trivy image --exit-code 1 --severity CRITICAL


TASK-CI-045: Software Bill of Materials (SBOM) Generation via Trivy
Module: Supply Chain Security
Dependencies: TASK-CI-028, TASK-CI-029
Technical Specification:
* Add step generating CycloneDX SBOM (format: 'cyclonedx-json', output: 'sbom-web.cdx.json') and SPDX SBOM (format: 'spdx-json', output: 'sbom-api.spdx.json').
Acceptance Criteria & Validation:
* Generates valid JSON SBOM detailing all installed Alpine/Debian packages, Bun modules, and Python wheels.
* Command: test -s sbom-web.cdx.json && jq .bomFormat sbom-web.cdx.json | grep "CycloneDX"


TASK-CI-046: Attaching and Publishing SBOM to GHCR via Cosign
Module: Supply Chain Security
Dependencies: TASK-CI-045, TASK-CI-047
Technical Specification:
* Add step using Cosign to attach SBOM to container image in GHCR: cosign attach sbom --sbom sbom-web.cdx.json --type cyclonedx ghcr.io/${{ github.repository }}/lingo-frontend:${{ steps.meta.outputs.version }}.
Acceptance Criteria & Validation:
* SBOM layer is discoverable and linked to container digest in GHCR.
* Command: cosign download sbom ghcr.io/${{ github.repository }}/lingo-frontend:latest


TASK-CI-047: Cosign Binary Installation & Setup Action
Module: Security Tooling
Dependencies: None
Technical Specification:
* Add sigstore/cosign-installer@v3.5.0 step to GitHub Actions workflows.
Acceptance Criteria & Validation:
* Cosign executable is verified and available in $PATH.
* Command: cosign version


TASK-CI-048: GitHub Actions OIDC Token Permission Configuration
Module: CI/CD Security
Dependencies: None
Technical Specification:
* Configure workflow top-level permissions: permissions: { contents: read, packages: write, id-token: write, security-events: write }.
Acceptance Criteria & Validation:
* GitHub Actions runner obtains short-lived JWT token from ACTIONS_ID_TOKEN_REQUEST_URL.
* Command: Runner receives valid Sigstore OIDC identity token.


TASK-CI-049: Keyless Container Image Signing with Cosign & GitHub OIDC
Module: Supply Chain Security
Dependencies: TASK-CI-047, TASK-CI-048
Technical Specification:
* Execute keyless signing step:
`bash
cosign sign --yes \
-a "repo=${{ github.repository }}" \
-a "sha=${{ github.sha }}" \
-a "run_id=${{ github.run_id }}" \
ghcr.io/${{ github.repository }}/lingo-frontend@${{ steps.build-web.outputs.digest }}
`
Acceptance Criteria & Validation:
* Signature and certificate are recorded in Fulcio CA and Rekor transparency log.
* Command: cosign verify --certificate-identity-regexp="https://github.com/${{ github.repository }}/" --certificate-oidc-issuer="https://token.actions.githubusercontent.com" ghcr.io/${{ github.repository }}/lingo-frontend@


TASK-CI-050: Cosign Signature Verification Step in CI Pipeline
Module: Supply Chain Security
Dependencies: TASK-CI-049
Technical Specification:
* Add post-sign validation step in CD pipeline: Verifies signature before triggering Kubernetes rollout.
Acceptance Criteria & Validation:
* Verification passes with code 0; fails if image digest has been altered.
* Command: cosign verify ghcr.io/${{ github.repository }}/lingo-frontend@


TASK-CI-051: Kyverno In-Cluster Image Signature Verification Policy Template
Module: Kubernetes Security
Dependencies: TASK-CI-049
Technical Specification:
* Create k8s/security/kyverno-verify-images.yaml: ClusterPolicy requiring all pods in lingo-prod namespace to have valid Cosign signature signed by repository OIDC subject.
Acceptance Criteria & Validation:
* kubectl apply --dry-run=client -f k8s/security/kyverno-verify-images.yaml passes schema validation.
* Unsigned images are blocked from pod scheduling.


TASK-CI-052: Gitleaks Secret Scanning in GitHub Actions
Module: Code Security
Dependencies: None
Technical Specification:
* Add gitleaks/gitleaks-action@v2 job to .github/workflows/pull-request-ci.yml scanning all commits in PR for exposed API tokens (Moonshot, AWS, Convex, JWT secrets).
Acceptance Criteria & Validation:
* Blocks PR merge if plaintext secret patterns are detected.
* Command: gitleaks detect --source . --verbose


TASK-CI-053: Pre-commit Hook for Gitleaks & Hadolint Syntax Enforcement
Module: Developer Tooling
Dependencies: TASK-CI-014, TASK-CI-052
Technical Specification:
* Create .pre-commit-config.yaml with hooks for hadolint/hadolint, gitleaks/gitleaks, astral-sh/ruff-pre-commit, and pre-commit/mirrors-prettier.
Acceptance Criteria & Validation:
* pre-commit run --all-files runs all security hooks locally.
* Command: pre-commit run --all-files


TASK-CI-054: Automated Container Vulnerability Weekly Scheduled Scan Workflow
Module: Security Monitoring
Dependencies: TASK-CI-041, TASK-CI-042
Technical Specification:
* Create .github/workflows/security-schedule.yml running every Sunday at midnight: Scans active production image digests in GHCR for newly discovered zero-day CVEs.
Acceptance Criteria & Validation:
* Scheduled workflow triggers and notifies via GitHub Security alerts if new CVEs emerge.
* Command: gh workflow run security-schedule.yml


TASK-CI-055: Non-Root UID Validation & Container Compliance Script
Module: Security Audit
Dependencies: TASK-CI-005, TASK-CI-011
Technical Specification:
* Create scripts/verify-container-security.sh: Inspects image metadata for non-root User, absence of setuid binaries, and verified read-only capabilities.
Acceptance Criteria & Validation:
* Exits 0 only if both images strictly comply with CIS Docker Benchmark standards.
* Command: bash scripts/verify-container-security.sh


TASK-CI-056: Dependency Vulnerability Audit for Bun
Module: Dependency Security
Dependencies: None
Technical Specification:
* Add step executing bun pm audit (or npm audit --omit=dev) in web/ directory within CI workflow.
Acceptance Criteria & Validation:
* Build passes only when zero critical package advisories are present in package.json.
* Command: cd web && bun pm audit


TASK-CI-057: Dependency Vulnerability Audit for Python
Module: Dependency Security
Dependencies: TASK-CI-008
Technical Specification:
* Add step executing uv audit or pip-audit against api/pyproject.toml in CI workflow.
Acceptance Criteria & Validation:
* Build passes with 0 known CVEs across Python dependencies.
* Command: cd api && uv run pip-audit


TASK-CI-058: Automated CVE Suppression & Exception Allowlist Management
Module: Security Governance
Dependencies: TASK-CI-041
Technical Specification:
* Create .trivyignore documenting approved temporary exceptions with expiry dates and justification comments (e.g. CVEs without available upstream vendor fix).
Acceptance Criteria & Validation:
* Trivy parser honors .trivyignore rules and logs ignored IDs during scan.
* Command: trivy image --ignorefile .trivyignore


TASK-CI-059: Automated GitHub Security Advisory Alert Forwarder
Module: Security Alerting
Dependencies: TASK-CI-043
Technical Specification:
* Create .github/workflows/security-alert-forwarder.yml triggering on code_scanning_alert: Dispatches structured payload to developer webhook on new Critical findings.
Acceptance Criteria & Validation:
* Webhook payload dispatches on new security alert.
* Command: gh workflow view security-alert-forwarder.yml


TASK-CI-060: Consolidated Security & Supply-Chain Attestation Workflow
Module: Pipeline Integration
Dependencies: TASK-CI-041 through TASK-CI-059
Technical Specification:
* Create .github/workflows/security-scan-and-sign.yml linking Trivy scanning, SBOM generation, Cosign keyless signing, and Rekor verification in sequence.
Acceptance Criteria & Validation:
* Pipeline completes security scan, signing, and attestation in $< 2$ minutes.
* Command: gh workflow view security-scan-and-sign.yml


Sub-Track D: CI Quality Gates, Linting, Typecheck & Testing (TASK-CI-061 to TASK-CI-080)

TASK-CI-061: Concurrency Grouping & Auto-Cancellation for Outdated PR Runs
Module: CI Efficiency
Dependencies: None
Technical Specification:
* Add concurrency configuration to all workflow files:
`yaml
concurrency:
group: ${{ github.workflow }}-${{ github.ref }}
cancel-in-progress: ${{ github.event_name == 'pull_request' }}
`
Acceptance Criteria & Validation:
* Pushing new commits to an open PR cancels redundant in-flight workflow executions.
* Command: Push 2 rapid commits to branch; verify first run is marked cancelled.


TASK-CI-062: Monorepo Path Filtering with `dorny/paths-filter`
Module: CI Efficiency
Dependencies: None
Technical Specification:
* Add dorny/paths-filter@v3 step to PR workflow defining filters:
* web: ["web/", "packages/", "package.json", "bun.lockb"]
* api: ["api/**", "pyproject.toml", "uv.lock"]
* k8s: ["k8s/", "volterra/"]
Acceptance Criteria & Validation:
* Backend CI jobs skip execution when PR only modifies frontend files, and vice versa.
* Command: Create PR with only web/ change; verify api job is skipped.


TASK-CI-063: Bun Dependency Setup & Lockfile Freezing Action
Module: Frontend CI
Dependencies: None
Technical Specification:
* Add oven-sh/setup-bun@v2 with bun-version: latest. Add step bun install --frozen-lockfile in web/.
Acceptance Criteria & Validation:
* Dependencies install in $< 5$ seconds using runner cache.
* Command: cd web && bun install --frozen-lockfile


TASK-CI-064: Next.js ESLint & Code Style Verification Job
Module: Frontend Quality Gate
Dependencies: TASK-CI-063
Technical Specification:
* Add job frontend-lint: Executes bun run lint (ESLint 9 flat config checking Next.js core web vitals and React rules).
Acceptance Criteria & Validation:
* Job fails on unhandled lint errors or unused imports.
* Command: cd web && bun run lint


TASK-CI-065: TypeScript Strict Typechecking Job for Next.js
Module: Frontend Quality Gate
Dependencies: TASK-CI-063
Technical Specification:
* Add job frontend-typecheck: Executes bun x tsc --noEmit under strict: true compiler options in tsconfig.json.
Acceptance Criteria & Validation:
* Exits 0 on complete type safety with 0 TypeScript errors.
* Command: cd web && bun x tsc --noEmit


TASK-CI-066: Frontend Unit & Component Tests Job with Coverage
Module: Frontend Quality Gate
Dependencies: TASK-CI-063
Technical Specification:
* Add job frontend-unit-tests: Executes bun test --coverage covering React UI components, audio controller, and review hooks.
Acceptance Criteria & Validation:
* All unit tests pass and code coverage report is generated.
* Command: cd web && bun test --coverage


TASK-CI-067: Python Environment Setup with `astral-sh/setup-uv`
Module: Backend CI
Dependencies: None
Technical Specification:
* Add astral-sh/setup-uv@v3 with version: "latest" and enable-cache: true. Add step uv python install 3.13 and uv sync --frozen --all-extras.
Acceptance Criteria & Validation:
* Virtual environment initializes with locked dependencies in $< 8$ seconds.
* Command: cd api && uv sync --frozen


TASK-CI-068: Python Code Formatting & Linting Job (`ruff`)
Module: Backend Quality Gate
Dependencies: TASK-CI-067
Technical Specification:
* Add job backend-lint: Executes uv run ruff check app tests and uv run ruff format --check app tests.
Acceptance Criteria & Validation:
* Fails on formatting discrepancies, PEP 8 violations, or unresolved imports.
* Command: cd api && uv run ruff check . && uv run ruff format --check .


TASK-CI-069: Python Strict Static Type Analysis Job (`mypy`)
Module: Backend Quality Gate
Dependencies: TASK-CI-067
Technical Specification:
* Add job backend-typecheck: Executes uv run mypy app --strict enforcing Pydantic model validation and complete type annotations.
Acceptance Criteria & Validation:
* Exits 0 with Success: no issues found in X source files.
* Command: cd api && uv run mypy app --strict


TASK-CI-070: Python Microservice Unit & Integration Tests Job (`pytest`)
Module: Backend Quality Gate
Dependencies: TASK-CI-067
Technical Specification:
* Add job backend-tests: Executes uv run pytest --cov=app --cov-report=xml --cov-report=term-missing tests/.
Acceptance Criteria & Validation:
* Pytest runs all test suites with $> 85\%$ line coverage.
* Command: cd api && uv run pytest tests/


TASK-CI-071: Codecov / Coverage Report Aggregator and PR Commenter
Module: CI Telemetry
Dependencies: TASK-CI-066, TASK-CI-070
Technical Specification:
* Add codecov/codecov-action@v4 step uploading both frontend coverage (web/coverage/lcov.info) and backend coverage (api/coverage.xml).
Acceptance Criteria & Validation:
* Codecov posts unified coverage summary diff as a comment on the open PR.
* Command: Codecov API confirms ingestion of uploaded XML/LCOV reports.


TASK-CI-072: Convex DB Schema Typecheck & Dry-Run Validation Job
Module: Database Quality Gate
Dependencies: TASK-CI-063
Technical Specification:
* Add job convex-schema-check: Executes bun x convex dev --typecheck=enable --dry-run verifying schema integrity and query/mutation validators.
Acceptance Criteria & Validation:
* Schema passes validation with 0 type errors.
* Command: bun x convex dev --typecheck=enable --dry-run


TASK-CI-073: Language Seed Datasets Schema & Syntax Validation Job
Module: Content Quality Gate
Dependencies: TASK-CI-063
Technical Specification:
* Add job validate-seed-data: Executes bun test packages/seed-data/tests/ verifying JSON schemas for Japanese, Mandarin, Thai, Vietnamese, and Korean datasets.
Acceptance Criteria & Validation:
* 100% of seed phrases pass Zod schema validation rules.
* Command: bun test packages/seed-data/tests/


TASK-CI-074: Playwright Browser Binary Installation & Caching Action
Module: E2E Testing
Dependencies: TASK-CI-063
Technical Specification:
* Add step caching ~/.cache/ms-playwright and running bun x playwright install --with-deps chromium in E2E job.
Acceptance Criteria & Validation:
* Chromium headless binaries are cached and restored across runs.
* Command: test -d ~/.cache/ms-playwright


TASK-CI-075: Headless Playwright End-to-End Test Matrix Job
Module: E2E Testing
Dependencies: TASK-CI-074
Technical Specification:
* Add job e2e-tests: Runs bun x playwright test against local Next.js build running on port 3000, testing flashcard review, voice HUD, and offline phrasebook flows.
Acceptance Criteria & Validation:
* All E2E test specs complete successfully in headless mode.
* Command: cd web && bun x playwright test


TASK-CI-076: Playwright HTML Test Report & Artifact Upload Action
Module: E2E Reporting
Dependencies: TASK-CI-075
Technical Specification:
* Add actions/upload-artifact@v4 step with if: always() uploading web/playwright-report/ with 14-day retention.
Acceptance Criteria & Validation:
* Test traces, screenshots on failure, and HTML reports are attached to GitHub Actions run.
* Command: Artifact appears in Actions summary page.


TASK-CI-077: Bundle Size Budget Analysis & Next.js Bundle Analyzer Job
Module: Performance Gate
Dependencies: TASK-CI-063
Technical Specification:
* Add job checking Next.js production build output sizes: Asserts initial client JS bundle size is $< 150\text{ KB}$ gzipped.
Acceptance Criteria & Validation:
* Build fails if client bundle exceeds budget limit.
* Command: cd web && bun run build && bash scripts/check-bundle-size.sh


TASK-CI-078: Git Commit Message Linting with Commitlint
Module: Governance
Dependencies: None
Technical Specification:
* Add wagoid/commitlint-github-action@v6 step enforcing Conventional Commits format (feat:, fix:, refactor:, chore:, ci:).
Acceptance Criteria & Validation:
* PR with non-conforming commit titles (e.g. updated stuff) fails validation.
* Command: echo "feat: add tts streaming" | bun x commitlint


TASK-CI-079: Branch Protection Rule Validation Script
Module: Governance
Dependencies: None
Technical Specification:
* Create scripts/check-branch-protection.sh: Queries GitHub API to ensure main branch enforces required status checks (frontend-lint, backend-tests, e2e-tests, security-scan).
Acceptance Criteria & Validation:
* Verifies branch protection settings are active on remote repository.
* Command: bash scripts/check-branch-protection.sh


TASK-CI-080: Consolidated Pull Request CI Pipeline Workflow
Module: Pipeline Integration
Dependencies: TASK-CI-061 through TASK-CI-079
Technical Specification:
* Create .github/workflows/pull-request-ci.yml uniting path filters, linting, typechecks, unit tests, seed tests, and Playwright E2E suites with parallel execution.
Acceptance Criteria & Validation:
* All quality gates execute concurrently on PR creation and report status to GitHub Checks.
* Command: gh workflow view pull-request-ci.yml


Sub-Track E: CD Deployment Workflows, Multi-Environment Release, Rollback & Migration (TASK-CI-081 to TASK-CI-100)

TASK-CI-081: GitHub Environments Definition with Protection Rules
Module: CD Governance
Dependencies: None
Technical Specification:
* Configure GitHub repository environments staging (automatic deployment) and production (requires manual reviewer approval from designated team leads and passed status checks).
Acceptance Criteria & Validation:
* Production deployment pauses for required approval in GitHub Actions UI.
* Command: Verify environment rules via gh api repos/:owner/:repo/environments/production.


TASK-CI-082: Kubernetes Kubeconfig Secret Handling & Context Switching
Module: CD Infrastructure
Dependencies: None
Technical Specification:
* Add azure/k8s-set-context@v4 step using secrets.KUBECONFIG to authenticate against Vultr Kubernetes cluster and verify API server connectivity.
Acceptance Criteria & Validation:
* Action sets current context and executes kubectl cluster-info successfully.
* Command: kubectl cluster-info


TASK-CI-083: Kustomize Overlay Configuration for Staging
Module: Kubernetes Configuration
Dependencies: None
Technical Specification:
* Create k8s/overlays/staging/kustomization.yaml: Customizes namespace lingo-staging, replicas (1), host staging.lingo.yourdomain.com, and staging environment ConfigMaps.
Acceptance Criteria & Validation:
* kustomize build k8s/overlays/staging outputs valid Kubernetes manifest YAML.
* Command: kustomize build k8s/overlays/staging | kubectl apply --dry-run=client -f -


TASK-CI-084: Kustomize Overlay Configuration for Production
Module: Kubernetes Configuration
Dependencies: None
Technical Specification:
* Create k8s/overlays/prod/kustomization.yaml: Configures namespace lingo-prod, replicas (2+ with HPA), host lingo.yourdomain.com, Volterra annotations, and production secrets.
Acceptance Criteria & Validation:
* kustomize build k8s/overlays/prod passes dry-run validation.
* Command: kustomize build k8s/overlays/prod | kubectl apply --dry-run=client -f -


TASK-CI-085: Automated Staging Deployment Workflow on Push to `develop`
Module: CD Workflows
Dependencies: TASK-CI-032, TASK-CI-082, TASK-CI-083
Technical Specification:
* Create .github/workflows/deploy-staging.yml: Triggers on push to develop, builds multi-arch images, updates staging kustomization image tags, deploys to cluster, and verifies rollout.
Acceptance Criteria & Validation:
* Push to develop updates staging environment automatically in $< 5$ minutes.
* Command: gh workflow view deploy-staging.yml


TASK-CI-086: Pre-Deployment Convex Database Schema Migration Action
Module: Database Deployment
Dependencies: TASK-CI-063
Technical Specification:
* Add pre-deployment step: Executes bun x convex deploy using secrets.CONVEX_DEPLOY_KEY to apply schema updates and new mutations before rolling out container pods.
Acceptance Criteria & Validation:
* Schema applies backward-compatibly without breaking running pods.
* Command: bun x convex deploy --dry-run


TASK-CI-087: Kustomize Image Tag Mutation Step
Module: CD Deployment
Dependencies: TASK-CI-031, TASK-CI-084
Technical Specification:
* Execute Kustomize image update step in CD runner:
`bash
cd k8s/overlays/prod
kustomize edit set image ghcr.io/${{ github.repository }}/lingo-frontend=ghcr.io/${{ github.repository }}/lingo-frontend@${{ needs.build.outputs.web_digest }}
kustomize edit set image ghcr.io/${{ github.repository }}/lingo-worker=ghcr.io/${{ github.repository }}/lingo-worker@${{ needs.build.outputs.api_digest }}
`
Acceptance Criteria & Validation:
* kustomization.yaml is updated with exact immutable SHA256 digests.
* Command: grep -E "digest|@" k8s/overlays/prod/kustomization.yaml


TASK-CI-088: Kubernetes Deployment Rollout Execution
Module: CD Deployment
Dependencies: TASK-CI-082, TASK-CI-087
Technical Specification:
* Execute deployment apply step:
`bash
kustomize build k8s/overlays/prod | kubectl apply -f -
`
Acceptance Criteria & Validation:
* Kubernetes API receives updated deployment specs and initiates rolling update.
* Command: kubectl get deployments -n lingo-prod


TASK-CI-089: Kubernetes Rollout Status Poller & Timeout Watcher
Module: CD Verification
Dependencies: TASK-CI-088
Technical Specification:
* Add rollout status polling steps:
`bash
kubectl rollout status deployment/lingo-frontend -n lingo-prod --timeout=180s
kubectl rollout status deployment/lingo-worker -n lingo-prod --timeout=180s
`
Acceptance Criteria & Validation:
* Step succeeds when all new replica pods pass readiness probes; fails on timeout.
* Command: kubectl rollout status deployment/lingo-frontend -n lingo-prod


TASK-CI-090: Automated Instant Rollback Trigger on Rollout Timeout / Pod CrashLoop
Module: Automated Recovery
Dependencies: TASK-CI-089
Technical Specification:
* Add if: failure() rollback step:
`bash
kubectl rollout undo deployment/lingo-frontend -n lingo-prod
kubectl rollout undo deployment/lingo-worker -n lingo-prod
kubectl rollout status deployment/lingo-frontend -n lingo-prod --timeout=120s
`
Acceptance Criteria & Validation:
* Automatically reverts cluster deployment to previous healthy revision if probe fails.
* Command: Trigger bad image tag; verify deployment automatically reverts to previous revision.


TASK-CI-091: Production Manual Approval Gate & Release Tag Trigger Workflow
Module: CD Workflows
Dependencies: TASK-CI-081, TASK-CI-084, TASK-CI-086 to TASK-CI-090
Technical Specification:
* Create .github/workflows/deploy-production.yml: Triggers on push of release tag (v*.*.*) or manual dispatch. Requires production environment approval. Deploys to lingo-prod.
Acceptance Criteria & Validation:
* Workflow halts at environment approval gate until approved by authorized maintainer.
* Command: gh workflow view deploy-production.yml


TASK-CI-092: Manual Emergency Rollback Workflow via `workflow_dispatch`
Module: Operations Tooling
Dependencies: TASK-CI-082
Technical Specification:
* Create .github/workflows/emergency-rollback.yml with inputs: environment (staging, production), target_revision (default: previous revision 0), reason. Executes kubectl rollout undo and posts alert.
Acceptance Criteria & Validation:
* Manually executable from GitHub Actions UI to roll back cluster state in $< 30$ seconds.
* Command: gh workflow run emergency-rollback.yml -f environment=production -f reason="latency spike"


TASK-CI-093: Post-Deployment Synthetic Smoke Testing Action
Module: Post-Deploy Verification
Dependencies: TASK-CI-089
Technical Specification:
* Create scripts/run-smoke-tests.sh: Sends synthetic test requests to public endpoints (homepage HTTP 200, API health check, mock TTS synthesis call, search query).
Acceptance Criteria & Validation:
* Smoke test verifies end-to-end traffic flow over public DNS and Ingress.
* Command: bash scripts/run-smoke-tests.sh https://lingo.yourdomain.com


TASK-CI-094: Post-Deployment Ingress & Volterra Origin Pool Health Verification Script
Module: Edge Verification
Dependencies: TASK-CI-089
Technical Specification:
* Create scripts/verify-ingress-health.sh: Queries Volterra API to verify origin pool health score is 100% and TLS handshakes succeed without certificate warnings.
Acceptance Criteria & Validation:
* Exits 0 upon verifying healthy edge routing.
* Command: bash scripts/verify-ingress-health.sh


TASK-CI-095: Database Backup & Snapshot Trigger Step Prior to Migration
Module: Data Safety
Dependencies: TASK-CI-086
Technical Specification:
* Add pre-migration step: Executes Convex snapshot export / backup before applying breaking schema alterations.
Acceptance Criteria & Validation:
* Snapshot timestamp is logged and verified in runner artifacts.
* Command: Verify backup artifact creation.


TASK-CI-096: Slack / Discord Webhook Notification Action on Deployment Success / Failure
Module: Notification & Alerting
Dependencies: TASK-CI-085, TASK-CI-091
Technical Specification:
* Add rtCamp/action-slack-notify@v2 (or Discord webhook) step with status, commit author, commit message, image digests, and direct link to GitHub deployment.
Acceptance Criteria & Validation:
* Real-time notification delivered with green (success) or red (failure / rollback) embed.
* Command: Webhook receives valid embed payload.


TASK-CI-097: Blue-Green Traffic Shifting Manifest & Ingress Canary Annotation Setup
Module: Advanced Deployment
Dependencies: TASK-CI-084
Technical Specification:
* Create k8s/overlays/prod/canary-ingress.yaml with Ingress-NGINX annotations: nginx.ingress.kubernetes.io/canary: "true", nginx.ingress.kubernetes.io/canary-weight: "10".
Acceptance Criteria & Validation:
* Ingress routes 10% of production traffic to canary deployment while 90% remains on stable.
* Command: kubectl apply --dry-run=client -f k8s/overlays/prod/canary-ingress.yaml


TASK-CI-098: Canary Deployment Analysis & Automated Promotion / Rollback Step
Module: Advanced Deployment
Dependencies: TASK-CI-097
Technical Specification:
* Create scripts/evaluate-canary.sh: Queries Prometheus metrics for 5 minutes (error rate $< 0.1\%$, p95 latency $< 1.5\text{s}$). If healthy, promotes canary weight to 100%; if degraded, sets canary weight to 0%.
Acceptance Criteria & Validation:
* Automated promotion executes on healthy metrics; immediate traffic cut on error threshold breach.
* Command: bash scripts/evaluate-canary.sh --namespace lingo-prod


TASK-CI-099: Production Release Notes Generator & GitHub Release Creation Action
Module: Release Governance
Dependencies: TASK-CI-091
Technical Specification:
* Add softprops/action-gh-release@v2 step generating automatic release changelog from merged PR titles, attaching SBOM artifacts and Docker image digests.
Acceptance Criteria & Validation:
* Creates formatted GitHub Release with release notes on semantic tag push.
* Command: gh release view v1.0.0


TASK-CI-100: Master End-to-End Release & Rollback Orchestration Validation Script
Module: E2E Pipeline Verification
Dependencies: TASK-CI-001 through TASK-CI-099
Technical Specification:
* Create scripts/verify-ci-cd-pipeline.sh: Synthetically executes the entire pipeline locally or in staging:
1. Validates Dockerfile syntax via Hadolint.
2. Builds multi-arch images via buildx.
3. Runs Trivy security scan and generates SBOM.
4. Signs image with Cosign.
5. Validates Kustomize staging and production overlays.
6. Verifies rollout watcher and automated rollback scripts.
Acceptance Criteria & Validation:
* Complete validation script runs sequentially and exits with code 0.
* Command: bash scripts/verify-ci-cd-pipeline.sh


Swarm Agent Work Distribution Guide

The 100 tasks above can be immediately distributed to autonomous developer agents with zero cross-blocking:

┌────────────────────────────────────────────────────────────────────────────────────────┐ │                        PARALLEL AGENT SWARM EXECUTION BATCHES                          │ ├─────────────────┬─────────────────────────┬────────────────────────────────────────────┤ │ Batch 1 (Day 1) │ Tasks 001–020, 061–073  │ Dockerfiles, Linters, Typechecks, Unit CI  │ │ Batch 2 (Day 2) │ Tasks 021–040, 074–080  │ Buildx, QEMU, GHA Caching, Playwright E2E │ │ Batch 3 (Day 3) │ Tasks 041–060, 081–086  │ Trivy, SBOM, Cosign, Staging Deploy, Convex│ │ Batch 4 (Day 4) │ Tasks 087–100           │ Prod Rollouts, HPAs, Rollbacks, Canary QA │ └─────────────────┴─────────────────────────┴────────────────────────────────────────────┘

All task definitions adhere to the repository structure and multi-tenant Kubernetes cluster blueprint defined in [Easy CV - Technical Architecture & Project Blueprint](https://docs.google.com/document/d/116iOeXoI5aBulT8SaAYBeVsyi0M1VZ4KH4YyoJTkveA/edit?usp=drivesdk&ouid=108018036596709366729) and the master specification [Asian Language Learning Platform - Complete Engineering Specification & 100 Micro-Tasks](https://docs.google.com/document/d/1BvhNXtnSF5m84NLakkdHd_weZ2RXIrfeCeDIBa0cuaY/edit?usp=drivesdk&ouid=108018036596709366729).
Track 3 of 10
Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway
Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway
Complete Engineering Specification & 100 Granular Micro-Tasks


System Architecture Overview

                                 [ Ingress / Edge Gateway ]                                              │                                    [ HTTP / WebSockets ]                                              │ ┌────────────────────────────────────────────▼────────────────────────────────────────────┐ │ FastAPI Application Core (Python 3.13 / uv)                                             │ │                                                                                         │ │  ┌───────────────────────────────────────────────────────────────────────────────────┐  │ │  │ Custom Middleware Stack                                                           │  │ │  │ 1. Request ID (X-Request-ID) ──► 2. Correlation Logging (structlog) ──►           │  │ │  │ 3. Security Headers ──► 4. CORS ──► 5. Token Bucket Rate Limiter ──►              │  │ │  │ 6. Request Size Limiter ──► 7. Gzip/Brotli ──► 8. Prometheus / OpenTelemetry      │  │ │  └─────────────────────────────────────────┬─────────────────────────────────────────┘  │ │                                            │                                            │ │  ┌─────────────────────────────────────────▼─────────────────────────────────────────┐  │ │  │ Exception Handling & Problem Details Layer (RFC 7807 / RFC 9457)                  │  │ │  │ • RequestValidationError Handler • HTTPException Handler • Global 500 Handler     │  │ │  └─────────────────────────────────────────┬─────────────────────────────────────────┘  │ │                                            │                                            │ │  ┌─────────────────────────────────────────▼─────────────────────────────────────────┐  │ │  │ Dependency Injection & Security Engine                                            │  │ │  │ • Auth (JWT/API Keys) • Redis Pools • HTTP Pools • Storage Clients • RBAC Scopes  │  │ │  └─────────────────────────────────────────┬─────────────────────────────────────────┘  │ │                                            │                                            │ │  ┌─────────────────────────────────────────▼─────────────────────────────────────────┐  │ │  │ API Versioning & Routing Topology (/api/v1)                                       │  │ │  │ ├── /healthz, /readyz, /livez (Probes)   ├── /metrics (Prometheus Scrape)         │  │ │  │ ├── /api/v1/srs (Spaced Repetition)      ├── /api/v1/tts (Moonshot Audio)         │  │ │  │ ├── /api/v1/stt (Whisper Pronunciation)  ├── /api/v1/roleplay (Voice Scenarios)   │  │ │  │ └── /api/v1/phrasebook (Travel HUD)      └── /docs, /redoc (OpenAPI 3.1)          │  │ │  └───────────────────────────────────────────────────────────────────────────────────┘  │ └─────────────────────────────────────────────────────────────────────────────────────────┘


Domain 1: Project Scaffolding, `uv` Package Management & Settings (PY-001 – PY-010)


PY-001: `uv` Environment Setup & `pyproject.toml` Core Dependencies
Module: Core Setup / Build System
Dependencies: None
Technical Specification:
* Create pyproject.toml configured for Python 3.13 and uv build backend.
* Pin dependencies: fastapi>=0.115.0, pydantic>=2.9.0, pydantic-settings>=2.5.0, uvicorn[standard]>=0.31.0, structlog>=24.4.0, httpx>=0.27.2, redis>=5.1.0, prometheus-client>=0.21.0, opentelemetry-api>=1.27.0, opentelemetry-sdk>=1.27.0, opentelemetry-instrumentation-fastapi>=0.48b0.
* Set up .python-version specifying 3.13.0.
Acceptance Criteria & Validation:
* uv sync builds virtualenv cleanly in < 5s.
* uv run python -c "import fastapi, pydantic; print(fastapi.__version__)" outputs valid version.



PY-002: Ruff Linter & Code Formatter Configuration
Module: Code Quality / Tooling
Dependencies: PY-001
Technical Specification:
* Create ruff.toml with target version py313.
* Enable rules: E, F, W, C90, I (isort), N (naming), UP (pyupgrade), B (bugbear), A (builtins), COM (commas), C4 (comprehensions), DTZ (datetimes), T10, SIM (simplify), TCH (type-checking).
* Enforce line length 100, double quotes, and strict import sorting.
Acceptance Criteria & Validation:
* uv run ruff check . and uv run ruff format --check . execute with 0 configuration warnings.



PY-003: Mypy Strict Static Type Checking Configuration
Module: Type Safety / Tooling
Dependencies: PY-001
Technical Specification:
* Create mypy.ini with python_version = 3.13.
* Flags: strict = True, disallow_untyped_defs = True, disallow_incomplete_defs = True, check_untyped_defs = True, disallow_untyped_decorators = True, no_implicit_optional = True, warn_redundant_casts = True, warn_unused_ignores = True, warn_return_any = True.
* Add Pydantic mypy plugin: plugins = pydantic.mypy.
Acceptance Criteria & Validation:
* uv run mypy app tests runs cleanly with 0 type errors.



PY-004: Pytest, Pytest-Asyncio & Coverage Configuration
Module: Testing Infrastructure
Dependencies: PY-001
Technical Specification:
* Create pytest.ini with asyncio_mode = auto, asyncio_default_fixture_loop_scope = function, testpaths = ["tests"].
* Add coverage flags: --cov=app --cov-report=term-missing --cov-report=xml --cov-fail-under=90.
Acceptance Criteria & Validation:
* uv run pytest discovers test directories and initializes asyncio event loops without warnings.



PY-005: Pydantic v2 `BaseSettings` Environment Model
Module: Configuration (app/core/config.py)
Dependencies: PY-001
Technical Specification:
* Create app/core/config.py defining AppSettings(BaseSettings) using model_config = SettingsConfigDict(env_file=".env", env_nested_delimiter="__", extra="ignore").
* Root attributes: ENVIRONMENT: Literal["development", "staging", "production"] = "development", DEBUG: bool = False, PROJECT_NAME: str = "Asian Language Learning Platform API", VERSION: str = "1.0.0".
Acceptance Criteria & Validation:
* Unit test verifies default settings and .env override.
* Validation: uv run pytest tests/core/test_config.py -k test_base_settings.



PY-006: Nested Server & Network Configuration Schema
Module: Configuration (app/core/config.py)
Dependencies: PY-005
Technical Specification:
* Add ServerSettings(BaseModel) to AppSettings: HOST: str = "0.0.0.0", PORT: int = 8000, WORKERS: int = 2, RELOAD: bool = False, KEEP_ALIVE_TIMEOUT: int = 65.
* Validate port boundaries ($1024 \le \text{PORT} \le 65535$).
Acceptance Criteria & Validation:
* Invalid ports raise ValidationError.
* Validation: uv run pytest tests/core/test_config.py -k test_server_settings.



PY-007: Security, CORS & Cryptographic Key Models
Module: Configuration (app/core/config.py)
Dependencies: PY-005
Technical Specification:
* Add SecuritySettings(BaseModel): SECRET_KEY: SecretStr, ALGORITHM: str = "HS256", ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24, CORS_ORIGINS: list[AnyHttpUrl] = [], CORS_ALLOW_CREDENTIALS: bool = True.
* Add validator ensuring SECRET_KEY is at least 32 characters in production.
Acceptance Criteria & Validation:
* Short secret keys in production trigger validation errors.
* Validation: uv run pytest tests/core/test_config.py -k test_security_settings.



PY-008: External Microservice & Cloud Storage Settings
Module: Configuration (app/core/config.py)
Dependencies: PY-005
Technical Specification:
* Add ServiceSettings(BaseModel): MOONSHOT_API_KEY: SecretStr, MOONSHOT_BASE_URL: HttpUrl = "https://api.moonshot.cn/v1", REDIS_URL: RedisDsn = "redis://localhost:6379/0", S3_ENDPOINT_URL: HttpUrl | None = None, S3_BUCKET: str = "lingo-audio-prod", S3_ACCESS_KEY: str, S3_SECRET_KEY: SecretStr.
Acceptance Criteria & Validation:
* Validates complete DSN and URL formats.
* Validation: uv run pytest tests/core/test_config.py -k test_service_settings.



PY-009: Secret Obfuscation & Safe String Representations
Module: Configuration (app/core/config.py)
Dependencies: PY-005 through PY-008
Technical Specification:
* Implement custom __repr__ and safe_dump() method on AppSettings preventing secret keys (MOONSHOT_API_KEY, SECRET_KEY, S3_SECRET_KEY) from leaking into logs or terminal outputs.
Acceptance Criteria & Validation:
* repr(settings) outputs *** for all SecretStr fields.
* Validation: uv run pytest tests/core/test_config.py -k test_secret_redaction.



PY-010: Dynamic Settings Factory & Global Dependency
Module: Configuration / Dependency (app/core/config.py)
Dependencies: PY-005 through PY-009
Technical Specification:
* Implement @lru_cache function get_settings() -> AppSettings.
* Expose as FastAPI dependency for constructor injection.
Acceptance Criteria & Validation:
* get_settings() returns cached singleton; test fixture supports dependency overrides.
* Validation: uv run pytest tests/core/test_config.py -k test_get_settings_singleton.


Domain 2: Application Lifespan & Connection Management (PY-011 – PY-020)


PY-011: Async Lifespan Context Manager Architecture
Module: Lifespan (app/core/lifespan.py)
Dependencies: PY-010
Technical Specification:
* Create app/core/lifespan.py defining @asynccontextmanager async def lifespan(app: FastAPI) -> AsyncIterator[None].
* Structure startup and shutdown stages with structured logging timestamps.
Acceptance Criteria & Validation:
* Fast startup with clean context yield and graceful termination.
* Validation: uv run pytest tests/core/test_lifespan.py -k test_lifespan_execution.



PY-012: `httpx.AsyncClient` Connection Pool Lifecycle
Module: HTTP Client (app/core/http_client.py)
Dependencies: PY-011
Technical Specification:
* Create app/core/http_client.py initializing global httpx.AsyncClient with limits=httpx.Limits(max_keepalive_connections=50, max_connections=200, keepalive_expiry=30.0) and timeout=httpx.Timeout(15.0, connect=5.0).
* Attach to app.state.http_client during startup and invoke await app.state.http_client.aclose() at shutdown.
Acceptance Criteria & Validation:
* Client connects successfully; connection pool closes cleanly without Unclosed client session warnings.
* Validation: uv run pytest tests/core/test_http_client.py.



PY-013: Async Redis Connection Pool & Health Ping
Module: Redis Infrastructure (app/core/redis.py)
Dependencies: PY-011
Technical Specification:
* Create app/core/redis.py creating redis.asyncio.ConnectionPool.from_url(str(settings.services.REDIS_URL), max_connections=50, decode_responses=True).
* Instantiate redis.asyncio.Redis on app.state.redis and execute await app.state.redis.ping().
* Gracefully close pool on shutdown.
Acceptance Criteria & Validation:
* Ping succeeds on active Redis; catches connection error on offline Redis with informative log.
* Validation: uv run pytest tests/core/test_redis.py.



PY-014: CPU-Bound Worker Thread Pool Executor Setup
Module: Concurrency (app/core/executor.py)
Dependencies: PY-011
Technical Specification:
* Create app/core/executor.py initializing concurrent.futures.ThreadPoolExecutor(max_workers=min(32, (os.cpu_count() or 1) + 4)) on app.state.thread_pool.
* Add shutdown handler app.state.thread_pool.shutdown(wait=True, cancel_futures=True).
Acceptance Criteria & Validation:
* Thread pool dispatches CPU-heavy tasks without blocking FastAPI async event loop.
* Validation: uv run pytest tests/core/test_executor.py.



PY-015: In-Memory Cache & Tone Coordinate Dataset Pre-Warm
Module: Cache Warmup (app/core/warmup.py)
Dependencies: PY-011
Technical Specification:
* Create app/core/warmup.py implementing async def warmup_cache(app: FastAPI) -> None.
* Pre-load static JSON pitch accent maps (Mandarin, Thai, Vietnamese, Japanese) into memory buffers on app.state.tone_data.
Acceptance Criteria & Validation:
* Memory buffers populated during lifespan startup before accepting incoming traffic.
* Validation: uv run pytest tests/core/test_warmup.py.



PY-016: Graceful SIGTERM / SIGINT Signal Handling
Module: Process Management (app/core/signals.py)
Dependencies: PY-011
Technical Specification:
* Register signal handlers for SIGTERM and SIGINT to set app.state.is_shutting_down = True.
* Immediately fail readiness checks while allowing active HTTP requests 15s to finish.
Acceptance Criteria & Validation:
* Sending SIGTERM transitions state flag without dropping in-flight HTTP requests.
* Validation: uv run pytest tests/core/test_signals.py.



PY-017: Connection Drain & In-Flight WebSocket Teardown Protocol
Module: Connection Management (app/core/teardown.py)
Dependencies: PY-016
Technical Specification:
* Implement active WebSocket connection registry in app.state.active_websockets: set[WebSocket].
* On shutdown, send WebSocket close code 1001 (Going Away) to all connected clients and await closure.
Acceptance Criteria & Validation:
* WebSockets receive closure code and disconnect cleanly before process exits.
* Validation: uv run pytest tests/core/test_teardown.py.



PY-018: Background Task Queue & Worker Lifecycle Manager
Module: Background Tasks (app/core/tasks.py)
Dependencies: PY-011
Technical Specification:
* Create app/core/tasks.py maintaining asyncio.Task tracker app.state.background_tasks: set[asyncio.Task].
* Helper spawn_background_task(coro) automatically adds done-callbacks and handles unhandled exceptions.
Acceptance Criteria & Validation:
* Background tasks execute concurrently; failures log tracebacks without crashing the parent event loop.
* Validation: uv run pytest tests/core/test_tasks.py.



PY-019: Application State Container & Context Accessors
Module: State (app/core/state.py)
Dependencies: PY-011 through PY-018
Technical Specification:
* Create app/core/state.py providing typed property accessors for app.state objects (get_http_client, get_redis_client, get_thread_pool).
Acceptance Criteria & Validation:
* Type checker validates state access; raises RuntimeError if accessed before lifespan initialization.
* Validation: uv run pytest tests/core/test_state.py.



PY-020: Lifespan Mocking & Test Harness Fixtures
Module: Testing Harness (tests/fixtures/lifespan.py)
Dependencies: PY-011 through PY-019
Technical Specification:
* Create pytest fixtures providing mocked httpx.AsyncClient, mocked redis.Redis, and dummy application state.
Acceptance Criteria & Validation:
* Test client starts up and shuts down cleanly within unit tests.
* Validation: uv run pytest tests/fixtures/test_lifespan_fixtures.py.


Domain 3: Structured Logging & Context Correlation Engine (PY-021 – PY-030)


PY-021: Structlog Core Setup & Processors Pipeline
Module: Logging (app/core/logging.py)
Dependencies: PY-005
Technical Specification:
* Create app/core/logging.py configuring structlog.configure():
* Processors: merge_contextvars, add_log_level, TimeStamper(fmt="iso"), StackInfoRenderer(), format_exc_info(), JSONRenderer() in production / ConsoleRenderer() in development.
Acceptance Criteria & Validation:
* logger.info("event_name", key="val") produces structured JSON with ISO timestamps.
* Validation: uv run pytest tests/core/test_logging.py -k test_structlog_json_output.



PY-022: Contextvars Request Correlation Storage
Module: Context Management (app/core/context.py)
Dependencies: PY-021
Technical Specification:
* Create app/core/context.py declaring request_id_ctx: ContextVar[str] = ContextVar("request_id", default=""), user_id_ctx: ContextVar[str] = ContextVar("user_id", default=""), and tenant_id_ctx: ContextVar[str] = ContextVar("tenant_id", default="").
Acceptance Criteria & Validation:
* Context variables maintain task isolation across concurrent async coroutines.
* Validation: uv run pytest tests/core/test_context.py.



PY-023: Correlation ID Middleware (`X-Request-ID`)
Module: Middleware (app/middleware/correlation.py)
Dependencies: PY-022
Technical Specification:
* Create app/middleware/correlation.py extracting incoming X-Request-ID or generating a new UUIDv4 if missing.
* Store in request_id_ctx and inject into outgoing response headers as X-Request-ID.
Acceptance Criteria & Validation:
* Requests without header receive generated UUIDv4; requests with header preserve existing ID.
* Validation: uv run pytest tests/middleware/test_correlation_middleware.py.



PY-024: HTTP Access Logging Middleware with Nanosecond Precision
Module: Middleware (app/middleware/access_log.py)
Dependencies: PY-021, PY-023
Technical Specification:
* Create app/middleware/access_log.py recording http_method, path, query_params, client_ip, status_code, duration_ms (via time.perf_counter_ns()), and user_agent.
* Skip logging for /healthz and /metrics to avoid spamming logs.
Acceptance Criteria & Validation:
* Emits single structured access log entry per completed HTTP request with duration in milliseconds.
* Validation: uv run pytest tests/middleware/test_access_log.py.



PY-025: Sensitive Data Masking & PII Redaction Filter
Module: Logging Filters (app/core/log_filters.py)
Dependencies: PY-021
Technical Specification:
* Create custom Structlog processor redact_sensitive_data(logger, method_name, event_dict).
* Recursively mask values for keys: password, token, authorization, api_key, secret, access_token with [REDACTED].
Acceptance Criteria & Validation:
* Logging dictionaries containing authorization: "Bearer secret" replaces the token with [REDACTED].
* Validation: uv run pytest tests/core/test_log_filters.py.



PY-026: OpenTelemetry Trace Context Correlation in Logs
Module: Logging / OTel (app/core/logging_otel.py)
Dependencies: PY-021
Technical Specification:
* Add Structlog processor add_opentelemetry_context(logger, method_name, event_dict) extracting active trace_id and span_id from opentelemetry.trace.get_current_span() and injecting them into the log dictionary.
Acceptance Criteria & Validation:
* Logs generated within an active span include trace_id and span_id.
* Validation: uv run pytest tests/core/test_logging_otel.py.



PY-027: Standardized Log Levels & Uvicorn Log Interceptor
Module: Logging (app/core/logging_uvicorn.py)
Dependencies: PY-021
Technical Specification:
* Intercept standard library logging (uvicorn.access, uvicorn.error, fastapi) and route records through Structlog to ensure uniform JSON output format.
Acceptance Criteria & Validation:
* Uvicorn internal messages output in structured JSON format matching application logs.
* Validation: uv run pytest tests/core/test_logging_uvicorn.py.



PY-028: Dynamic Log Level Controller API
Module: Admin API (app/routers/admin.py)
Dependencies: PY-021
Technical Specification:
* Create endpoint POST /api/v1/admin/log-level with body {"level": "DEBUG" | "INFO" | "WARNING" | "ERROR"} guarded by admin authentication.
* Dynamically reconfigure logger level at runtime without service restart.
Acceptance Criteria & Validation:
* Valid payload changes active log level dynamically; invalid levels return HTTP 422.
* Validation: uv run pytest tests/routers/test_admin_logging.py.



PY-029: Sentry Integration & Breadcrumb Context Injector
Module: Observability (app/core/sentry.py)
Dependencies: PY-005, PY-021
Technical Specification:
* Initialize Sentry SDK when SENTRY_DSN is configured.
* Add custom processor sending unhandled errors to Sentry tagged with request_id and environment.
Acceptance Criteria & Validation:
* Exceptions trigger Sentry capture event with request tags when DSN is present.
* Validation: uv run pytest tests/core/test_sentry.py.



PY-030: Logging Pipeline Unit & Load Test Suite
Module: Testing (tests/core/test_logging_suite.py)
Dependencies: PY-021 through PY-029
Technical Specification:
* Comprehensive test suite verifying concurrent log emission, zero thread contention, and strict JSON compliance under load.
Acceptance Criteria & Validation:
* 1,000 concurrent log writes execute without corrupted lines or unhandled exceptions.
* Validation: uv run pytest tests/core/test_logging_suite.py.


Domain 4: Custom Middleware Suite & Traffic Control (PY-031 – PY-040)


PY-031: Middleware Dispatcher & Stack Ordering Configuration
Module: Middleware (app/middleware/__init__.py)
Dependencies: PY-005
Technical Specification:
* Create setup_middleware(app: FastAPI) function registering middleware in strict execution order:
1. CorrelationIdMiddleware
2. SecurityHeadersMiddleware
3. CORSMiddleware
4. RateLimiterMiddleware
5. RequestSizeLimitMiddleware
6. GZipMiddleware
7. AccessLogMiddleware
8. PrometheusMetricsMiddleware
Acceptance Criteria & Validation:
* Middleware stack executes in designated order on request and reverse order on response.
* Validation: uv run pytest tests/middleware/test_middleware_order.py.



PY-032: Strict CORS Middleware Configuration
Module: Middleware (app/middleware/cors.py)
Dependencies: PY-007, PY-031
Technical Specification:
* Configure FastAPI CORSMiddleware with allow_origins=settings.security.CORS_ORIGINS, allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allow_headers=["*"], max_age=86400.
Acceptance Criteria & Validation:
* Allowed origins receive Access-Control-Allow-Origin; disallowed origins receive no CORS headers.
* Validation: uv run pytest tests/middleware/test_cors.py.



PY-033: Security Headers Middleware (CSP, HSTS, X-Frame)
Module: Middleware (app/middleware/security_headers.py)
Dependencies: PY-031
Technical Specification:
* Create app/middleware/security_headers.py adding HTTP response headers:
* X-Content-Type-Options: nosniff
* X-Frame-Options: DENY
* X-XSS-Protection: 1; mode=block
* Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
* Referrer-Policy: strict-origin-when-cross-origin
* Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; media-src 'self' blob: https:;
Acceptance Criteria & Validation:
* Every outgoing response contains all specified security headers.
* Validation: uv run pytest tests/middleware/test_security_headers.py.



PY-034: Request Payload Size Limiting Middleware
Module: Middleware (app/middleware/size_limit.py)
Dependencies: PY-031
Technical Specification:
* Create app/middleware/size_limit.py checking Content-Length header against max limit (e.g., 25MB for audio uploads, 2MB for standard JSON).
* If body exceeds limit, immediately abort and return HTTP 413 Payload Too Large without streaming full body into memory.
Acceptance Criteria & Validation:
* Oversized requests are rejected with HTTP 413.
* Validation: uv run pytest tests/middleware/test_size_limit.py.



PY-035: Client IP Resolution & Trusted Proxy Header Parser
Module: Middleware (app/middleware/client_ip.py)
Dependencies: PY-031
Technical Specification:
* Create app/middleware/client_ip.py parsing X-Forwarded-For and X-Real-IP only when coming from trusted proxy CIDRs (Volterra / Kubernetes Ingress).
* Attach resolved client IP to request.state.client_ip.
Acceptance Criteria & Validation:
* Spoofed X-Forwarded-For headers from untrusted clients are ignored.
* Validation: uv run pytest tests/middleware/test_client_ip.py.



PY-036: Response Compression Middleware (Gzip & Brotli)
Module: Middleware (app/middleware/compression.py)
Dependencies: PY-031
Technical Specification:
* Add GZipMiddleware(minimum_size=1000) compressing JSON responses $> 1\text{KB}$ when Accept-Encoding: gzip is present.
* Exclude binary audio streams (audio/mpeg, audio/opus) from re-compression.
Acceptance Criteria & Validation:
* Text/JSON payloads $> 1\text{KB}$ are gzipped; audio files pass through uncompressed.
* Validation: uv run pytest tests/middleware/test_compression.py.



PY-037: Server-Timing Header Middleware
Module: Middleware (app/middleware/server_timing.py)
Dependencies: PY-031
Technical Specification:
* Create app/middleware/server_timing.py tracking execution timings for DB lookups, audio synthesis, and LLM inference.
* Inject Server-Timing: total;dur=24.5, db;dur=3.2, tts;dur=18.1 header.
Acceptance Criteria & Validation:
* Responses contain valid Server-Timing metrics matching actual execution timings.
* Validation: uv run pytest tests/middleware/test_server_timing.py.



PY-038: Client Disconnect & Request Cancellation Detector
Module: Middleware (app/middleware/cancellation.py)
Dependencies: PY-031
Technical Specification:
* Implement cancellation checker monitoring await request.is_disconnected().
* Cancel ongoing upstream LLM or TTS streaming tasks if client closes socket prematurely.
Acceptance Criteria & Validation:
* Client disconnect cancels background inference task, freeing compute resources.
* Validation: uv run pytest tests/middleware/test_cancellation.py.



PY-039: Maintenance Mode & Circuit Breaker Middleware
Module: Middleware (app/middleware/maintenance.py)
Dependencies: PY-031
Technical Specification:
* Create app/middleware/maintenance.py reading app.state.maintenance_mode.
* If enabled, return HTTP 503 Service Unavailable with Retry-After: 300 for all non-admin routes.
Acceptance Criteria & Validation:
* Enabling maintenance mode returns 503 on public routes and allows admin bypass routes.
* Validation: uv run pytest tests/middleware/test_maintenance.py.



PY-040: Comprehensive Middleware Test Suite
Module: Testing (tests/middleware/test_suite.py)
Dependencies: PY-031 through PY-039
Technical Specification:
* Execute end-to-end HTTP tests passing requests through the entire middleware stack to verify headers, compression, size limits, and error handling.
Acceptance Criteria & Validation:
* All middleware tests pass with 100% branch coverage.
* Validation: uv run pytest tests/middleware/test_suite.py.


Domain 5: Advanced Rate Limiting & Token Bucket Algorithms (PY-041 – PY-050)


PY-041: Rate Limiter Abstract Base Class & Data Models
Module: Rate Limiting (app/core/rate_limit/base.py)
Dependencies: PY-005
Technical Specification:
* Create app/core/rate_limit/base.py defining RateLimitResult(is_allowed: bool, limit: int, remaining: int, reset_after_seconds: float).
* Define BaseRateLimiter(ABC) with abstract method async def check_rate_limit(key: str, limit: int, window_seconds: int) -> RateLimitResult.
Acceptance Criteria & Validation:
* Interface validates typed signatures and models cleanly.
* Validation: uv run pytest tests/core/test_rate_limit_base.py.



PY-042: Redis Sliding Window Counter Rate Limiter
Module: Rate Limiting (app/core/rate_limit/redis_sliding_window.py)
Dependencies: PY-013, PY-041
Technical Specification:
* Create RedisSlidingWindowRateLimiter(BaseRateLimiter) using atomic Redis sorted sets (ZADD, ZREMRANGEBYSCORE, ZCARD, EXPIRE).
* Remove timestamps older than now - window_seconds, count remaining, and add current timestamp if within limit.
Acceptance Criteria & Validation:
* Strict sliding window accuracy prevents burst spikes across boundary resets.
* Validation: uv run pytest tests/core/test_redis_rate_limiter.py.



PY-043: Token Bucket Algorithm Engine for Burst Traffic
Module: Rate Limiting (app/core/rate_limit/token_bucket.py)
Dependencies: PY-013, PY-041
Technical Specification:
* Implement TokenBucketRateLimiter(BaseRateLimiter) using Lua script executed on Redis:
* Parameters: capacity, refill_rate_per_sec, requested_tokens.
* Atomically updates token balance based on elapsed time since last request.
Acceptance Criteria & Validation:
* Allows burst up to bucket capacity and limits sustained throughput to refill rate.
* Validation: uv run pytest tests/core/test_token_bucket.py.



PY-044: In-Memory Thread-Safe Sliding Window Fallback Limiter
Module: Rate Limiting (app/core/rate_limit/memory_limiter.py)
Dependencies: PY-041
Technical Specification:
* Create MemoryRateLimiter(BaseRateLimiter) using thread-safe collections.deque and asyncio.Lock for local dev or when Redis is unreachable.
Acceptance Criteria & Validation:
* Correctly limits in-memory requests and cleans up expired deque timestamps.
* Validation: uv run pytest tests/core/test_memory_limiter.py.



PY-045: Dynamic Client Identifier Strategy (IP / User / API Key)
Module: Rate Limiting (app/core/rate_limit/key_generator.py)
Dependencies: PY-035, PY-041
Technical Specification:
* Create generate_rate_limit_key(request: Request, scope: str = "default") -> str.
* Hierarchy: Authenticated user_id > api_key > client_ip.
Acceptance Criteria & Validation:
* Generates consistent scoped cache keys (rl:user:123:roleplay, rl:ip:192.168.1.1:default).
* Validation: uv run pytest tests/core/test_key_generator.py.



PY-046: Route Decorator & Tiered Rate Limit Policy Matrix
Module: Rate Limiting (app/core/rate_limit/decorator.py)
Dependencies: PY-041 through PY-045
Technical Specification:
* Create @rate_limit(limit=60, window=60, scope="roleplay") dependency factory.
* Support tiers: Free (10 req/min), Pro (60 req/min), Internal (1000 req/min).
Acceptance Criteria & Validation:
* Applying decorator enforces configured limits on target route.
* Validation: uv run pytest tests/core/test_rate_limit_decorator.py.



PY-047: Standardized `X-RateLimit-*` Response Header Injector
Module: Rate Limiting (app/middleware/rate_limit.py)
Dependencies: PY-041, PY-046
Technical Specification:
* Inject standard headers on all rate-limited responses:
* X-RateLimit-Limit: 60
* X-RateLimit-Remaining: 59
* X-RateLimit-Reset: 1724000000
Acceptance Criteria & Validation:
* Headers accurately reflect remaining quota and reset epoch timestamp.
* Validation: uv run pytest tests/middleware/test_rate_limit_headers.py.



PY-048: HTTP 429 Too Many Requests Exception & Retry-After Formatter
Module: Rate Limiting (app/core/exceptions.py)
Dependencies: PY-047
Technical Specification:
* When quota is exceeded, raise RateLimitExceededException returning HTTP 429, JSON error payload, and Retry-After: header.
Acceptance Criteria & Validation:
* Rate-limited requests return HTTP 429 with integer Retry-After header.
* Validation: uv run pytest tests/core/test_rate_limit_exceptions.py.



PY-049: Rate Limiting Whitelist & Internal Bypass Engine
Module: Rate Limiting (app/core/rate_limit/whitelist.py)
Dependencies: PY-045
Technical Specification:
* Create IP and token whitelist checking against internal Kubernetes cluster CIDRs (10.0.0.0/8, 172.16.0.0/12) to bypass rate limits for internal health checks.
Acceptance Criteria & Validation:
* Whitelisted cluster IPs bypass rate limiting entirely.
* Validation: uv run pytest tests/core/test_whitelist.py.



PY-050: Redis Mock & Concurrency Stress Test Suite
Module: Testing (tests/core/test_rate_limit_stress.py)
Dependencies: PY-041 through PY-049
Technical Specification:
* Execute concurrent stress test simulating 100 parallel workers hitting a 50 req/min endpoint to verify zero race condition over-allocation.
Acceptance Criteria & Validation:
* Exactly 50 requests succeed; exactly 50 return HTTP 429.
* Validation: uv run pytest tests/core/test_rate_limit_stress.py.


Domain 6: Exception Handling, Error Architecture & Problem Details (PY-051 – PY-060)


PY-051: RFC 7807 / RFC 9457 Problem Details Schema
Module: Error Schemas (app/schemas/errors.py)
Dependencies: PY-005
Technical Specification:
* Create ProblemDetails(BaseModel): type: HttpUrl = "about:blank", title: str, status: int, detail: str, instance: str | None = None, error_code: str, timestamp: datetime, invalid_params: list[InvalidParam] | None = None.
Acceptance Criteria & Validation:
* Schema serializes compliant RFC 7807 JSON payloads.
* Validation: uv run pytest tests/schemas/test_error_schemas.py.



PY-052: Application Custom Exception Base Hierarchy
Module: Exceptions (app/core/exceptions.py)
Dependencies: PY-051
Technical Specification:
* Create domain exception hierarchy:
* AppException(Exception) (base with status_code, error_code, detail, extra)
* EntityNotFoundException(AppException) (status 404)
* ConflictException(AppException) (status 409)
* ExternalServiceException(AppException) (status 502)
* RateLimitExceededException(AppException) (status 429)
* AuthenticationException(AppException) (status 401)
* AuthorizationException(AppException) (status 403)
Acceptance Criteria & Validation:
* All custom exceptions inherit from AppException and expose consistent attributes.
* Validation: uv run pytest tests/core/test_exceptions_hierarchy.py.



PY-053: Pydantic `RequestValidationError` Custom Formatter
Module: Exception Handlers (app/core/error_handlers.py)
Dependencies: PY-051, PY-052
Technical Specification:
* Implement validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse.
* Transform Pydantic validation errors into clean invalid_params list (field, reason, rejected_value). Return HTTP 422.
Acceptance Criteria & Validation:
* Invalid query/body params return structured RFC 7807 error with invalid_params details.
* Validation: uv run pytest tests/core/test_validation_handler.py.



PY-054: Starlette `HTTPException` Normalized JSON Handler
Module: Exception Handlers (app/core/error_handlers.py)
Dependencies: PY-051, PY-052
Technical Specification:
* Implement http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse.
* Format standard Starlette/FastAPI HTTP exceptions into ProblemDetails schema.
Acceptance Criteria & Validation:
* Built-in 404/405 errors return uniform ProblemDetails JSON structure.
* Validation: uv run pytest tests/core/test_http_handler.py.



PY-055: Global Unhandled 500 Server Error Handler with Error ID
Module: Exception Handlers (app/core/error_handlers.py)
Dependencies: PY-023, PY-051
Technical Specification:
* Implement unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse.
* Log full traceback with request_id, emit error alert, and return generic Internal Server Error message (never leaking internal traces to client).
Acceptance Criteria & Validation:
* Unhandled errors return HTTP 500 with error_id referencing the request trace.
* Validation: uv run pytest tests/core/test_unhandled_handler.py.



PY-056: Upstream Service Timeout & Connection Error Handlers
Module: Exception Handlers (app/core/error_handlers.py)
Dependencies: PY-052
Technical Specification:
* Create handlers for httpx.TimeoutException and httpx.ConnectError mapping them to HTTP 504 Gateway Timeout and HTTP 502 Bad Gateway with diagnostic error codes (UPSTREAM_TIMEOUT, UPSTREAM_UNAVAILABLE).
Acceptance Criteria & Validation:
* Downstream timeouts return clean 504 Gateway Timeout JSON.
* Validation: uv run pytest tests/core/test_upstream_handlers.py.



PY-057: Entity Conflict & State Inconsistency Handlers
Module: Exception Handlers (app/core/error_handlers.py)
Dependencies: PY-052
Technical Specification:
* Register handler for ConflictException returning HTTP 409 with conflict details (e.g., duplicate deck title or active concurrent session).
Acceptance Criteria & Validation:
* Conflict raises HTTP 409 with machine-readable error_code: "RESOURCE_ALREADY_EXISTS".
* Validation: uv run pytest tests/core/test_conflict_handler.py.



PY-058: Authentication & Authorization Handlers
Module: Exception Handlers (app/core/error_handlers.py)
Dependencies: PY-052
Technical Specification:
* Register handler for AuthenticationException (HTTP 401 with WWW-Authenticate: Bearer) and AuthorizationException (HTTP 403 Forbidden).
Acceptance Criteria & Validation:
* Auth failures return standard 401/403 Problem Details JSON.
* Validation: uv run pytest tests/core/test_auth_handlers.py.



PY-059: Exception Handler Registration Registry
Module: App Core (app/core/error_handlers.py)
Dependencies: PY-051 through PY-058
Technical Specification:
* Create register_exception_handlers(app: FastAPI) binding all custom and standard exception handlers to the FastAPI application instance.
Acceptance Criteria & Validation:
* Application instance intercepts all custom and standard exception types cleanly.
* Validation: uv run pytest tests/core/test_handler_registration.py.



PY-060: Fault Injection & Error Handler Test Suite
Module: Testing (tests/core/test_error_faults.py)
Dependencies: PY-051 through PY-059
Technical Specification:
* Test suite with simulated fault injection (DB drop, network timeout, division by zero, invalid JSON) asserting response schemas and status codes.
Acceptance Criteria & Validation:
* 100% of injected faults produce valid RFC 7807 Problem Details responses.
* Validation: uv run pytest tests/core/test_error_faults.py.


Domain 7: Dependency Injection Framework & Security Primitives (PY-061 – PY-070)


PY-061: Core Dependency Registry & Type Aliases
Module: Dependencies (app/api/deps.py)
Dependencies: PY-010
Technical Specification:
* Create app/api/deps.py declaring typed Annotated dependencies: SettingsDep = Annotated[AppSettings, Depends(get_settings)], HttpClientDep = Annotated[httpx.AsyncClient, Depends(get_http_client)], RedisDep = Annotated[Redis, Depends(get_redis)].
Acceptance Criteria & Validation:
* Type-hinted dependencies resolve cleanly in endpoint signatures.
* Validation: uv run pytest tests/api/test_deps.py -k test_core_deps.



PY-062: Async S3 / Cloud Storage Client Dependency
Module: Dependencies (app/api/deps.py)
Dependencies: PY-061
Technical Specification:
* Implement get_storage_client(settings: SettingsDep) -> AsyncStorageClient injecting configured S3/R2 client.
Acceptance Criteria & Validation:
* Injects active storage client with presigned URL and byte upload capabilities.
* Validation: uv run pytest tests/api/test_deps.py -k test_storage_dep.



PY-063: Bearer JWT Token Validator & User Identity Injector
Module: Auth Dependencies (app/api/deps_auth.py)
Dependencies: PY-007, PY-061
Technical Specification:
* Create oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token").
* Implement async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], settings: SettingsDep) -> UserIdentity.
* Decode JWT, verify signature, validate expiration, and extract sub (user ID) and roles.
Acceptance Criteria & Validation:
* Valid JWT returns UserIdentity; expired/invalid JWT raises AuthenticationException(401).
* Validation: uv run pytest tests/api/test_deps_auth.py -k test_jwt_validator.



PY-064: API Key Header & Query Security Dependency
Module: Auth Dependencies (app/api/deps_auth.py)
Dependencies: PY-061
Technical Specification:
* Implement api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False).
* Implement async def verify_api_key(api_key: str = Security(api_key_header), settings: SettingsDep) -> str.
Acceptance Criteria & Validation:
* Valid API key grants access; missing or invalid key raises HTTP 401.
* Validation: uv run pytest tests/api/test_deps_auth.py -k test_api_key_validator.



PY-065: Scoped Role-Based Access Control (RBAC) Dependency Factory
Module: Auth Dependencies (app/api/deps_auth.py)
Dependencies: PY-063
Technical Specification:
* Create require_roles(required_roles: list[str]) returning dependency function that verifies current_user.roles contains required permissions.
Acceptance Criteria & Validation:
* Insufficient user role raises AuthorizationException(403 Forbidden).
* Validation: uv run pytest tests/api/test_deps_auth.py -k test_rbac_factory.



PY-066: HMAC Webhook Signature Verification Dependency
Module: Security Dependencies (app/api/deps_security.py)
Dependencies: PY-061
Technical Specification:
* Implement async def verify_hmac_signature(request: Request, x_signature: Annotated[str, Header()], settings: SettingsDep) -> bool.
* Compute hmac.new(secret, body, hashlib.sha256).hexdigest() and verify with hmac.compare_digest.
Acceptance Criteria & Validation:
* Tampered payload or invalid signature returns HTTP 401; valid signature passes.
* Validation: uv run pytest tests/api/test_deps_security.py -k test_hmac_verifier.



PY-067: Standard Pagination Query Parameters Dependency
Module: Pagination Dependencies (app/api/deps_pagination.py)
Dependencies: PY-061
Technical Specification:
* Create PaginationParams(BaseModel): page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100).
* Expose helper offset property ((page - 1) * page_size).
Acceptance Criteria & Validation:
* Invalid page numbers or page sizes $> 100$ rejected with HTTP 422.
* Validation: uv run pytest tests/api/test_deps_pagination.py.



PY-068: Standard Sorting & Filter Query Parameters Dependency
Module: Query Dependencies (app/api/deps_pagination.py)
Dependencies: PY-061
Technical Specification:
* Create SortingParams(allowed_fields: list[str]) factory parsing sort_by=created_at and order=asc|desc.
Acceptance Criteria & Validation:
* Disallowed sort fields return validation error; valid fields parse into sorting tuple.
* Validation: uv run pytest tests/api/test_deps_sorting.py.



PY-069: Idempotency Key Validator Dependency (`Idempotency-Key`)
Module: Security Dependencies (app/api/deps_security.py)
Dependencies: PY-013, PY-061
Technical Specification:
* Create async def require_idempotency_key(idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None, redis: RedisDep) -> str | None.
* If key exists and request is already processed in Redis cache, return cached response directly.
Acceptance Criteria & Validation:
* Replayed requests with identical idempotency key return cached response without re-executing backend logic.
* Validation: uv run pytest tests/api/test_idempotency.py.



PY-070: Dependency Injection Mocking Harness for Unit Testing
Module: Testing (tests/fixtures/deps.py)
Dependencies: PY-061 through PY-069
Technical Specification:
* Create test harness providing clean app.dependency_overrides utilities for all auth, database, and storage dependencies.
Acceptance Criteria & Validation:
* Overrides swap dependencies seamlessly during test runs and reset cleanly in teardown.
* Validation: uv run pytest tests/fixtures/test_dep_overrides.py.


Domain 8: API Versioning, Routing Topology & OpenAPI 3.1 Engine (PY-071 – PY-080)


PY-071: `/api/v1` Root Router Aggregator Architecture
Module: Routing (app/api/v1/__init__.py)
Dependencies: PY-061
Technical Specification:
* Create api_v1_router = APIRouter(prefix="/api/v1") in app/api/v1/__init__.py.
* Include domain sub-routers with consistent tagging and prefixes.
Acceptance Criteria & Validation:
* Mounting root router exposes all v1 routes under /api/v1/*.
* Validation: uv run pytest tests/api/v1/test_router_aggregation.py.



PY-072: Modular Sub-Router Registration
Module: Routing (app/api/v1/router.py)
Dependencies: PY-071
Technical Specification:
* Register sub-routers:
* /api/v1/srs (tags: ["Spaced Repetition"])
* /api/v1/tts (tags: ["Moonshot Text-to-Speech"])
* /api/v1/stt (tags: ["Speech Recognition & Assessment"])
* /api/v1/roleplay (tags: ["AI Travel Roleplay"])
* /api/v1/phrasebook (tags: ["Travel Phrasebook"])
* /api/v1/decks (tags: ["Flashcard Decks"])
Acceptance Criteria & Validation:
* All sub-routers register without path collisions.
* Validation: uv run pytest tests/api/v1/test_subrouters.py.



PY-073: Deterministic Operation ID Auto-Naming Generator
Module: OpenAPI (app/core/openapi.py)
Dependencies: PY-071
Technical Specification:
* Implement custom_generate_unique_id(route: APIRoute) -> str returning format {route.tags[0]}_{route.name} (e.g., SpacedRepetition_submit_review).
Acceptance Criteria & Validation:
* Generated operation IDs are clean, unique, and predictable for TypeScript SDK generators.
* Validation: uv run pytest tests/core/test_operation_ids.py.



PY-074: OpenAPI 3.1 Metadata & Documentation Customization
Module: OpenAPI (app/core/openapi.py)
Dependencies: PY-005, PY-073
Technical Specification:
* Implement custom app.openapi() generating OpenAPI 3.1.0 schema with rich description, contact info, license, servers list, and category tag groups.
Acceptance Criteria & Validation:
* GET /openapi.json returns valid OpenAPI 3.1 schema.
* Validation: uv run pytest tests/core/test_openapi_schema.py.



PY-075: Security Schemes & Bearer/API-Key OpenAPI Specs
Module: OpenAPI (app/core/openapi.py)
Dependencies: PY-074
Technical Specification:
* Inject components.securitySchemes for HTTPBearer and APIKeyHeader into the generated OpenAPI schema.
Acceptance Criteria & Validation:
* Swagger UI displays \"Authorize\" button supporting both Bearer JWT and API Key.
* Validation: uv run pytest tests/core/test_openapi_security.py.



PY-076: Global Standard Error Response Documentation in OpenAPI
Module: OpenAPI (app/core/openapi.py)
Dependencies: PY-051, PY-074
Technical Specification:
* Inject standard responses (400, 401, 403, 404, 422, 429, 500, 502) with ProblemDetails schema across all endpoints in the OpenAPI spec.
Acceptance Criteria & Validation:
* Every documented endpoint displays structured error models in Swagger UI.
* Validation: uv run pytest tests/core/test_openapi_errors.py.



PY-077: Custom Swagger UI & Redoc Offline Static Endpoints
Module: Documentation (app/routers/docs.py)
Dependencies: PY-074
Technical Specification:
* Create custom /docs and /redoc endpoints serving local static Swagger/Redoc JS/CSS bundles to ensure docs render without external CDN dependencies.
Acceptance Criteria & Validation:
* /docs and /redoc render fully offline.
* Validation: uv run pytest tests/routers/test_docs_routes.py.



PY-078: OpenAPI Schema Export CLI Script
Module: Build Scripts (scripts/export_openapi.py)
Dependencies: PY-074
Technical Specification:
* Create scripts/export_openapi.py dumping current OpenAPI JSON to openapi.json for frontend type-generation with openapi-typescript.
Acceptance Criteria & Validation:
* uv run python scripts/export_openapi.py outputs formatted openapi.json.
* Validation: python scripts/export_openapi.py --check.



PY-079: API Route Deprecation & Sunset Header Annotations
Module: Routing (app/core/deprecation.py)
Dependencies: PY-071
Technical Specification:
* Create @deprecated_route(sunset_date="2027-01-01", alternative="/api/v2/...") decorator injecting Deprecation: true and Sunset headers.
Acceptance Criteria & Validation:
* Deprecated routes return RFC 8594 Sunset headers and mark endpoint as deprecated in OpenAPI.
* Validation: uv run pytest tests/core/test_deprecation.py.



PY-080: API Routing & OpenAPI Contract Validation Test Suite
Module: Testing (tests/api/test_openapi_contract.py)
Dependencies: PY-071 through PY-079
Technical Specification:
* Test suite validating 100% of registered routes against OpenAPI schema schema definitions.
Acceptance Criteria & Validation:
* No undocumented routes or mismatched schema signatures.
* Validation: uv run pytest tests/api/test_openapi_contract.py.


Domain 9: Observability, Prometheus Metrics & OpenTelemetry (PY-081 – PY-090)


PY-081: Prometheus Metrics Registry & Collector Setup
Module: Metrics (app/core/metrics.py)
Dependencies: PY-005
Technical Specification:
* Create app/core/metrics.py initializing custom prometheus_client.CollectorRegistry.
* Define metrics:
* http_requests_total(method, path, status_code) (Counter)
* http_request_duration_seconds(method, path) (Histogram with buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0])
* http_requests_in_progress(method, path) (Gauge)
Acceptance Criteria & Validation:
* Registry initializes with zero namespace conflicts.
* Validation: uv run pytest tests/core/test_metrics_registry.py.



PY-082: Prometheus HTTP Metrics Middleware
Module: Middleware (app/middleware/metrics.py)
Dependencies: PY-081
Technical Specification:
* Create PrometheusMetricsMiddleware recording request duration, status code, and in-flight gauge increments/decrements.
* Normalize dynamic path parameters (e.g., /api/v1/decks/123 -> /api/v1/decks/{id}).
Acceptance Criteria & Validation:
* Path parameter normalization prevents metric cardinality explosion.
* Validation: uv run pytest tests/middleware/test_metrics_middleware.py.



PY-083: Domain-Specific Business Metric Collectors
Module: Metrics (app/core/metrics_business.py)
Dependencies: PY-081
Technical Specification:
* Create collectors:
* tts_synthesis_duration_seconds(language, voice_id) (Histogram)
* stt_transcription_duration_seconds(language) (Histogram)
* srs_reviews_processed_total(rating, language) (Counter)
* active_voice_roleplay_sessions (Gauge)
Acceptance Criteria & Validation:
* Business events increment corresponding Prometheus metrics accurately.
* Validation: uv run pytest tests/core/test_business_metrics.py.



PY-084: OpenTelemetry Tracer Provider & Resource Setup
Module: Tracing (app/core/tracer.py)
Dependencies: PY-005
Technical Specification:
* Create app/core/tracer.py initializing TracerProvider(resource=Resource.create({"service.name": "lingo-python-api", "service.version": settings.VERSION})).
* Set global tracer provider.
Acceptance Criteria & Validation:
* Tracer provider initializes with configured service metadata.
* Validation: uv run pytest tests/core/test_tracer_init.py.



PY-085: OTLP gRPC / HTTP Span Exporter & Sampler Configuration
Module: Tracing (app/core/tracer.py)
Dependencies: PY-084
Technical Specification:
* Configure BatchSpanProcessor with OTLPSpanExporter(endpoint=settings.services.OTEL_EXPORTER_OTLP_ENDPOINT).
* Set ParentBasedTraceIdRatioBasedSampler(rate=1.0 if development else 0.1).
Acceptance Criteria & Validation:
* Batch processor exports spans asynchronously without blocking request loops.
* Validation: uv run pytest tests/core/test_span_exporter.py.



PY-086: FastAPI OpenTelemetry Automated Instrumentation
Module: Tracing (app/core/tracer.py)
Dependencies: PY-084, PY-085
Technical Specification:
* Instrument FastAPI app with FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider, excluded_urls="healthz,readyz,metrics").
Acceptance Criteria & Validation:
* Incoming HTTP requests automatically create root spans with HTTP attributes.
* Validation: uv run pytest tests/core/test_fastapi_instrumentation.py.



PY-087: Custom Span Decorators for Service & AI Logic
Module: Tracing (app/core/tracing_decorators.py)
Dependencies: PY-084
Technical Specification:
* Create @trace_span(name="tts.synthesize", attributes={"service": "moonshot"}) decorator wrapping sync and async business functions.
Acceptance Criteria & Validation:
* Wrapped functions create child spans attached to active trace context.
* Validation: uv run pytest tests/core/test_tracing_decorators.py.



PY-088: HTTP Client OpenTelemetry Instrumentation
Module: Tracing (app/core/http_tracer.py)
Dependencies: PY-012, PY-084
Technical Specification:
* Instrument httpx.AsyncClient with HTTPXClientInstrumentor to inject W3C traceparent headers into outgoing requests to Moonshot and external APIs.
Acceptance Criteria & Validation:
* Outgoing HTTP requests propagate distributed trace context headers.
* Validation: uv run pytest tests/core/test_http_tracer.py.



PY-089: Prometheus Scraping Endpoint Route (`GET /metrics`)
Module: Metrics Route (app/routers/metrics.py)
Dependencies: PY-081
Technical Specification:
* Implement endpoint GET /metrics returning Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST).
Acceptance Criteria & Validation:
* GET /metrics returns standard Prometheus exposition text format.
* Validation: uv run pytest tests/routers/test_metrics_endpoint.py.



PY-090: Metrics & Tracing Integration Test Suite
Module: Testing (tests/core/test_observability_suite.py)
Dependencies: PY-081 through PY-089
Technical Specification:
* Execute requests and assert metric counters increment and trace spans record without memory leaks.
Acceptance Criteria & Validation:
* 100% verification of metric updates and trace generation.
* Validation: uv run pytest tests/core/test_observability_suite.py.


Domain 10: Health Probes, Readiness Engine & Testing Infrastructure (PY-091 – PY-100)


PY-091: Health Check Service & Dependency Checker Protocol
Module: Health (app/services/health.py)
Dependencies: PY-010
Technical Specification:
* Create app/services/health.py defining HealthCheckResult(status: Literal["healthy", "unhealthy", "degraded"], details: dict[str, Any], latency_ms: float).
* Define DependencyChecker(Protocol) with async def check() -> HealthCheckResult.
Acceptance Criteria & Validation:
* Protocol validates check implementations cleanly.
* Validation: uv run pytest tests/services/test_health_service.py.



PY-092: Kubernetes Liveness Probe Endpoint (`GET /healthz`)
Module: Health Router (app/routers/health.py)
Dependencies: PY-091
Technical Specification:
* Implement GET /healthz returning {"status": "ok", "timestamp": "...", "version": "1.0.0"} with HTTP 200 immediately (shallow check).
Acceptance Criteria & Validation:
* Returns HTTP 200 in $< 2\text{ms}$ even under high load.
* Validation: uv run pytest tests/routers/test_health_probes.py -k test_healthz.



PY-093: Multi-Dependency Readiness Probe Endpoint (`GET /readyz`)
Module: Health Router (app/routers/health.py)
Dependencies: PY-091
Technical Specification:
* Implement GET /readyz executing parallel checks on Redis, S3 Storage, and Downstream AI APIs with a 2.0s timeout.
* Return HTTP 200 if all healthy; HTTP 503 Service Unavailable if any critical dependency fails.
Acceptance Criteria & Validation:
* Returns 200 when dependencies are up; returns 503 with failing dependency name when down.
* Validation: uv run pytest tests/routers/test_health_probes.py -k test_readyz.



PY-094: Kubernetes Startup Probe Endpoint (`GET /livez`)
Module: Health Router (app/routers/health.py)
Dependencies: PY-015, PY-091
Technical Specification:
* Implement GET /livez checking app.state.is_warmed_up.
* Returns HTTP 503 until cache pre-warm and connection pool initializations complete.
Acceptance Criteria & Validation:
* Returns 503 during startup; switches to 200 once lifespan warmup finishes.
* Validation: uv run pytest tests/routers/test_health_probes.py -k test_livez.



PY-095: Redis & Cache Readiness Ping Evaluator
Module: Health Checks (app/services/health_checkers/redis_check.py)
Dependencies: PY-013, PY-091
Technical Specification:
* Implement RedisDependencyChecker executing await redis.ping() within a 500ms timeout and returning round-trip latency.
Acceptance Criteria & Validation:
* Ping succeeds and records latency; timeouts return unhealthy.
* Validation: uv run pytest tests/services/test_redis_health.py.



PY-096: S3 / Cloudflare R2 Storage Readiness Evaluator
Module: Health Checks (app/services/health_checkers/storage_check.py)
Dependencies: PY-062, PY-091
Technical Specification:
* Implement StorageDependencyChecker verifying bucket reachability via head-bucket operation within a 1.0s timeout.
Acceptance Criteria & Validation:
* Valid bucket credentials return healthy; invalid permissions return degraded.
* Validation: uv run pytest tests/services/test_storage_health.py.



PY-097: Pytest Global Fixtures & Async Test Client Harness
Module: Test Infrastructure (tests/conftest.py)
Dependencies: PY-004, PY-010, PY-061
Technical Specification:
* Create tests/conftest.py with @pytest.fixture async def client() -> AsyncIterator[AsyncClient] using httpx.ASGITransport(app=app).
* Configure environment variable overrides for testing (ENVIRONMENT=test).
Acceptance Criteria & Validation:
* Async test client handles requests with full middleware execution in test environment.
* Validation: uv run pytest tests/test_conftest.py.



PY-098: Redis & Upstream Service Mocking Test Fixtures
Module: Test Infrastructure (tests/fixtures/mocks.py)
Dependencies: PY-097
Technical Specification:
* Create mock_redis fixture using fakeredis.aioredis and mock_moonshot fixture using pytest-httpx to mock external API responses.
Acceptance Criteria & Validation:
* Unit tests execute completely offline without real network dependencies.
* Validation: uv run pytest tests/fixtures/test_mocks.py.



PY-099: Automated Test Coverage & Benchmark Configuration
Module: Test Quality (tests/test_coverage_gate.py)
Dependencies: PY-004, PY-097
Technical Specification:
* Create coverage assertion script ensuring backend core modules achieve $> 90\%$ line and branch coverage.
Acceptance Criteria & Validation:
* uv run pytest --cov=app --cov-fail-under=90 passes with exit code 0.
* Validation: uv run pytest tests/test_coverage_gate.py.



PY-100: End-to-End API Gateway Quality Gate & Integration Verification
Module: CI / Gateway Verification (tests/e2e/test_gateway_e2e.py)
Dependencies: PY-001 through PY-099
Technical Specification:
* Create comprehensive E2E test verifying:
1. Liveness & readiness probes (/healthz, /readyz).
2. Request ID & correlation logging propagation.
3. Rate limiting enforcement and headers.
4. Gzip compression and security headers.
5. Prometheus metrics recording (/metrics).
6. Versioned API execution (/api/v1/*).
Acceptance Criteria & Validation:
* Complete test suite executes in $< 15\text{s}$ with 0 failures:
`bash
uv run pytest tests/e2e/test_gateway_e2e.py -v
`


Swarm Execution Matrix (100 Agents)

| Domain | Task Range | Core Focus | Primary Verification Command |
| :--- | :--- | :--- | :--- |
| 1. Scaffolding & Settings | PY-001 – PY-010 | uv, Ruff, Mypy, Pydantic v2 Settings | uv run ruff check && uv run mypy app |
| 2. Lifespan & Connections | PY-011 – PY-020 | Lifespan, Redis/HTTP Pools, Signals | uv run pytest tests/core/test_lifespan.py |
| 3. Structured Logging | PY-021 – PY-030 | structlog, X-Request-ID, Contextvars | uv run pytest tests/core/test_logging.py |
| 4. Middleware Stack | PY-031 – PY-040 | CORS, Security Headers, Gzip, Size Limits | uv run pytest tests/middleware/ |
| 5. Rate Limiting | PY-041 – PY-050 | Redis Sliding Window, Token Bucket | uv run pytest tests/core/test_rate_limit* |
| 6. Exception Architecture | PY-051 – PY-060 | RFC 7807 Problem Details, Handlers | uv run pytest tests/core/test_*handler*.py |
| 7. Dependency Injection | PY-061 – PY-070 | Auth, Storage, RBAC, HMAC, Pagination | uv run pytest tests/api/test_deps*.py |
| 8. API Versioning & Docs | PY-071 – PY-080 | /api/v1 Router, OpenAPI 3.1 Customizer | uv run pytest tests/api/v1/ |
| 9. Observability & OTel | PY-081 – PY-090 | Prometheus Metrics, OTel Traces, /metrics | uv run pytest tests/core/test_observability* |
| 10. Probes & Test Harness | PY-091 – PY-100 | /healthz, /readyz, Pytest Fixtures, E2E Gate | uv run pytest tests/e2e/test_gateway_e2e.py |
Track 4 of 10
Track 4: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming
Engineering Specification: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming

This document provides a comprehensive technical specification and atomic work breakdown structure comprising 100 granular micro-tasks (TTS-001 through TTS-100). Each task is isolated with defined file targets, explicit technical requirements, dependencies, and automated validation commands for execution across autonomous developer agents.


Architecture Overview

                                      [ Incoming Text / LLM Token Stream ]                                                         │                                                         ▼                         ┌───────────────────────────────────────────────────────────────┐                         │ Module 2: Sentence Boundary Buffering (CJK, Thai, Lookahead)  │                         └───────────────────────────────┬───────────────────────────────┘                                                         │ (Punctuated Sentence Chunks)                                                         ▼                         ┌───────────────────────────────────────────────────────────────┐                         │ Module 1: Moonshot TTS Async Client (tenacity, CircuitBreaker)│                         └───────────────────────────────┬───────────────────────────────┘                                                         │ (Raw Audio Stream / Bytes)                                                         ▼                         ┌───────────────────────────────────────────────────────────────┐                         │ Module 3: Audio Ingestion, Decoding & 16kHz Mono Resampling   │                         └───────────────────────────────┬───────────────────────────────┘                                                         │ (16kHz PCM Frames)                                                         ▼                         ┌───────────────────────────────────────────────────────────────┐                         │ Module 4: Loudness Normalization (-16 LUFS, Limiter, TruePeak)│                         └───────────────────────────────┬───────────────────────────────┘                                                         │ (Normalized PCM)                                 ┌───────────────────────┴───────────────────────┐                                 ▼                                               ▼ ┌───────────────────────────────────────────────────────────────┐ ┌───────────────────────────────────────────────────────────────┐ │ Module 5: Codec Encoders & WebSocket/HTTP Streaming (Opus/AAC)│ │ Module 7: 100-Point Waveform Peak Generator & CDN Headers     │ └───────────────────────────────┬───────────────────────────────┘ └───────────────────────────────┬───────────────────────────────┘                                 │                                                               │                                 └───────────────────────┬───────────────────────────────────────┘                                                         ▼                         ┌───────────────────────────────────────────────────────────────┐                         │ Module 6: S3 / Cloudflare R2 Multipart Storage & Presigned URLs│                         └───────────────────────────────────────────────────────────────┘


Module 1: Moonshot TTS API Client & Network Resilience (`TTS-001` – `TTS-015`)

`TTS-001`: Core Moonshot TTS Configuration & Settings Schema
Module: backend/app/core/tts/config.py
Dependencies: None
Technical Specification:
* Define MoonshotTTSConfig using pydantic_settings.BaseSettings.
* Fields: api_key: SecretStr, base_url: HttpUrl = "https://api.moonshot.cn/v1", timeout_seconds: float = 15.0, max_connections: int = 100, max_keepalive_connections: int = 20, default_voice: str = "moonshot-v1-zh-female", default_speed: float = 1.0, default_audio_format: str = "mp3".
Acceptance Criteria & Validation:
* Environment variables MOONSHOT_API_KEY and MOONSHOT_BASE_URL parse into immutable typed settings.
* Validation: uv run pytest tests/tts/test_config.py

`TTS-002`: Async HTTP Client Session & Connection Pool Manager
Module: backend/app/core/tts/session.py
Dependencies: TTS-001
Technical Specification:
* Implement singleton TTSClientSessionManager initializing httpx.AsyncClient.
* Configure httpx.Limits(max_connections=100, max_keepalive_connections=20, keepalive_expiry=30.0) and httpx.Timeout(15.0, connect=3.0).
* Implement lifecycle hooks startup() and shutdown() for clean socket teardown in FastAPI.
Acceptance Criteria & Validation:
* Session pool reuses TCP sockets on sequential calls without leaking file descriptors.
* Validation: uv run pytest tests/tts/test_session_pool.py

`TTS-003`: Voice ID Catalog & Language-Gender Profile Registry
Module: backend/app/core/tts/voices.py
Dependencies: None
Technical Specification:
* Define VoiceProfile dataclass (voice_id, language_code, gender, accent_region, recommended_speed, style_tags).
* Implement VoiceRegistry mapping language codes (zh, ja, th, vi, ko) to Moonshot voice profiles.
* Implement get_voice_for_language(lang: str, gender: str = "female") -> str with deterministic fallback.
Acceptance Criteria & Validation:
* Registry resolves valid Moonshot voice IDs for all 5 target Asian languages.
* Validation: uv run pytest tests/tts/test_voices.py

`TTS-004`: Moonshot TTS Request & Response Pydantic v2 DTOs
Module: backend/app/schemas/tts.py
Dependencies: None
Technical Specification:
* Create MoonshotTTSRequest(model="moonshot-tts-v1", input=str, voice=str, response_format="mp3"|"wav"|"opus", speed=float).
* Create TTSGenerationResult(audio_bytes=bytes, content_type=str, duration_seconds=float, sample_rate=int, voice_id=str, cached=bool).
* Enforce text input validation ($1 \le \text{length} \le 1000$ characters).
Acceptance Criteria & Validation:
* Validates and rejects payloads with empty text or invalid speeds ($<0.5$ or $>2.0$).
* Validation: uv run pytest tests/tts/test_schemas.py

`TTS-005`: Low-Level HTTP Request Dispatcher with Header Signing
Module: backend/app/core/tts/dispatcher.py
Dependencies: TTS-001, TTS-002, TTS-004
Technical Specification:
* Implement async def dispatch_tts_request(payload: MoonshotTTSRequest, client: httpx.AsyncClient) -> httpx.Response.
* Attach headers: Authorization: Bearer , Content-Type: application/json, User-Agent: LingoApp-AudioEngine/1.0.
Acceptance Criteria & Validation:
* Dispatches POST request to /audio/speech endpoint and captures raw response stream.
* Validation: uv run pytest tests/tts/test_dispatcher.py

`TTS-006`: Tenacity Exponential Backoff Retry Policy for HTTP 429 & 5xx
Module: backend/app/core/tts/retry.py
Dependencies: TTS-005
Technical Specification:
* Configure tenacity retry decorator: stop=stop_after_attempt(4), wait=wait_random_exponential(multiplier=0.5, max=5.0).
* Retry condition: retry_if_exception(is_transient_network_or_rate_limit_error) covering HTTP 429, 502, 503, 504, and httpx.ConnectTimeout.
Acceptance Criteria & Validation:
* Simulated 429 RateLimit response triggers exponential backoff and succeeds on subsequent mock 200.
* Validation: uv run pytest tests/tts/test_retry.py

`TTS-007`: Circuit Breaker State Machine for Upstream Outages
Module: backend/app/core/tts/circuit_breaker.py
Dependencies: TTS-006
Technical Specification:
* Implement TTSCircuitBreaker with states: CLOSED, OPEN, HALF_OPEN.
* Thresholds: Failure rate $\ge 50\%$ over 20 consecutive requests trips to OPEN for 30 seconds.
* Expose CircuitBreakerOpenException when tripped.
Acceptance Criteria & Validation:
* Rapid simulated 500 errors transition breaker to OPEN and fast-fail subsequent calls.
* Validation: uv run pytest tests/tts/test_circuit_breaker.py

`TTS-008`: Sliding-Window Token Bucket Rate Limiter
Module: backend/app/core/tts/rate_limiter.py
Dependencies: None
Technical Specification:
* Implement async in-memory TokenBucketRateLimiter(rate=20.0, capacity=40.0).
* Method async def acquire(tokens: int = 1) -> float computing sleep time if capacity is depleted.
Acceptance Criteria & Validation:
* Prevents request concurrency from exceeding Moonshot upstream QPS limits.
* Validation: uv run pytest tests/tts/test_rate_limiter.py

`TTS-009`: Non-Streaming Raw Audio Synthesis Method
Module: backend/app/core/tts/client.py
Dependencies: TTS-005, TTS-006, TTS-007, TTS-008
Technical Specification:
* Implement MoonshotTTSClient.synthesize_speech(text: str, voice_id: str, speed: float = 1.0) -> bytes.
* Executes dispatcher within rate-limiter, retry wrapper, and circuit-breaker.
Acceptance Criteria & Validation:
* Returns complete raw audio byte buffer for short phrases ($< 200$ chars).
* Validation: uv run pytest tests/tts/test_client_sync.py

`TTS-010`: Chunk-Encoded Async Streaming Response Consumer
Module: backend/app/core/tts/streaming.py
Dependencies: TTS-005
Technical Specification:
* Implement MoonshotTTSClient.stream_speech_bytes(text: str, voice_id: str) -> AsyncGenerator[bytes, None].
* Consume response.aiter_bytes(chunk_size=4096) to yield binary chunks with minimum time-to-first-byte (TTFB).
Acceptance Criteria & Validation:
* Yields partial audio byte buffers as they arrive over the wire.
* Validation: uv run pytest tests/tts/test_streaming_consumer.py

`TTS-011`: Pitch, Speed & Emotion Parameter Mappings
Module: backend/app/core/tts/modulators.py
Dependencies: TTS-004
Technical Specification:
* Implement TTSParameterModulator.build_payload(text: str, voice: str, speed: float, pitch_shift: float = 0.0) -> dict.
* Clamp speed to $[0.75, 1.25]$ for language learning comprehension.
Acceptance Criteria & Validation:
* Generates spec-compliant JSON payload adhering to Moonshot TTS API format.
* Validation: uv run pytest tests/tts/test_modulators.py

`TTS-012`: In-Memory SHA-256 Audio Deduplication Cache
Module: backend/app/core/tts/cache.py
Dependencies: TTS-004
Technical Specification:
* Implement TTSMemoryCache using LRU cache with key sha256(text + voice_id + str(speed) + format).
* Memory limit: 256MB max cache size with eviction metrics.
Acceptance Criteria & Validation:
* Identical synthesis requests return cached audio bytes with 0ms network latency.
* Validation: uv run pytest tests/tts/test_memory_cache.py

`TTS-013`: Fallback Voice Profile Selector on Upstream Deprecation
Module: backend/app/core/tts/fallback.py
Dependencies: TTS-003
Technical Specification:
* Implement FallbackVoiceManager.resolve_fallback(requested_voice: str, error_code: str) -> str.
* If requested voice returns 404/400 (Deprecated), select next best compatible voice for target locale.
Acceptance Criteria & Validation:
* Automatically handles invalid or retired voice IDs without bubbling 500 errors to users.
* Validation: uv run pytest tests/tts/test_fallback.py

`TTS-014`: Moonshot TTS Client Mock Adapter for Unit Testing
Module: backend/app/tests/mocks/tts_mock.py
Dependencies: TTS-009
Technical Specification:
* Create MockMoonshotTTSClient providing deterministic synthetic MP3/WAV byte streams matching real audio headers.
* Support configurable mock latencies, network failure injection, and rate-limit triggers.
Acceptance Criteria & Validation:
* Allows offline test execution across all upstream dependent microservices.
* Validation: uv run pytest tests/tts/test_mock_adapter.py

`TTS-015`: Client Integration & Health Check Ping Probe
Module: backend/app/core/tts/health.py
Dependencies: TTS-009
Technical Specification:
* Implement async def verify_moonshot_health() -> HealthStatusReport synthesizing a single 1-syllable word (*"Hai"* / *"Ni"*).
* Report round-trip latency, circuit-breaker status, and token bucket level.
Acceptance Criteria & Validation:
* Exposes sub-system health check returning HTTP 200 OK or 503 Service Unavailable.
* Validation: uv run pytest tests/tts/test_health.py


Module 2: Sentence Boundary Buffering & Asian Text Segmentation (`TTS-016` – `TTS-030`)

`TTS-016`: Universal Sentence Token Stream Buffer Interface
Module: backend/app/core/text/buffer.py
Dependencies: None
Technical Specification:
* Define AbstractTokenBuffer base class with methods feed_token(token: str) -> None, has_complete_sentence() -> bool, pop_sentence() -> str | None, flush() -> str | None.
Acceptance Criteria & Validation:
* Interfaces compile with full typing support across all language-specific segmenters.
* Validation: uv run pytest tests/text/test_buffer_interface.py

`TTS-017`: CJK Full-Stop & Terminal Punctuation Boundary Matcher
Module: backend/app/core/text/cjk_punct.py
Dependencies: TTS-016
Technical Specification:
* Implement CJKTerminalMatcher identifying terminal punctuation marks:
* Mandarin / Japanese: 。, ！, ？, …, \n
* Standard Western: ., !, ?
* Ignore periods in decimal numbers (e.g., 3.5) and abbreviations (e.g., Mr.).
Acceptance Criteria & Validation:
* Splits "你好！欢迎来到东京。请坐。" into three discrete sentences: ["你好！", "欢迎来到东京。", "请坐。"].
* Validation: uv run pytest tests/text/test_cjk_punct.py

`TTS-018`: Asian Comma & Sub-Clause Pausing Heuristic Filter
Module: backend/app/core/text/cjk_pause.py
Dependencies: TTS-017
Technical Specification:
* Implement sub-clause splitter on enumeration commas (、) and standard commas (,, ，) when the accumulated token buffer exceeds 30 characters.
Acceptance Criteria & Validation:
* Prevents over-long run-on sentences while avoiding premature splitting on short clauses.
* Validation: uv run pytest tests/text/test_cjk_pause.py

`TTS-019`: Thai Script Word Break Segmentation Engine
Module: backend/app/core/text/thai_seg.py
Dependencies: TTS-016
Technical Specification:
* Implement ThaiSentenceSegmenter using pythainlp.tokenize.word_tokenize (or lightweight ICU dictionary fallback).
* Segment on space boundaries, polite particles (ครับ, ค่ะ), and clause markers (และ, หรือ, แต่) when buffer length $> 25$ characters.
Acceptance Criteria & Validation:
* Accurately segments un-spaced Thai sentences (e.g., "ยินดีต้อนรับครับราคาเท่าไหร่") into natural utterance chunks.
* Validation: uv run pytest tests/text/test_thai_seg.py

`TTS-020`: Quoted Dialogue & Parenthetical Enclosure Handler
Module: backend/app/core/text/enclosures.py
Dependencies: TTS-017
Technical Specification:
* Implement EnclosureAwareBuffer handling nested quotation marks: 「…」, 『…』, “…”, (…).
* Prevent sentence splitting inside an unclosed quote or parenthetical enclosure.
Acceptance Criteria & Validation:
* Preserves full quoted utterance "他说：『明天去曼谷。』" as a single coherent synthesis block.
* Validation: uv run pytest tests/text/test_enclosures.py

`TTS-021`: Number, Currency & Measure Word Normalizer
Module: backend/app/core/text/numbers.py
Dependencies: None
Technical Specification:
* Normalize currency symbols and numerical values for target languages:
* ¥1,500 $\rightarrow$ 千五百円 (Japanese) / 一千五百块 (Mandarin)
* ฿250 $\rightarrow$ สองร้อยห้าสิบบาท (Thai)
* ₫50.000 $\rightarrow$ năm mươi nghìn đồng (Vietnamese)
Acceptance Criteria & Validation:
* Converts numeric digits to native phonetic script to ensure accurate TTS pronunciation.
* Validation: uv run pytest tests/text/test_number_normalizer.py

`TTS-022`: Latin Acronym & Mixed Script Phonetic Expander
Module: backend/app/core/text/acronyms.py
Dependencies: None
Technical Specification:
* Expand common English travel terms in Asian contexts: BTS (Bangkok Train), MRT, 7-11 (*Seven-Eleven* / *Sebun*), SIM, Wi-Fi.
Acceptance Criteria & Validation:
* Expands acronyms into locale-appropriate phonetic readings.
* Validation: uv run pytest tests/text/test_acronyms.py

`TTS-023`: Minimum Syllable Threshold & Lookahead Buffer
Module: backend/app/core/text/lookahead.py
Dependencies: TTS-017
Technical Specification:
* Enforce minimum chunk length $\ge 4$ syllables before releasing to TTS.
* Merge standalone short greetings ("Hi.", "Oh.") with the subsequent sentence token stream.
Acceptance Criteria & Validation:
* Prevents jarring, disjointed 1-word audio chunks.
* Validation: uv run pytest tests/text/test_lookahead.py

`TTS-024`: Maximum Character Length Forced Splitting Strategy
Module: backend/app/core/text/splitter.py
Dependencies: TTS-017
Technical Specification:
* Enforce hard ceiling of 80 characters per synthesis chunk.
* If no punctuation occurs, split at the nearest particle/space boundary with an ellipsis pause mark (…).
Acceptance Criteria & Validation:
* Eliminates TTS engine timeouts on run-on conversational inputs.
* Validation: uv run pytest tests/text/test_splitter.py

`TTS-025`: Whitespace & Zero-Width Space Sanitization Pipe
Module: backend/app/core/text/sanitizer.py
Dependencies: None
Technical Specification:
* Strip zero-width spaces (\u200b), non-breaking spaces (\u00a0), redundant consecutive spaces, and trailing carriage returns (\r\n).
Acceptance Criteria & Validation:
* Produces sanitized Unicode strings free of hidden control characters.
* Validation: uv run pytest tests/text/test_sanitizer.py

`TTS-026`: Stream End-of-Transmission (EOT) Flush Logic
Module: backend/app/core/text/flusher.py
Dependencies: TTS-016
Technical Specification:
* Implement flush_remaining(buffer: AbstractTokenBuffer) -> list[str].
* On stream termination signal, flush all remaining residual buffer tokens regardless of punctuation state.
Acceptance Criteria & Validation:
* Guarantees zero dropped tokens at the conclusion of an LLM generation stream.
* Validation: uv run pytest tests/text/test_flusher.py

`TTS-027`: Streaming Sentence Token Pipeline Orchestrator
Module: backend/app/core/text/orchestrator.py
Dependencies: TTS-017 through TTS-026
Technical Specification:
* Implement async def stream_sentence_chunks(token_gen: AsyncGenerator[str, None], lang: str) -> AsyncGenerator[str, None].
* Pipe raw incoming LLM tokens through sanitizers, language segmenters, lookaheads, and flusher.
Acceptance Criteria & Validation:
* Streams discrete, fully punctuated sentences in real time with $< 5\text{ms}$ buffer overhead.
* Validation: uv run pytest tests/text/test_orchestrator.py

`TTS-028`: Token Buffer Benchmark & Latency Profiler
Module: backend/app/core/text/benchmark.py
Dependencies: TTS-027
Technical Specification:
* Create automated benchmark measuring buffering latency and chunk distribution across a 10,000-token multilingual test corpus.
Acceptance Criteria & Validation:
* Buffering overhead is strictly $< 2.0\text{ms}$ per token.
* Validation: uv run pytest tests/text/test_benchmark.py

`TTS-029`: Edge-Case Emoji & Markdown Syntax Stripper
Module: backend/app/core/text/cleaner.py
Dependencies: None
Technical Specification:
* Strip markdown syntax (bold, *italic*, [links](url), # headers, \code\) and non-vocalized Unicode emojis before passing text to TTS.
Acceptance Criteria & Validation:
* Converts "ราคา 50 บาท 🍜!" $\rightarrow$ "ราคา 50 บาท!".
* Validation: uv run pytest tests/text/test_cleaner.py

`TTS-030`: Sentence Boundary Test Suite with Multilingual Matrix
Module: backend/app/tests/core/test_token_buffer.py
Dependencies: TTS-016 through TTS-029
Technical Specification:
* Comprehensive test matrix covering 50 complex dialog samples per language (Japanese, Mandarin, Thai, Vietnamese, Korean).
Acceptance Criteria & Validation:
* 100% test pass rate on conversational transcripts, numbers, questions, and mixed scripts.
* Validation: uv run pytest tests/core/test_token_buffer.py -v


Module 3: Raw Audio Ingestion, Decoding & Resampling (`TTS-031` – `TTS-045`)

`TTS-031`: PyAV / FFmpeg Context Initialization & Probe
Module: backend/app/core/audio/engine.py
Dependencies: None
Technical Specification:
* Initialize PyAV (av) context. Verify presence of underlying libavformat, libavcodec, libswresample, libopus.
* Expose engine diagnostics get_av_capabilities() -> dict.
Acceptance Criteria & Validation:
* Verifies PyAV is linked against requisite audio decoders/encoders.
* Validation: uv run pytest tests/audio/test_engine.py

`TTS-032`: Generic Binary Audio Container Sniffer & Format Probe
Module: backend/app/core/audio/probe.py
Dependencies: TTS-031
Technical Specification:
* Implement probe_audio_bytes(data: bytes) -> AudioStreamMetadata.
* Extract format container, codec, sample rate, channels, duration, and bit depth from magic bytes / container headers.
Acceptance Criteria & Validation:
* Correctly identifies MP3, WAV, Ogg/Opus, AAC, and WebM byte streams.
* Validation: uv run pytest tests/audio/test_probe.py

`TTS-033`: In-Memory Byte Stream Audio Decoder
Module: backend/app/core/audio/decoder.py
Dependencies: TTS-031, TTS-032
Technical Specification:
* Implement decode_to_numpy(audio_bytes: bytes) -> tuple[np.ndarray, int].
* Reads binary bytes via io.BytesIO container into floating-point numpy array float32 $[-1.0, 1.0]$.
Acceptance Criteria & Validation:
* Decodes arbitrary MP3/WAV inputs into uncompressed PCM audio arrays without disk I/O.
* Validation: uv run pytest tests/audio/test_decoder.py

`TTS-034`: Multi-Channel to Mono Downmixing Transformer
Module: backend/app/core/audio/channels.py
Dependencies: TTS-033
Technical Specification:
* Implement downmix_to_mono(audio_data: np.ndarray) -> np.ndarray.
* If stereo (2 channels), compute standard ITU acoustic average: $M = 0.5 \cdot L + 0.5 \cdot R$.
* If multi-channel ($>2$), sum with normalized weight vector.
Acceptance Criteria & Validation:
* Outputs 1D numpy array with mono audio; preserves 1D inputs unchanged.
* Validation: uv run pytest tests/audio/test_channels.py

`TTS-035`: High-Fidelity 16kHz Sinc Resampling Filter
Module: backend/app/core/audio/resampler.py
Dependencies: TTS-033
Technical Specification:
* Implement resample_audio(audio_data: np.ndarray, orig_sr: int, target_sr: int = 16000) -> np.ndarray.
* Utilize PyAV av.AudioResampler or polyphase sinc filtering via scipy.signal.resample_poly with anti-aliasing low-pass filter.
Acceptance Criteria & Validation:
* Resamples 24kHz, 44.1kHz, and 48kHz inputs to 16,000Hz with SNR $> 90\text{dB}$ and zero audible aliasing artifacts.
* Validation: uv run pytest tests/audio/test_resampler.py

`TTS-036`: Linear PCM 16-bit Signed Little-Endian Formatter
Module: backend/app/core/audio/pcm.py
Dependencies: TTS-035
Technical Specification:
* Implement float32_to_pcm16(audio_data: np.ndarray) -> bytes and pcm16_to_float32(pcm_bytes: bytes) -> np.ndarray.
* Clip values outside $[-1.0, 1.0]$ and scale to $[-32768, 32767]$ int16 ().
Acceptance Criteria & Validation:
* Produces valid raw linear PCM 16-bit LE byte buffers compatible with Whisper STT and Web Audio API.
* Validation: uv run pytest tests/audio/test_pcm.py

`TTS-037`: Audio Frame Slicer & Time-Indexed Chunk Generator
Module: backend/app/core/audio/chunker.py
Dependencies: TTS-036
Technical Specification:
* Implement chunk_pcm16_stream(pcm_bytes: bytes, frame_duration_ms: int = 20, sample_rate: int = 16000) -> Generator[bytes, None, None].
* Calculate frame size: $\text{bytes\_per\_frame} = \frac{16000 \cdot 2 \cdot 20}{1000} = 640\text{ bytes}$.
Acceptance Criteria & Validation:
* Emits contiguous 640-byte chunks corresponding to precise 20ms audio frames.
* Validation: uv run pytest tests/audio/test_chunker.py

`TTS-038`: Silence Trimmer & Noise Gate
Module: backend/app/core/audio/silence.py
Dependencies: TTS-033
Technical Specification:
* Implement trim_silence(audio_data: np.ndarray, threshold_db: float = -45.0, pad_ms: int = 50, sample_rate: int = 16000) -> np.ndarray.
* Strip leading and trailing silence below threshold while retaining 50ms smooth fade boundary.
Acceptance Criteria & Validation:
* Trims dead air at start/end of TTS output without cutting into initial attack phonemes.
* Validation: uv run pytest tests/audio/test_silence.py

`TTS-039`: Zero-Crossing Point Audio Splicer
Module: backend/app/core/audio/splicer.py
Dependencies: TTS-033
Technical Specification:
* Implement splice_audio_chunks(chunks: list[np.ndarray], crossfade_samples: int = 64) -> np.ndarray.
* Find closest zero-crossing point and apply 4ms linear crossfade curve between concatenated audio segments.
Acceptance Criteria & Validation:
* Eliminates acoustic clicks and pop artifacts at sentence splice boundaries.
* Validation: uv run pytest tests/audio/test_splicer.py

`TTS-040`: Dynamic Audio Buffer Pool & Memory Recycling Manager
Module: backend/app/core/audio/pool.py
Dependencies: None
Technical Specification:
* Implement AudioMemoryPool managing reusable pre-allocated bytearray memory buffers to reduce Python GC pauses during high-concurrency streaming.
Acceptance Criteria & Validation:
* Recycles byte buffers and reduces memory allocation overhead by $> 60\%$.
* Validation: uv run pytest tests/audio/test_pool.py

`TTS-041`: Asynchronous Audio Transform Pipeline
Module: backend/app/core/audio/pipeline.py
Dependencies: TTS-033 through TTS-039
Technical Specification:
* Implement AudioIngestionPipeline.process_raw_bytes(raw_bytes: bytes) -> tuple[bytes, AudioStreamMetadata].
* Executes Decode $\rightarrow$ Downmix Mono $\rightarrow$ Resample 16kHz $\rightarrow$ Trim Silence $\rightarrow$ Format PCM16.
Acceptance Criteria & Validation:
* Converts any arbitrary input audio file into standardized 16kHz mono PCM16 bytes in $< 15\text{ms}$.
* Validation: uv run pytest tests/audio/test_pipeline.py

`TTS-042`: Corrupted Frame Recovery & Header Repair Utility
Module: backend/app/core/audio/repair.py
Dependencies: TTS-031
Technical Specification:
* Implement repair_truncated_audio_stream(truncated_bytes: bytes, container: str = "mp3") -> bytes.
* Rebuilds container headers and truncates partial trailing frames to prevent decoder crashes.
Acceptance Criteria & Validation:
* Gracefully decodes mid-stream dropped TCP audio streams without raising uncaught exceptions.
* Validation: uv run pytest tests/audio/test_repair.py

`TTS-043`: Audio Duration, Sample Count & Bitrate Validator
Module: backend/app/core/audio/validator.py
Dependencies: TTS-032
Technical Specification:
* Implement validate_audio_characteristics(pcm_bytes: bytes, max_duration_sec: float = 30.0, sample_rate: int = 16000) -> bool.
Acceptance Criteria & Validation:
* Validates audio length and raises AudioDurationLimitExceeded on oversized files.
* Validation: uv run pytest tests/audio/test_validator.py

`TTS-044`: Synthetic Tone & Sine Wave Audio Generator for Calibration
Module: backend/app/core/audio/synth.py
Dependencies: TTS-036
Technical Specification:
* Implement generate_sine_wave(freq_hz: float = 440.0, duration_sec: float = 1.0, sample_rate: int = 16000, amplitude: float = 0.5) -> bytes.
Acceptance Criteria & Validation:
* Produces calibration test signals for audio pipeline unit testing.
* Validation: uv run pytest tests/audio/test_synth.py

`TTS-045`: Resampling & PCM Conversion Test Suite
Module: backend/app/tests/core/test_resampling.py
Dependencies: TTS-031 through TTS-044
Technical Specification:
* Comprehensive test suite testing all common container formats (MP3, WAV, OGG, FLAC, AAC, M4A) at 8kHz, 22.05kHz, 44.1kHz, 48kHz, 96kHz.
Acceptance Criteria & Validation:
* All formats successfully convert to standardized 16kHz mono PCM16 bytes.
* Validation: uv run pytest tests/core/test_resampling.py -v


Module 4: Normalization, EBU R128 LUFS & Dynamic Range Control (`TTS-046` – `TTS-060`)

`TTS-046`: EBU R128 / ITU-R BS.1770-4 Loudness Meter Engine
Module: backend/app/core/audio/lufs_meter.py
Dependencies: TTS-033
Technical Specification:
* Implement LoudnessMeterBS1770 applying K-weighting pre-filter ($f_0 = 1681.9\text{ Hz}$, $G = +3.99\text{ dB}$) and RLB high-pass weighting filter.
Acceptance Criteria & Validation:
* Measures loudness conforming to ITU-R BS.1770-4 calibration tolerances within $\pm 0.1\text{ LUFS}$.
* Validation: uv run pytest tests/audio/test_lufs_meter.py

`TTS-047`: Integrated Loudness Calculation Module
Module: backend/app/core/audio/integrated_lufs.py
Dependencies: TTS-046
Technical Specification:
* Implement calculate_integrated_lufs(audio_data: np.ndarray, sample_rate: int = 16000) -> float.
* Computes gated loudness across 400ms overlapping blocks with $-70\text{ LKFS}$ absolute gate and $-10\text{ LU}$ relative gate.
Acceptance Criteria & Validation:
* Returns accurate integrated LUFS metric across full audio track.
* Validation: uv run pytest tests/audio/test_integrated_lufs.py

`TTS-048`: Short-Term & Momentary Loudness Window Calculator
Module: backend/app/core/audio/windowed_lufs.py
Dependencies: TTS-046
Technical Specification:
* Implement calculate_momentary_lufs(frame_400ms: np.ndarray) and calculate_short_term_lufs(window_3s: np.ndarray).
Acceptance Criteria & Validation:
* Computes sliding loudness telemetry for live audio streaming streams.
* Validation: uv run pytest tests/audio/test_windowed_lufs.py

`TTS-049`: Target -16 LUFS Linear Gain Calculation Transformer
Module: backend/app/core/audio/gain.py
Dependencies: TTS-047
Technical Specification:
* Implement calculate_lufs_gain_factor(current_lufs: float, target_lufs: float = -16.0) -> float.
* Formula: $\text{gain\_db} = \text{target\_lufs} - \text{current\_lufs}$; $\text{factor} = 10^{\frac{\text{gain\_db}}{20}}$.
Acceptance Criteria & Validation:
* Correctly computes linear multiplier to match $-16\text{ LUFS}$.
* Validation: uv run pytest tests/audio/test_gain.py

`TTS-050`: True Peak Intersample Overshoot Detector
Module: backend/app/core/audio/true_peak.py
Dependencies: TTS-033
Technical Specification:
* Implement calculate_true_peak_dbfs(audio_data: np.ndarray, sample_rate: int = 16000) -> float.
* $4\times$ oversampling interpolation via polyphase filter to detect intersample peaks.
Acceptance Criteria & Validation:
* Accurately detects intersample overshoots exceeding $0.0\text{ dBFS}$.
* Validation: uv run pytest tests/audio/test_true_peak.py

`TTS-051`: Hard & Soft Knee Peak Limiter (-1.0 dBTP Ceiling)
Module: backend/app/core/audio/limiter.py
Dependencies: TTS-050
Technical Specification:
* Implement apply_lookahead_limiter(audio_data: np.ndarray, ceiling_dbtp: float = -1.0, lookahead_ms: float = 3.0, release_ms: float = 50.0, sample_rate: int = 16000) -> np.ndarray.
Acceptance Criteria & Validation:
* Clamps true peaks strictly below $-1.0\text{ dBTP}$ with zero harsh digital distortion or clipping.
* Validation: uv run pytest tests/audio/test_limiter.py

`TTS-052`: Dynamic Range Compression (DRC) Curve Processor
Module: backend/app/core/audio/compressor.py
Dependencies: TTS-033
Technical Specification:
* Implement apply_speech_compressor(audio_data: np.ndarray, threshold_db: float = -24.0, ratio: float = 2.5, attack_ms: float = 15.0, release_ms: float = 100.0, sample_rate: int = 16000) -> np.ndarray.
Acceptance Criteria & Validation:
* Evens out whisper-to-shout dynamic volume differences for speech clarity on mobile speakers.
* Validation: uv run pytest tests/audio/test_compressor.py

`TTS-053`: Sub-Bass High-Pass Filter (80Hz Cutoff)
Module: backend/app/core/audio/highpass.py
Dependencies: TTS-033
Technical Specification:
* Implement Butterworth 2nd-order high-pass filter ($f_c = 80\text{ Hz}$) via scipy.signal.butter and sosfilt.
Acceptance Criteria & Validation:
* Attenuates sub-audible low-frequency rumble ($< 80\text{ Hz}$) by $> 18\text{ dB/octave}$.
* Validation: uv run pytest tests/audio/test_highpass.py

`TTS-054`: High-Frequency De-Esser for Sibilance Taming
Module: backend/app/core/audio/deesser.py
Dependencies: TTS-033
Technical Specification:
* Implement sidechain bandpass filter ($5\text{ kHz} - 8\text{ kHz}$) dynamic compressor taming harsh sibilance in Japanese and Mandarin fricatives (*sh*, *ch*, *ts*).
Acceptance Criteria & Validation:
* Reduces harsh high-frequency spikes without muffling vocal presence.
* Validation: uv run pytest tests/audio/test_deesser.py

`TTS-055`: Two-Pass Loudness Normalizer Wrapper
Module: backend/app/core/audio/normalizer.py
Dependencies: TTS-047, TTS-049, TTS-051, TTS-053, TTS-054
Technical Specification:
* Implement normalize_audio_lufs(audio_data: np.ndarray, target_lufs: float = -16.0, ceiling_dbtp: float = -1.0, sample_rate: int = 16000) -> np.ndarray.
* Pass 1: Highpass $\rightarrow$ De-esser $\rightarrow$ Measure Integrated LUFS $\rightarrow$ Apply Gain.
* Pass 2: Peak Limiter clamping to ceiling.
Acceptance Criteria & Validation:
* Output audio measures $-16.0 \pm 0.5\text{ LUFS}$ with true peak $\le -1.0\text{ dBTP}$.
* Validation: uv run pytest tests/audio/test_normalizer.py

`TTS-056`: Single-Pass Fast Heuristic Normalizer for Live Streams
Module: backend/app/core/audio/fast_normalizer.py
Dependencies: TTS-048, TTS-051
Technical Specification:
* Implement StreamingFastNormalizer maintaining an Exponential Moving Average (EMA) of frame loudness and applying instantaneous gain with smoothed release.
Acceptance Criteria & Validation:
* Normalizes continuous real-time audio streams with $< 1\text{ms}$ computational latency.
* Validation: uv run pytest tests/audio/test_fast_normalizer.py

`TTS-057`: Audio Clipping & Distortion Telemetry Sensor
Module: backend/app/core/audio/clipping.py
Dependencies: TTS-033
Technical Specification:
* Implement detect_clipping_events(audio_data: np.ndarray, threshold: float = 0.999) -> int.
* Count consecutive clipped samples; emit warning if $> 3$ consecutive samples are clipped.
Acceptance Criteria & Validation:
* Detects clipped waveforms and records metrics for audio quality monitoring.
* Validation: uv run pytest tests/audio/test_clipping.py

`TTS-058`: Acoustic Loudness Profile Comparator
Module: backend/app/core/audio/comparator.py
Dependencies: TTS-047, TTS-050
Technical Specification:
* Implement compare_audio_profiles(before: np.ndarray, after: np.ndarray) -> dict.
* Outputs delta table: $\Delta\text{LUFS}$, $\Delta\text{TruePeak}$, dynamic range compression ratio, and RMS energy shift.
Acceptance Criteria & Validation:
* Produces structured diagnostic diffs for automated audio QA pipelines.
* Validation: uv run pytest tests/audio/test_comparator.py

`TTS-059`: Normalization Configuration & Preset Profiles
Module: backend/app/core/audio/profiles.py
Dependencies: None
Technical Specification:
* Define presets: FLASHCARD_PRONUNCIATION ($-14\text{ LUFS}$, aggressive limiter), TRAVEL_ROLEPLAY ($-16\text{ LUFS}$, natural dynamics), OFFLINE_PHRASEBOOK ($-15\text{ LUFS}$, maximum intelligibility).
Acceptance Criteria & Validation:
* Typed profile objects pass into normalizer seamlessly.
* Validation: uv run pytest tests/audio/test_profiles.py

`TTS-060`: Normalization Test Suite with Multi-Loudness Test Assets
Module: backend/app/tests/core/test_normalizer.py
Dependencies: TTS-046 through TTS-059
Technical Specification:
* Test suite evaluating audio clips ranging from $-30\text{ LUFS}$ to $-6\text{ LUFS}$.
Acceptance Criteria & Validation:
* All normalized assets converge precisely to $-16.0 \pm 0.5\text{ LUFS}$ without digital clipping.
* Validation: uv run pytest tests/core/test_normalizer.py -v


Module 5: Codec Encoders & WebSocket/HTTP Streaming (`TTS-061` – `TTS-075`)

`TTS-061`: libopus PyAV Async Audio Encoder
Module: backend/app/core/codecs/opus.py
Dependencies: TTS-031, TTS-036
Technical Specification:
* Implement OpusEncoder using PyAV libopus.
* Methods: encode_frame(pcm16_frame: bytes) -> bytes, flush() -> bytes.
* Support 20ms frame sizes at 16kHz mono.
Acceptance Criteria & Validation:
* Compresses 640-byte raw PCM frames into valid Opus packets.
* Validation: uv run pytest tests/codecs/test_opus.py

`TTS-062`: Opus Bitrate, Complexity & VBR Configuration Matrix
Module: backend/app/core/codecs/opus_config.py
Dependencies: TTS-061
Technical Specification:
* Configure Opus parameters: bit_rate=24000 (24kbps speech optimized), application="voip", complexity=5, vbr=True.
Acceptance Criteria & Validation:
* Balances low CPU utilization on edge nodes with pristine voice clarity.
* Validation: uv run pytest tests/codecs/test_opus_config.py

`TTS-063`: Ogg/Opus Container Multiplexer
Module: backend/app/core/codecs/ogg_mux.py
Dependencies: TTS-061
Technical Specification:
* Implement OggOpusMuxer generating valid Ogg header packets (OpusHead, OpusTags) with granule position tracking across pages.
Acceptance Criteria & Validation:
* Generates playable .opus / .ogg files playable across browser audio tags.
* Validation: uv run pytest tests/codecs/test_ogg_mux.py

`TTS-064`: WebM/Opus Streaming Container Packager
Module: backend/app/core/codecs/webm_mux.py
Dependencies: TTS-061
Technical Specification:
* Implement WebMOpusStreamer packaging Opus frames inside lightweight EBML / Matroska WebM clusters for live streaming to HTML5 elements.
Acceptance Criteria & Validation:
* Browser client initializes playback after receiving first EBML header cluster.
* Validation: uv run pytest tests/codecs/test_webm_mux.py

`TTS-065`: AAC-LC / MP4 Audio Encoder Fallback
Module: backend/app/core/codecs/aac.py
Dependencies: TTS-031
Technical Specification:
* Implement AACEncoder using aac encoder (bitrate 32kbps, ADTS container) for legacy iOS Safari compatibility.
Acceptance Criteria & Validation:
* Encodes PCM audio into valid ADTS AAC stream.
* Validation: uv run pytest tests/codecs/test_aac.py

`TTS-066`: MP3 High-Compatibility Encoder
Module: backend/app/core/codecs/mp3.py
Dependencies: TTS-031
Technical Specification:
* Implement MP3Encoder using libmp3lame (constant bitrate 64kbps mono) for static flashcard asset downloads.
Acceptance Criteria & Validation:
* Produces universal MP3 byte stream with valid ID3 tags.
* Validation: uv run pytest tests/codecs/test_mp3.py

`TTS-067`: Frame-by-Frame Chunked Audio Stream Generator
Module: backend/app/core/streaming/chunk_stream.py
Dependencies: TTS-037, TTS-061
Technical Specification:
* Implement async def pcm_to_opus_stream(pcm_stream: AsyncGenerator[bytes, None]) -> AsyncGenerator[bytes, None].
* Encodes 20ms PCM chunks into individual Opus frames in real time.
Acceptance Criteria & Validation:
* Yields compressed Opus frames with $< 2\text{ms}$ per-frame processing latency.
* Validation: uv run pytest tests/streaming/test_chunk_stream.py

`TTS-068`: Binary WebSocket Audio Frame Serializer
Module: backend/app/core/streaming/ws_serializer.py
Dependencies: None
Technical Specification:
* Protocol: 4-byte header (Magic 0xAA 0x55, 1-byte Message Type 0x01=AUDIO_OPUS, 1-byte Sequence ID) followed by raw Opus packet payload.
Acceptance Criteria & Validation:
* Serializes and parses binary WebSocket voice packets with sequence integrity verification.
* Validation: uv run pytest tests/streaming/test_ws_serializer.py

`TTS-069`: Out-of-Band Audio Metadata & Sequence Packet Header
Module: backend/app/core/streaming/headers.py
Dependencies: TTS-068
Technical Specification:
* Define JSON control message schemas: StreamStart(sample_rate, channels, codec), StreamEnd(total_frames, duration_ms), StreamError(code, message).
Acceptance Criteria & Validation:
* Transmits stream lifecycle signals over text WebSocket frames alongside binary audio.
* Validation: uv run pytest tests/streaming/test_headers.py

`TTS-070`: Client Backpressure & Adaptive Bitrate Throttle
Module: backend/app/core/streaming/backpressure.py
Dependencies: None
Technical Specification:
* Monitor WebSocket send buffer queue size.
* If client buffer exceeds 500ms, throttle Opus encoding bitrate (24kbps $\rightarrow$ 16kbps) or drop non-essential metadata frames.
Acceptance Criteria & Validation:
* Prevents server memory bloat when clients experience high network jitter or packet loss.
* Validation: uv run pytest tests/streaming/test_backpressure.py

`TTS-071`: Streaming Audio Jitter Buffer Simulator
Module: backend/app/core/streaming/jitter.py
Dependencies: TTS-068
Technical Specification:
* Implement JitterBufferSimulator for testing client packet arrival variances (0ms – 200ms randomized delays and out-of-order delivery).
Acceptance Criteria & Validation:
* Simulates lossy mobile network conditions for automated QA.
* Validation: uv run pytest tests/streaming/test_jitter.py

`TTS-072`: HTTP Chunked Transfer Encoding Audio Endpoint Handler
Module: backend/app/routers/streaming_http.py
Dependencies: TTS-063, TTS-067
Technical Specification:
* Implement endpoint GET /api/v1/audio/stream/tts returning StreamingResponse(content_type="audio/ogg; codecs=opus") with Transfer-Encoding: chunked.
Acceptance Criteria & Validation:
* Plays back in HTML5 with immediate playback startup.
* Validation: uv run pytest tests/routers/test_streaming_http.py

`TTS-073`: WebSocket Low-Latency Binary Voice Dispatcher
Module: backend/app/routers/streaming_ws.py
Dependencies: TTS-068, TTS-069
Technical Specification:
* Implement WebSocket endpoint /api/v1/ws/tts/live dispatching bidirectional binary voice chunks with ping/pong keepalive.
Acceptance Criteria & Validation:
* Streams real-time synthesized voice frames with $< 150\text{ms}$ glass-to-glass latency.
* Validation: uv run pytest tests/routers/test_streaming_ws.py

`TTS-074`: Gapless Audio Concatenation Engine
Module: backend/app/core/streaming/gapless.py
Dependencies: TTS-039, TTS-061
Technical Specification:
* Concatenate multiple synthesized sentence audio files into a single seamless audio stream with zero phase discontinuities.
Acceptance Criteria & Validation:
* Produces smooth multi-sentence audio playback without pauses or pops.
* Validation: uv run pytest tests/streaming/test_gapless.py

`TTS-075`: Codec & Streaming Performance Benchmark Test Suite
Module: backend/app/tests/core/test_codecs.py
Dependencies: TTS-061 through TTS-074
Technical Specification:
* Benchmark encoding speed and memory overhead across 100 concurrent streams.
Acceptance Criteria & Validation:
* Real-time encoding factor $> 15\times$ speedup on single CPU core.
* Validation: uv run pytest tests/core/test_codecs.py -v


Module 6: S3 / Cloudflare R2 Storage, Multipart Uploads & Presigned URLs (`TTS-076` – `TTS-088`)

`TTS-076`: Storage Configuration & Environment Schema
Module: backend/app/core/storage/config.py
Dependencies: None
Technical Specification:
* Define StorageSettings(endpoint_url, bucket_name, access_key_id, secret_access_key, region_name="auto", public_cdn_domain).
Acceptance Criteria & Validation:
* Validates Cloudflare R2 / AWS S3 S3-compatible configuration.
* Validation: uv run pytest tests/storage/test_config.py

`TTS-077`: aioboto3 Session Pool & Client Lifecycle Manager
Module: backend/app/core/storage/client.py
Dependencies: TTS-076
Technical Specification:
* Implement async context manager get_s3_client() yielding aioboto3.client("s3") with connection pool limits.
Acceptance Criteria & Validation:
* Reuses async S3 client sessions safely across concurrent coroutines.
* Validation: uv run pytest tests/storage/test_client.py

`TTS-078`: Deterministic SHA-256 Storage Key & Directory Generator
Module: backend/app/core/storage/keys.py
Dependencies: None
Technical Specification:
* Implement generate_audio_s3_key(lang: str, category: str, content_hash: str, ext: str = "opus") -> str.
* Path structure: audio/{lang}/{category}/{content_hash[:2]}/{content_hash}.{ext}.
Acceptance Criteria & Validation:
* Generates balanced, collision-free S3 prefix distributions for optimal partition performance.
* Validation: uv run pytest tests/storage/test_keys.py

`TTS-079`: Single-Part Small Audio Object Uploader
Module: backend/app/core/storage/single_upload.py
Dependencies: TTS-077, TTS-078
Technical Specification:
* Implement upload_audio_bytes(key: str, data: bytes, content_type: str = "audio/opus") -> str.
* Sets headers: Content-Type, Cache-Control: public, max-age=31536000, immutable.
Acceptance Criteria & Validation:
* Uploads small audio files ($< 5\text{MB}$) in a single PUT operation and returns public CDN URL.
* Validation: uv run pytest tests/storage/test_single_upload.py

`TTS-080`: Concurrency-Controlled Multipart Upload Manager
Module: backend/app/core/storage/multipart.py
Dependencies: TTS-077, TTS-078
Technical Specification:
* Implement upload_multipart_audio(key: str, file_stream: AsyncGenerator[bytes, None], part_size_mb: int = 5) -> str.
* Parallelizes part uploads with max concurrency $= 4$ and automatic abort on exception.
Acceptance Criteria & Validation:
* Reliably uploads large multi-minute audio dialogues without buffering the entire file in RAM.
* Validation: uv run pytest tests/storage/test_multipart.py

`TTS-081`: S3 Object Metadata & Audio Tagging Pipeline
Module: backend/app/core/storage/metadata.py
Dependencies: TTS-079
Technical Specification:
* Attach custom S3 metadata headers: x-amz-meta-duration-ms, x-amz-meta-voice-id, x-amz-meta-lufs, x-amz-meta-sample-rate.
Acceptance Criteria & Validation:
* Metadata is verified via HeadObject on uploaded S3 assets.
* Validation: uv run pytest tests/storage/test_metadata.py

`TTS-082`: Presigned GET URL Generator with TTL Enforcement
Module: backend/app/core/storage/presigned_get.py
Dependencies: TTS-077
Technical Specification:
* Implement generate_presigned_get_url(key: str, expires_in_seconds: int = 3600) -> str.
Acceptance Criteria & Validation:
* Generates signed URL granting temporary read access to private audio assets.
* Validation: uv run pytest tests/storage/test_presigned_get.py

`TTS-083`: Presigned PUT URL Generator for Client Direct Uploads
Module: backend/app/core/storage/presigned_put.py
Dependencies: TTS-077
Technical Specification:
* Implement generate_presigned_put_url(key: str, content_type: str, max_size_bytes: int = 10485760, expires_in: int = 600) -> dict.
Acceptance Criteria & Validation:
* Returns presigned URL and form fields allowing direct client recording uploads to R2.
* Validation: uv run pytest tests/storage/test_presigned_put.py

`TTS-084`: Storage Object Exists & HeadObject Metadata Probe
Module: backend/app/core/storage/probe.py
Dependencies: TTS-077
Technical Specification:
* Implement check_audio_exists(key: str) -> bool and get_audio_metadata(key: str) -> AudioMetadata | None.
Acceptance Criteria & Validation:
* Returns True if file is already synthesized and cached in R2, skipping duplicate synthesis.
* Validation: uv run pytest tests/storage/test_probe.py

`TTS-085`: S3 Bucket Lifecycle & Ephemeral Temp Audio Cleanup Rule Builder
Module: backend/app/core/storage/lifecycle.py
Dependencies: TTS-076
Technical Specification:
* Create setup_bucket_lifecycle_rules() applying 7-day expiration to temp/* and multipart abort timeout after 24 hours.
Acceptance Criteria & Validation:
* Lifecycle configuration JSON validates against AWS S3 / Cloudflare R2 specs.
* Validation: uv run pytest tests/storage/test_lifecycle.py

`TTS-086`: Asynchronous Batch Object Deletion Service
Module: backend/app/core/storage/batch_delete.py
Dependencies: TTS-077
Technical Specification:
* Implement delete_audio_keys_batch(keys: list[str]) -> BatchDeleteResult.
* Chunks deletion requests into max 1,000 keys per S3 DeleteObjects call.
Acceptance Criteria & Validation:
* Deletes batches of orphaned audio assets idempotently.
* Validation: uv run pytest tests/storage/test_batch_delete.py

`TTS-087`: Storage Failover & Local Filesystem Fallback Client
Module: backend/app/core/storage/fallback.py
Dependencies: TTS-079
Technical Specification:
* Implement LocalStorageFallback saving audio files to local /tmp/audio_fallback directory if S3/R2 endpoints are unreachable.
Acceptance Criteria & Validation:
* Prevents audio generation failure during cloud storage network partitions.
* Validation: uv run pytest tests/storage/test_fallback.py

`TTS-088`: Storage Client Test Suite with Moto / S3 Mock
Module: backend/app/tests/core/test_storage.py
Dependencies: TTS-076 through TTS-087
Technical Specification:
* Full integration test suite using moto[s3] verifying single-part, multipart, presigned URLs, and error scenarios.
Acceptance Criteria & Validation:
* 100% test coverage across all storage client functions without live AWS credentials.
* Validation: uv run pytest tests/core/test_storage.py -v


Module 7: Waveform Peaks, CDN Caching & Observability (`TTS-089` – `TTS-100`)

`TTS-089`: 100-Point Normalized Waveform Peak Data Extractor
Module: backend/app/core/waveform/extractor.py
Dependencies: TTS-033
Technical Specification:
* Implement extract_waveform_peaks(audio_data: np.ndarray, num_points: int = 100) -> list[float].
* Subdivide audio into 100 equal time slices; compute RMS / Peak amplitude for each slice and normalize to $[0.0, 1.0]$.
Acceptance Criteria & Validation:
* Generates exactly 100 normalized float values representing vocal energy envelope for UI canvas visualizers.
* Validation: uv run pytest tests/waveform/test_extractor.py

`TTS-090`: Min/Max Floating-Point Peak Array Compressor
Module: backend/app/core/waveform/compressor.py
Dependencies: TTS-089
Technical Specification:
* Implement compress_peaks_to_int8(peaks: list[float]) -> bytes mapping $[0.0, 1.0]$ to $[0, 255]$ uint8 byte buffer (100 bytes total payload).
Acceptance Criteria & Validation:
* Reduces waveform payload size to 100 bytes for ultra-fast API JSON transmission.
* Validation: uv run pytest tests/waveform/test_compressor.py

`TTS-091`: JSON & Binary Waveform Metadata Payload Serializer
Module: backend/app/core/waveform/serializer.py
Dependencies: TTS-089, TTS-090
Technical Specification:
* Define WaveformPayload(points=list[float], duration_seconds=float, sample_count=int).
Acceptance Criteria & Validation:
* Validates JSON schema for client frontend rendering.
* Validation: uv run pytest tests/waveform/test_serializer.py

`TTS-092`: Waveform Extraction API Endpoint
Module: backend/app/routers/waveform.py
Dependencies: TTS-089, TTS-091
Technical Specification:
* Implement POST /api/v1/audio/waveform accepting audio file upload or S3 key and returning WaveformPayload.
Acceptance Criteria & Validation:
* Computes and returns waveform peaks in $< 10\text{ms}$.
* Validation: uv run pytest tests/routers/test_waveform_router.py

`TTS-093`: Cloudflare / Volterra Edge CDN Cache-Control Header Builder
Module: backend/app/core/cdn/headers.py
Dependencies: None
Technical Specification:
* Implement build_cdn_cache_headers(is_immutable: bool = True, max_age_days: int = 365) -> dict.
* Return Cache-Control: public, max-age=31536000, immutable, CDN-Cache-Control: max-age=31536000, Vary: Accept-Encoding.
Acceptance Criteria & Validation:
* Ensures audio assets are cached permanently at edge points-of-presence (PoPs).
* Validation: uv run pytest tests/cdn/test_headers.py

`TTS-094`: Dynamic CDN Invalidation & Purge Webhook Dispatcher
Module: backend/app/core/cdn/purge.py
Dependencies: None
Technical Specification:
* Implement purge_cdn_cached_audio(urls: list[str]) -> bool dispatching purge API calls to Cloudflare / Volterra Edge API.
Acceptance Criteria & Validation:
* Flushes outdated audio cache entries when flashcards or voice lines are re-recorded.
* Validation: uv run pytest tests/cdn/test_purge.py

`TTS-095`: Audio Asset ETag & Conditional 304 Not Modified Engine
Module: backend/app/core/cdn/etag.py
Dependencies: None
Technical Specification:
* Implement evaluate_audio_etag(request_etag: str | None, audio_sha256: str) -> bool.
* Return HTTP 304 Not Modified if client ETag matches asset hash.
Acceptance Criteria & Validation:
* Eliminates redundant audio byte transfers on repeated client requests.
* Validation: uv run pytest tests/cdn/test_etag.py

`TTS-096`: Prometheus Telemetry Metrics for Audio Pipeline
Module: backend/app/core/metrics/audio_metrics.py
Dependencies: None
Technical Specification:
* Define Prometheus metrics:
* tts_synthesis_duration_seconds (Histogram: $[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]$)
* audio_normalization_duration_seconds (Histogram)
* audio_lufs_measured (Histogram: $[-30, -25, -20, -16, -12, -8]$)
* audio_stream_active_connections (Gauge)
* audio_bytes_served_total (Counter)
Acceptance Criteria & Validation:
* Scrapes cleanly at /metrics conforming to Prometheus exposition format.
* Validation: uv run pytest tests/metrics/test_audio_metrics.py

`TTS-097`: End-to-End Latency Tracing & Span Instrumentation
Module: backend/app/core/metrics/tracing.py
Dependencies: None
Technical Specification:
* Implement OpenTelemetry tracing spans: span("text_buffering"), span("moonshot_tts_api"), span("audio_resample"), span("audio_normalize"), span("s3_upload").
Acceptance Criteria & Validation:
* Injects trace parent headers and logs discrete latency stages for every audio synthesis request.
* Validation: uv run pytest tests/metrics/test_tracing.py

`TTS-098`: Unified Audio Engine REST & WebSocket Router Aggregator
Module: backend/app/routers/audio_v1.py
Dependencies: TTS-009, TTS-028, TTS-072, TTS-073, TTS-092
Technical Specification:
* Aggregate all audio routes under /api/v1/audio (/synthesize, /stream, /waveform, /upload, /ws/live).
Acceptance Criteria & Validation:
* FastAPI application mounts router with OpenAPI docs and swagger specs.
* Validation: uv run pytest tests/routers/test_audio_v1_router.py

`TTS-099`: High-Concurrency Audio Pipeline Stress & Load Test Suite
Module: backend/app/tests/e2e/test_audio_stress.py
Dependencies: TTS-001 through TTS-098
Technical Specification:
* Implement async load test firing 100 simultaneous multi-sentence synthesis requests using asyncio.gather.
Acceptance Criteria & Validation:
* Pipeline processes all 100 requests without socket exhaustion, memory leaks, or unhandled exceptions.
* Validation: uv run pytest tests/e2e/test_audio_stress.py -v

`TTS-100`: End-to-End Golden Master Audio Pipeline Verification Suite
Module: backend/app/tests/e2e/test_audio_pipeline_e2e.py
Dependencies: TTS-001 through TTS-099
Technical Specification:
* Full-pipeline verification test:
1. Input raw unstructured CJK token stream: ["你好", "！欢迎", "来到", "曼谷。", "这是", "50", "泰铢。"]
2. Token buffer segments sentences into 2 discrete speech blocks.
3. Moonshot TTS synthesizes audio chunks.
4. Audio stream is decoded, resampled to 16kHz mono PCM, normalized to $-16.0\text{ LUFS}$, and limited to $-1.0\text{ dBTP}$.
5. Audio is encoded into Opus, uploaded to Cloudflare R2 with metadata, 100-point waveform peaks are extracted, and CDN cache headers are generated.
Acceptance Criteria & Validation:
* Entire lifecycle executes in $< 350\text{ms}$ with full integrity validation across all intermediate artifacts.
* Validation Command:
`bash
uv run pytest tests/e2e/test_audio_pipeline_e2e.py -v --durations=10
`


Autonomous Agent Execution & Verification Summary

| Sub-Track | Task Range | Focus Area | Verification Tool |
| :--- | :--- | :--- | :--- |
| Sub-Track A | TTS-001 – TTS-015 | Moonshot TTS Client, Circuit Breaker & Retries | uv run pytest tests/tts/ |
| Sub-Track B | TTS-016 – TTS-030 | Token Buffering & CJK/Thai Segmentation | uv run pytest tests/text/ |
| Sub-Track C | TTS-031 – TTS-045 | PyAV Decoding, 16kHz Resampling & Splicing | uv run pytest tests/audio/ |
| Sub-Track D | TTS-046 – TTS-060 | EBU R128 -16 LUFS Normalization & Limiter | uv run pytest tests/audio/ |
| Sub-Track E | TTS-061 – TTS-075 | Opus/AAC Encoding & WebSocket Streaming | uv run pytest tests/codecs/ |
| Sub-Track F | TTS-076 – TTS-088 | S3/R2 Multipart Uploads & Presigned URLs | uv run pytest tests/storage/ |
| Sub-Track G | TTS-089 – TTS-100 | Waveforms, CDN Headers, Metrics & E2E Tests | uv run pytest tests/e2e/ |
Track 5 of 10
Track 5: Speech-to-Text (STT), Pronunciation Assessment & Pitch/Tone Analysis
Track 5: Speech-to-Text (STT), Pronunciation Assessment & Pitch/Tone Analysis
Complete Engineering Specification & 100 Granular Micro-Tasks


System Architecture & Pipeline Overview

                      [ Client Web Audio Stream (WebM / PCM16) ]                                           │                                  (WebSocket / TCP)                                           ▼                 ┌──────────────────────────────────────────────────┐                 │ STT-001 – STT-020: Audio Ingestion & VAD Layer   │                 │ • Polyphase 16kHz Resampling & LUFS Normalizer   │                 │ • Silero VAD v5 (512-sample stateful chunks)     │                 │ • Boundary Detection & Jitter Buffer Smoothing   │                 └─────────────────────────┬────────────────────────┘                                           │ (Voiced Audio Frames)                                           ▼          ┌────────────────────────────────┴────────────────────────────────┐          ▼                                                                 ▼ ┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────┐ │ STT-021 – STT-040: Faster-Whisper Engine│   │ STT-061 – STT-080: Yin F0 & Tone Engine │ │ • CTranslate2 INT8/FP16 Inference       │   │ • Difference Function d_t(tau)          │ │ • Asian Forced Tokens (zh, ja, th, vi)  │   │ • Cumulative Mean Normalized Diff       │ │ • Cross-Attention Word Timestamps       │   │ • Parabolic Sub-sample Peak Pitch (Hz)  │ │ • Hallucination & Repetition Filters    │   │ • Mandarin/Thai/Viet/JP Tone Classifiers│ └────────────────────┬────────────────────┘   └────────────────────┬────────────────────┘                      │ (Transcribed Text + Timestamps)             │ (Extracted Pitch Trajectories)                      ▼                                             ▼ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │ STT-041 – STT-060: Multilingual Grapheme-to-Phoneme (G2P) & Phonetic Extraction       │ │ • Mandarin: pypinyin + Initial/Final/Tone Decomposition (1-5)                         │ │ • Japanese: MeCab/Cutlet Tokenization + pykakasi Kanji-to-Kana + Mora IPA             │ │ • Thai: Trie Syllable Segmentation + Consonant Class Tone Rules + RTGS/Paiboon        │ │ • Vietnamese: Compound Nuclei & Diacritic Decomposition (6 Tones: Ngang, Huyền, etc.) │ │ • Korean: Hangul Jamo Decomposition + Phonological Assimilation (Nasal/Tensification) │ └───────────────────────────────────────────┬───────────────────────────────────────────┘                                             │ (Reference vs. Spoken Phonemes & Pitch)                                             ▼ ┌───────────────────────────────────────────────────────────────────────────────────────┐ │ STT-081 – STT-100: DTW, Levenshtein Alignment & Composite Pronunciation Scoring       │ │ • Weighted Levenshtein Articulatory Distance Matrix                                   │ │ • FastDTW Acoustic & Pitch Contour Alignment                                          │ │ • Accuracy ($S_{acc}$), Tone ($S_{tone}$), Fluency ($S_{flu}$), Completeness ($S_{comp}$)   │ │ • Unified Weighted Score: $S_{overall} = w_1 S_{acc} + w_2 S_{tone} + w_3 S_{flu} + w_4 S_{comp}$│ │ • Low-Latency WebSocket Event Streaming (<300ms Roundtrip)                            │ └───────────────────────────────────────────────────────────────────────────────────────┘


Core Mathematical Formulations & Scoring Rules

1. Yin Fundamental Frequency ($F_0$) Extraction:
* *Difference Function*: $d_t(\tau) = \sum_{j=1}^{W} (x_j - x_{j+\tau})^2$
* *Cumulative Mean Normalized Difference (CMNDF)*:
$$d'_t(\tau) = \begin{cases} 1 & \text{if } \tau = 0 \\ \frac{d_t(\tau)}{\frac{1}{\tau} \sum_{j=1}^{\tau} d_t(j)} & \text{otherwise} \end{cases}$$
* *Parabolic Peak Interpolation*: $\tau^* = \tau + \frac{d'(\tau-1) - d'(\tau+1)}{2(d'(\tau-1) - 2d'(\tau) + d'(\tau+1))}, \quad F_0 = \frac{f_s}{\tau^*}$

2. Weighted Levenshtein Phonetic Distance:
$$D(i, j) = \min \begin{cases} D(i-1, j) + \text{cost}_{del}(u_i) \\ D(i, j-1) + \text{cost}_{ins}(r_j) \\ D(i-1, j-1) + \text{cost}_{sub}(u_i, r_j) \end{cases}$$
*where $\text{cost}_{sub}(u_i, r_j)$ is proportional to the articulatory distance (manner, place, voicing) between candidate phoneme $u_i$ and reference phoneme $r_j$.*

3. Composite Pronunciation Scoring Engine:
* Phoneme Accuracy ($S_{acc}$): $S_{acc} = 100 \times \max\left(0, 1 - \frac{\sum w_i d(u_i, r_i)}{\sum w_i}\right)$
* Tone Accuracy ($S_{tone}$): $S_{tone} = 100 \times \left(\alpha \cdot \mathbb{I}(\hat{T} = T^*) + (1-\alpha) \cdot \rho(\vec{F}_{0, user}, \vec{F}_{0, ref})\right)$
* Fluency ($S_{flu}$): $S_{flu} = 100 \times \left(1 - \frac{\text{PauseDuration}}{\text{TotalDuration}}\right) \times \min\left(1.0, \frac{\text{SpeechRate}}{\text{TargetRate}}\right)$
* Completeness ($S_{comp}$): $S_{comp} = 100 \times \frac{N_{\text{matched\_syllables}}}{N_{\text{reference\_syllables}}}$
* Aggregate Score:
$$S_{overall} = w_{acc} S_{acc} + w_{tone} S_{tone} + w_{flu} S_{flu} + w_{comp} S_{comp}$$
*(For Mandarin/Thai/Vietnamese: $w_{acc}=0.35, w_{tone}=0.35, w_{flu}=0.15, w_{comp}=0.15$; For Japanese/Korean: $w_{acc}=0.50, w_{tone}=0.20, w_{flu}=0.15, w_{comp}=0.15$)*.


Sub-Domain 1: Audio Ingestion, Preprocessing, Normalization & Silero VAD (STT-001 – STT-020)


STT-001: Container Demuxing & Decoding Pipeline
Domain / Module: Audio Ingestion
Dependencies: None
Technical Specification: Create backend/app/audio/demuxer.py utilizing av (PyAV) bindings to parse multi-format input audio streams (WebM Opus, OGG, WAV, MP3, AAC, FLAC) from raw binary payloads into continuous floating-point audio frames. Implement AudioDemuxer.decode_bytes(payload: bytes, format_hint: str = None) -> np.ndarray.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_demuxer.py -v verifies float32 conversion across 6 standard audio containers.


STT-002: Polyphase Resampling & Channel Downmixing
Domain / Module: Audio Ingestion
Dependencies: STT-001
Technical Specification: Create backend/app/audio/resampler.py implementing AudioResampler.to_mono_16k(audio: np.ndarray, orig_sr: int) -> np.ndarray. Use scipy.signal.resample_poly with up/down integer factors for polyphase decimation/interpolation to 16,000 Hz mono without aliasing artifacts.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_resampler.py -v validates $\text{SNR} > 60\text{ dB}$ and 0Hz–8kHz frequency passband preservation.


STT-003: EBU R128 Loudness Normalization Engine
Domain / Module: Audio Preprocessing
Dependencies: STT-002
Technical Specification: Create backend/app/audio/normalizer.py implementing EBU R128 integrated loudness measurement and normalization. Target integrated loudness $L_{target} = -16.0\text{ LUFS}$. Calculate gating thresholds, momentary loudness, and apply gain adjustment $\Delta G = L_{target} - L_{measured}$ in float32 space.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_normalizer.py -v validates normalized output meets $-16\text{ LUFS} \pm 0.5\text{ LUFS}$ across variable input gains.


STT-004: Soft-Knee Peak Limiter & Dynamic Range Compressor
Domain / Module: Audio Preprocessing
Dependencies: STT-003
Technical Specification: Create backend/app/audio/limiter.py implementing SoftKneeLimiter.process(audio: np.ndarray, threshold_db: float = -1.0, knee_width_db: float = 3.0, attack_ms: float = 5.0, release_ms: float = 50.0) -> np.ndarray to prevent digital clipping after normalization.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_limiter.py -v verifies max peak does not exceed $-1.0\text{ dBFS}$ with 0 distortion harmonics.


STT-005: Low-Pass & High-Pass Pre-Emphasis Filtering
Domain / Module: Audio Preprocessing
Dependencies: STT-002
Technical Specification: Create backend/app/audio/filters.py with Butterworth high-pass filter ($f_c = 70\text{ Hz}$, 4th order) to eliminate DC offset / mic rumble and pre-emphasis filter $y[n] = x[n] - \alpha x[n-1]$ ($\alpha = 0.97$) to enhance high-frequency fricatives for Asian tone analysis.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_filters.py -v verifies frequency roll-off below 70Hz and $+6\text{ dB/octave}$ HF boost.


STT-006: Ring Buffer & Audio Frame Chunking Engine
Domain / Module: Audio Ingestion
Dependencies: STT-002
Technical Specification: Create backend/app/audio/buffer.py implementing AudioRingBuffer with configurable capacity (default 30s at 16kHz). Support thread-safe push/pop of 512-sample (32ms) and 1024-sample (64ms) frames with zero-copy numpy views.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_buffer.py -v verifies zero frame loss and thread-safe concurrent read/write.


STT-007: Jitter Buffer & Packet Loss Concealment for WebSockets
Domain / Module: Audio Streaming
Dependencies: STT-006
Technical Specification: Create backend/app/audio/jitter.py implementing AdaptiveJitterBuffer with sequence number tracking, dynamic buffer delay adjustment (20ms–100ms based on packet inter-arrival time), and waveform repetition packet loss concealment (PLC).
Acceptance Criteria & Validation: uv run pytest tests/audio/test_jitter.py -v verifies reordering of out-of-order frames and synthetic concealment on dropped packets.


STT-008: Silero VAD ONNX Runtime Model Loader
Domain / Module: Voice Activity Detection
Dependencies: None
Technical Specification: Create backend/app/vad/silero_loader.py implementing SileroVADLoader wrapping silero_vad.onnx (v5) via ONNX Runtime CPU/CUDA sessions. Manage recurrent state tensors $h \in \mathbb{R}^{2 \times 1 \times 64}$ and $c \in \mathbb{R}^{2 \times 1 \times 64}$.
Acceptance Criteria & Validation: uv run pytest tests/vad/test_silero_loader.py -v verifies ONNX session initialization and tensor shapes.


STT-009: Silero VAD Streaming State Machine (512-Sample Windows)
Domain / Module: Voice Activity Detection
Dependencies: STT-008
Technical Specification: Create backend/app/vad/streaming.py implementing StreamingVAD.process_chunk(chunk_512: np.ndarray) -> float returning raw speech probability $P(\text{speech}) \in [0.0, 1.0]$ in $< 1.5\text{ ms}$ per chunk.
Acceptance Criteria & Validation: uv run pytest tests/vad/test_streaming_vad.py -v validates streaming speech probability sequence on test voice files.


STT-010: Adaptive Noise Floor Estimation & SNR Calculator
Domain / Module: Voice Activity Detection
Dependencies: STT-009
Technical Specification: Create backend/app/vad/noise.py calculating dynamic spectral noise floor using minimum statistics tracking over 1.5s sliding windows. Calculate Signal-to-Noise Ratio (SNR) in dB and adjust VAD probability thresholds dynamically.
Acceptance Criteria & Validation: uv run pytest tests/vad/test_noise.py -v verifies accurate SNR calculation across 0dB, 10dB, and 20dB noise conditions.


STT-011: Speech Segment Boundary Detector (Start-of-Speech / Hangover)
Domain / Module: Voice Activity Detection
Dependencies: STT-009, STT-010
Technical Specification: Create backend/app/vad/boundaries.py implementing SpeechBoundaryDetector with threshold_speech = 0.5, min_speech_duration_ms = 250, and speech_hangover_ms = 400 (extended to 600ms for tonal Asian language final particles like Thai *khrap/kha*).
Acceptance Criteria & Validation: uv run pytest tests/vad/test_boundaries.py -v verifies correct emission of SPEECH_START and SPEECH_END timestamps.


STT-012: Minimum Speech Duration & False Trigger Gating
Domain / Module: Voice Activity Detection
Dependencies: STT-011
Technical Specification: Create backend/app/vad/gating.py implementing false trigger rejection (filtering out mic pops, coughs, clicks $< 120\text{ ms}$ duration) and energy variance thresholding.
Acceptance Criteria & Validation: uv run pytest tests/vad/test_gating.py -v verifies rejection of impulsive non-speech audio events.


STT-013: Zero-Copy Audio Slicing & Shared Memory Allocation
Domain / Module: Audio Ingestion
Dependencies: STT-006
Technical Specification: Create backend/app/audio/memory.py utilizing Python multiprocessing.shared_memory or numpy memory maps for IPC between audio ingestion workers and STT/pitch inference workers.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_memory.py -v verifies zero-copy slicing throughput $> 1\text{ GB/s}$.


STT-014: WAV / Opus / PCM16 Header & Payload Serializers
Domain / Module: Audio Codecs
Dependencies: STT-002
Technical Specification: Create backend/app/audio/codec.py implementing serialization/deserialization between raw PCM16 buffers, RIFF WAV headers, and Opus frames.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_codec.py -v verifies bit-level header fidelity and Opus encoding roundtrip.


STT-015: Audio Preprocessing Benchmark & Latency Profiler
Domain / Module: Performance & Benchmarks
Dependencies: STT-001 to STT-014
Technical Specification: Create backend/app/audio/benchmarks.py measuring end-to-end audio ingestion latency from WebSocket packet receive to normalized 16kHz VAD-gated tensor.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_benchmarks.py -v verifies p99 preprocessing latency is under $5.0\text{ ms}$.


STT-016: VAD Confidence Heatmap & Telemetry Exporter
Domain / Module: Observability
Dependencies: STT-011
Technical Specification: Create backend/app/vad/telemetry.py generating JSON timeline of speech confidence probabilities, energy curves, and boundary markers for UI debugging.
Acceptance Criteria & Validation: uv run pytest tests/vad/test_telemetry.py -v validates JSON timeline schema output.


STT-017: Multi-Threaded Audio Ingestion Worker Pool
Domain / Module: Concurrency
Dependencies: STT-006, STT-009
Technical Specification: Create backend/app/audio/worker.py implementing AudioWorkerPool managing worker threads for concurrent WebSocket client streams.
Acceptance Criteria & Validation: uv run pytest tests/audio/test_worker.py -v verifies 100 concurrent simulated client streams without CPU starvation.


STT-018: Audio Pipeline Configuration & Pydantic Validation Models
Domain / Module: Configuration
Dependencies: None
Technical Specification: Create backend/app/schemas/audio_pipeline.py with AudioPipelineConfig, VADSettings, LimiterConfig, and ResamplingParams.
Acceptance Criteria & Validation: uv run pytest tests/schemas/test_audio_pipeline_schema.py -v validates config validation and default fallbacks.


STT-019: Unit Test Suite for Audio Demuxing, Resampling & Filtering
Domain / Module: QA & Testing
Dependencies: STT-001 to STT-005
Technical Specification: Create backend/tests/audio/test_preprocessing.py executing end-to-end signal processing validation suite.
Acceptance Criteria & Validation: uv run pytest backend/tests/audio/test_preprocessing.py passes with 100% test coverage.


STT-020: Integration Test Suite for Silero VAD Streaming & Segment Gating
Domain / Module: QA & Testing
Dependencies: STT-008 to STT-012
Technical Specification: Create backend/tests/vad/test_silero_vad.py testing streaming speech segmentation across multilingual sample datasets.
Acceptance Criteria & Validation: uv run pytest backend/tests/vad/test_silero_vad.py passes with zero frame boundary drift.


Sub-Domain 2: Faster-Whisper Inference Engine & Edge STT Alignment (STT-021 – STT-040)


STT-021: Faster-Whisper / CTranslate2 Engine Loader & Quantization Config
Domain / Module: STT Inference
Dependencies: None
Technical Specification: Create backend/app/stt/whisper_engine.py wrapping faster_whisper.WhisperModel with dynamic quantization (int8_float16, int8, float16) and compute device selection (cuda, cpu).
Acceptance Criteria & Validation: uv run pytest tests/stt/test_whisper_engine.py -v verifies model loading and VRAM/RAM footprint.


STT-022: Multi-Language Forced Token Injection (zh, ja, th, vi, ko)
Domain / Module: STT Inference
Dependencies: STT-021
Technical Specification: Create backend/app/stt/token_forcing.py implementing LanguageTokenForcer constructing decoder prompt tokens (<|zh|>, <|ja|>, <|th|>, <|vi|>, <|ko|>) and <|transcribe|> / <|notimestamps|> suppression.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_token_forcing.py -v verifies decoder forced token IDs for all 5 target languages.


STT-023: Cross-Attention Word-Level Timestamp Extractor
Domain / Module: STT Alignment
Dependencies: STT-021
Technical Specification: Create backend/app/stt/timestamps.py extracting word and token start/end timestamps via cross-attention matrix alignment (word_timestamps=True).
Acceptance Criteria & Validation: uv run pytest tests/stt/test_timestamps.py -v verifies monotonic timestamps and character boundary accuracy.


STT-024: Whisper Hallucination & Repetition Suppression Filter
Domain / Module: STT Processing
Dependencies: STT-021
Technical Specification: Create backend/app/stt/hallucination_filter.py detecting repetitive n-gram loops, silent audio hallucinations (e.g., 'Thank you for watching'), and compression ratio threshold filtering ($\text{CR} > 2.4$).
Acceptance Criteria & Validation: uv run pytest tests/stt/test_hallucination_filter.py -v verifies filtering of known hallucination patterns.


STT-025: Prompt Engineering & Custom Context Bias Dictionary
Domain / Module: STT Optimization
Dependencies: STT-021
Technical Specification: Create backend/app/stt/context_bias.py building situational initial_prompt prefixes containing domain travel vocabulary (e.g., Thai currency *Baht*, Japanese *Izakaya*, Vietnamese *Bánh mì*).
Acceptance Criteria & Validation: uv run pytest tests/stt/test_context_bias.py -v verifies recognition accuracy improvement on specialized travel terms.


STT-026: VAD-Guided Segment Chunking & Parallel STT Worker Dispatch
Domain / Module: STT Architecture
Dependencies: STT-011, STT-021
Technical Specification: Create backend/app/stt/segment_dispatcher.py segmenting speech streams into discrete utterance chunks based on VAD boundaries and dispatching to worker queues.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_segment_dispatcher.py -v verifies dispatch without dropping speech buffers.


STT-027: Streaming Interim Partial Transcription Generator
Domain / Module: STT Streaming
Dependencies: STT-021, STT-026
Technical Specification: Create backend/app/stt/streaming_stt.py implementing low-latency sliding window decoding for interim feedback ($< 250\text{ ms}$ latency) alongside final high-accuracy beam-search decoding.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_streaming_stt.py -v verifies interim token emission rate.


STT-028: Confidence Score Calibration & OOV Detection
Domain / Module: STT Metrics
Dependencies: STT-021
Technical Specification: Create backend/app/stt/confidence.py converting log-probability tokens to calibrated confidence scores $C \in [0, 100]$ and flagging Out-Of-Vocabulary (OOV) phonetic segments.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_confidence.py -v verifies calibrated probabilities against ground-truth audio.


STT-029: Whisper Model Warmup & Memory Pool Pre-Allocation
Domain / Module: STT Optimization
Dependencies: STT-021
Technical Specification: Create backend/app/stt/warmup.py executing synthetic zero-padded audio inferences during container startup to pre-warm CUDA kernels and CTranslate2 buffers.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_warmup.py -v verifies zero cold-start latency penalty on first user request.


STT-030: Fallback Edge STT API Client with Circuit Breaking
Domain / Module: Resilience & Fallback
Dependencies: None
Technical Specification: Create backend/app/stt/fallback_client.py with tenacity retry and circuit breaking to fallback to external edge STT API endpoints if local GPU/CPU load exceeds 95%.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_fallback_client.py -v verifies circuit breaker trip and recovery.


STT-031: Asian Script Normalization & Punctuation Stripper
Domain / Module: Text Processing
Dependencies: STT-021
Technical Specification: Create backend/app/stt/text_normalizer.py normalizing full-width/half-width characters (NFKC), stripping decorative Asian punctuation (。、？！〜), and preserving tone markers.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_text_normalizer.py -v verifies clean text normalization across CJK and Thai.


STT-032: Segment Merger & Sentence Boundary Reconstructor
Domain / Module: STT Processing
Dependencies: STT-026, STT-031
Technical Specification: Create backend/app/stt/merger.py merging multi-chunk transcription segments into complete sentence trees with unified timestamp offsets.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_merger.py -v verifies chronological timestamp continuity across chunk boundaries.


STT-033: Sub-Word Token to Character Alignment Map
Domain / Module: STT Alignment
Dependencies: STT-023
Technical Specification: Create backend/app/stt/alignment.py mapping BPE sub-word tokens to discrete Asian characters and syllables (Hanzi, Kanji, Kana, Hangul, Thai clusters).
Acceptance Criteria & Validation: uv run pytest tests/stt/test_alignment.py -v verifies exact 1-to-1 character timestamp mapping.


STT-034: Multilingual Language Identification (LID) Gate
Domain / Module: STT Intelligence
Dependencies: STT-021
Technical Specification: Create backend/app/stt/lid_gate.py verifying spoken language matches expected target language, calculating language posterior probability $P(\text{lang} \mid \text{audio})$.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_lid_gate.py -v verifies language detection and mismatch flagging.


STT-035: STT Inference Cache with LRU & Audio Fingerprint Matching
Domain / Module: STT Caching
Dependencies: STT-021
Technical Specification: Create backend/app/stt/cache.py calculating acoustic perceptual hash (AcoustID/chroma fingerprint) of short repetitive flashcard utterances to serve cached transcripts instantly.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_cache.py -v verifies cache hit latency $< 2\text{ ms}$.


STT-036: Prometheus Metrics for STT Latency, RTF & Token TPS
Domain / Module: Observability
Dependencies: STT-021
Technical Specification: Create backend/app/stt/metrics.py exporting Prometheus gauges and histograms for Real-Time Factor ($\text{RTF} = \text{duration}_{proc} / \text{duration}_{audio}$), token throughput, and WER.
Acceptance Criteria & Validation: uv run pytest tests/stt/test_metrics.py -v validates Prometheus metrics format.


STT-037: FastAPI STT REST Endpoints
Domain / Module: API Routing
Dependencies: STT-021 to STT-036
Technical Specification: Create backend/app/routers/stt.py exposing POST /api/v1/stt/transcribe and POST /api/v1/stt/detect-language.
Acceptance Criteria & Validation: uv run pytest tests/routers/test_stt_router.py -v validates endpoint responses and error codes.


STT-038: STT Request / Response Pydantic v2 DTO Schemas
Domain / Module: Schemas
Dependencies: None
Technical Specification: Create backend/app/schemas/stt_dto.py defining TranscriptionRequest, WordTimestampDTO, TranscriptionResponse, and LIDResponse.
Acceptance Criteria & Validation: uv run pytest tests/schemas/test_stt_dto.py -v validates schema validation.


STT-039: Unit Test Suite for Faster-Whisper Model Loader & Token Forcing
Domain / Module: QA & Testing
Dependencies: STT-021, STT-022
Technical Specification: Create backend/tests/stt/test_whisper_engine.py testing model loading and token forcing.
Acceptance Criteria & Validation: uv run pytest backend/tests/stt/test_whisper_engine.py passes with 100% assertions.


STT-040: Integration Test Suite for End-to-End Transcription & Timestamp Alignment
Domain / Module: QA & Testing
Dependencies: STT-021 to STT-038
Technical Specification: Create backend/tests/stt/test_stt_pipeline.py running end-to-end transcription validation against Japanese, Mandarin, Thai, Vietnamese, and Korean audio samples.
Acceptance Criteria & Validation: uv run pytest backend/tests/stt/test_stt_pipeline.py passes with character error rate $< 5\%$.


Sub-Domain 3: Phoneme Extraction & Grapheme-to-Phoneme (G2P) Engine (STT-041 – STT-060)


STT-041: Multilingual Phonetic Symbol Definition & Canonical IPA Set
Domain / Module: Phonetics Architecture
Dependencies: None
Technical Specification: Create backend/app/phonetics/ipa_symbols.py defining canonical IPA symbols, articulatory feature vectors (place, manner, voicing, vowel height, backness, roundness), and distance metrics.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_ipa_symbols.py -v verifies phonetic feature matrix completeness.


STT-042: Mandarin G2P: Character-to-Pinyin Conversion with Tone Marks
Domain / Module: Mandarin Phonetics
Dependencies: None
Technical Specification: Create backend/app/phonetics/mandarin/pinyin_g2p.py using pypinyin to convert Simplified/Traditional Chinese text into syllable lists with tone numbers (1–5) and numerical tone markers.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_pinyin_g2p.py -v verifies Pinyin output across 1,000 common Mandarin travel phrases.


STT-043: Mandarin Polyphone Disambiguation & Erhua (儿化) Engine
Domain / Module: Mandarin Phonetics
Dependencies: STT-042
Technical Specification: Create backend/app/phonetics/mandarin/polyphone.py implementing context-aware polyphone resolution (e.g., 地 de/di, 行 xing/hang) and Erhua rhotacization phonetic mapping.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_polyphone.py -v verifies pronunciation disambiguation in context.


STT-044: Mandarin Pinyin-to-IPA & Initial/Final/Tone Decomposition
Domain / Module: Mandarin Phonetics
Dependencies: STT-042, STT-043
Technical Specification: Create backend/app/phonetics/mandarin/ipa_converter.py decomposing Pinyin syllables into initials (*shengmu*), finals (*yunmu*), and tone pitch contours mapped to International Phonetic Alphabet (IPA).
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_mandarin_ipa.py -v verifies IPA string generation across all 412 Mandarin syllables.


STT-045: Japanese G2P: Morphological Tokenization via Cutlet / MeCab
Domain / Module: Japanese Phonetics
Dependencies: None
Technical Specification: Create backend/app/phonetics/japanese/tokenizer.py implementing Japanese morphological analysis and Part-of-Speech tagging to identify word and particle boundaries.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_japanese_tokenizer.py -v verifies correct tokenization of polite vs casual utterances.


STT-046: Japanese Kanji-to-Kana & Furigana Extraction Engine
Domain / Module: Japanese Phonetics
Dependencies: STT-045
Technical Specification: Create backend/app/phonetics/japanese/kana_extractor.py using pykakasi to convert Kanji into Hiragana/Katakana phonetic readings with boundary markers.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_kana_extractor.py -v verifies Furigana extraction for travel vocabulary.


STT-047: Japanese Kana-to-Romaji & Mora Syllable Segmenter
Domain / Module: Japanese Phonetics
Dependencies: STT-046
Technical Specification: Create backend/app/phonetics/japanese/romaji_converter.py segmenting Japanese text into discrete Mora units (including small tsu っ gemination, chōonpu ー long vowels, and hatsuon ん).
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_romaji_converter.py -v verifies mora count calculation.


STT-048: Japanese Mora-to-IPA Mapping with Devoiced Vowels
Domain / Module: Japanese Phonetics
Dependencies: STT-047
Technical Specification: Create backend/app/phonetics/japanese/ipa_converter.py mapping Mora sequences to IPA, including high-vowel devoicing rules for [i̥] and [ɯ̥] in *desu* / *masu*.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_japanese_ipa.py -v verifies IPA transcriptions including devoicing.


STT-049: Thai G2P: Syllable Boundary Segmentation & Tone Class Rules
Domain / Module: Thai Phonetics
Dependencies: None
Technical Specification: Create backend/app/phonetics/thai/syllable_segmenter.py segmenting unspaced Thai script into discrete syllables utilizing dictionary trie and maximal matching heuristics.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_thai_segmenter.py -v verifies syllable boundary segmentation on Thai travel sentences.


STT-050: Thai Consonant Class & Vowel Length Acoustic Classifier
Domain / Module: Thai Phonetics
Dependencies: STT-049
Technical Specification: Create backend/app/phonetics/thai/consonant_classifier.py classifying Thai consonants into Low/Mid/High classes and detecting Short/Long vowel durations and Live/Dead syllable endings.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_thai_consonant_classifier.py -v verifies tone rule determination logic.


STT-051: Thai Royal General (RTGS) & Paiboon Converter
Domain / Module: Thai Phonetics
Dependencies: STT-050
Technical Specification: Create backend/app/phonetics/thai/rtgs_converter.py converting Thai syllables into Royal Thai General System (RTGS) and Paiboon phonetic romanization with tone marks.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_thai_rtgs.py -v verifies dual romanization accuracy.


STT-052: Thai Syllable-to-IPA & Tone Marker Mapper
Domain / Module: Thai Phonetics
Dependencies: STT-051
Technical Specification: Create backend/app/phonetics/thai/ipa_converter.py converting Thai syllables to IPA phonetic representations with tone numbers (mid: 33, low: 21, falling: 51, high: 45, rising: 14).
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_thai_ipa.py -v verifies IPA generation.


STT-053: Vietnamese G2P: Compound Vowel & Diacritic Decomposition
Domain / Module: Vietnamese Phonetics
Dependencies: None
Technical Specification: Create backend/app/phonetics/vietnamese/diacritics.py parsing Vietnamese orthography into base consonants, complex vowel nuclei (e.g., *ươ, iê, uô*), final consonants, and 6 tone diacritics.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_vietnamese_diacritics.py -v verifies 100% parsing of Vietnamese orthographic compounds.


STT-054: Vietnamese Northern vs. Southern Dialect Variator
Domain / Module: Vietnamese Phonetics
Dependencies: STT-053
Technical Specification: Create backend/app/phonetics/vietnamese/dialects.py implementing dialect-specific phonetic transformations (e.g., initial *d/gi* as [z] in Hanoi vs [j] in Saigon).
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_vietnamese_dialects.py -v verifies dialect pronunciation mapping.


STT-055: Vietnamese Grapheme-to-IPA & Tone Code Generator
Domain / Module: Vietnamese Phonetics
Dependencies: STT-054
Technical Specification: Create backend/app/phonetics/vietnamese/ipa_converter.py generating standard IPA transcripts with 6 tone markers (ngang: 33, huyền: 21, sắc: 35, hỏi: 313, ngã: 35ˀ, nặng: 21ˀ).
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_vietnamese_ipa.py -v verifies IPA outputs.


STT-056: Korean G2P: Hangul Syllable Block Jamo Decomposition
Domain / Module: Korean Phonetics
Dependencies: None
Technical Specification: Create backend/app/phonetics/korean/jamo.py decomposing Unicode Hangul syllables into initial (Choseong), medial (Jungseong), and final (Jongseong/Batchim) Jamo codepoints.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_korean_jamo.py -v verifies mathematical decomposition across 11,172 Hangul blocks.


STT-057: Korean Phonological Assimilation Rules
Domain / Module: Korean Phonetics
Dependencies: STT-056
Technical Specification: Create backend/app/phonetics/korean/assimilation.py implementing Korean phonetic assimilation rules: nasalization, liquidization, tensification, and palatalization across syllable boundaries.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_korean_assimilation.py -v verifies phonetic sound changes (e.g., 국물 $\rightarrow$ 궁물).


STT-058: Korean Revised Romanization (RR) & IPA Transcriber
Domain / Module: Korean Phonetics
Dependencies: STT-057
Technical Specification: Create backend/app/phonetics/korean/ipa_converter.py generating standard Revised Romanization and IPA representations reflecting assimilated pronunciations.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_korean_ipa.py -v verifies RR and IPA outputs.


STT-059: Unified G2P Facade & Multi-Script Phonetic Tokenizer
Domain / Module: Phonetics Architecture
Dependencies: STT-041 to STT-058
Technical Specification: Create backend/app/phonetics/g2p_facade.py implementing G2PFacade.transcribe(text: str, language: str) -> PhoneticUtterance exposing unified API for all 5 languages.
Acceptance Criteria & Validation: uv run pytest tests/phonetics/test_g2p_facade.py -v verifies unified schema across all languages.


STT-060: Unit & Property-Based Test Suite for Multilingual G2P Engines
Domain / Module: QA & Testing
Dependencies: STT-041 to STT-059
Technical Specification: Create backend/tests/phonetics/test_g2p_all.py executing property-based tests (using hypothesis) verifying stability on arbitrary unicode inputs.
Acceptance Criteria & Validation: uv run pytest backend/tests/phonetics/test_g2p_all.py passes with 0 exceptions.


Sub-Domain 4: Fundamental Frequency ($F_0$) Extraction & Tone Classification (STT-061 – STT-080)


STT-061: Yin Algorithm Step 1: Squared Difference Function $d_t(\tau)$
Domain / Module: Pitch Extraction
Dependencies: STT-002
Technical Specification: Create backend/app/pitch/yin_difference.py implementing $d_t(\tau) = \sum_{j=1}^{W} (x_j - x_{j+\tau})^2$ for lag $\tau \in [\tau_{min}, \tau_{max}]$ using FFT cross-correlation acceleration.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_yin_difference.py -v verifies mathematical equivalence to direct time-domain difference.


STT-062: Yin Algorithm Step 2: Cumulative Mean Normalized Difference $d'_t(\tau)$
Domain / Module: Pitch Extraction
Dependencies: STT-061
Technical Specification: Create backend/app/pitch/yin_cmndf.py implementing $d'_t(\tau) = 1$ if $\tau=0$, else $d_t(\tau) / [\frac{1}{\tau} \sum_{j=1}^{\tau} d_t(j)]$ to avoid zero-lag trivial dips.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_yin_cmndf.py -v verifies CMNDF normalization properties.


STT-063: Yin Algorithm Step 3: Absolute Thresholding & Dip Search
Domain / Module: Pitch Extraction
Dependencies: STT-062
Technical Specification: Create backend/app/pitch/yin_threshold.py selecting the first dip in $d'_t(\tau)$ below threshold $\delta = 0.10$ to prevent octave errors.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_yin_threshold.py -v verifies dip selection on synthetic harmonic signals.


STT-064: Yin Algorithm Step 4: Parabolic Sub-Sample Interpolation
Domain / Module: Pitch Extraction
Dependencies: STT-063
Technical Specification: Create backend/app/pitch/yin_interpolation.py fitting parabola through $(\tau-1, \tau, \tau+1)$ to extract sub-sample period $\tau^*$ with precision $< 0.01$ samples.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_yin_interpolation.py -v verifies pitch estimation error $< 0.1\text{ Hz}$.


STT-065: Yin Algorithm Step 5: Global Best Local Estimate & Voicing Gating
Domain / Module: Pitch Extraction
Dependencies: STT-064
Technical Specification: Create backend/app/pitch/yin_voicing.py gating unvoiced frames when minimum dip value exceeds $0.20$ and returning pitch frequency $F_0 = f_s / \tau^*$.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_yin_voicing.py -v verifies voiced/unvoiced classification.


STT-066: PyIN Probabilistic Viterbi HMM Pitch Tracking
Domain / Module: Pitch Extraction
Dependencies: STT-065
Technical Specification: Create backend/app/pitch/pyin_hmm.py implementing Viterbi decoding across multiple candidate pitch dips to enforce temporal pitch trajectory smoothness.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_pyin_hmm.py -v verifies smooth pitch contour through noisy audio segments.


STT-067: Pitch Contour Smoothing via Median & Savitzky-Golay Filtering
Domain / Module: Pitch Postprocessing
Dependencies: STT-065
Technical Specification: Create backend/app/pitch/smoothing.py applying 5-frame median filter and 3rd order Savitzky-Golay polynomial smoothing to remove octave jumps and jitter.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_smoothing.py -v verifies removal of isolated single-frame pitch outliers.


STT-068: Speaker Pitch Normalization (Semitone & Z-Score Transform)
Domain / Module: Pitch Normalization
Dependencies: STT-067
Technical Specification: Create backend/app/pitch/normalization.py converting raw Hertz $F_0$ to logarithmic semitones relative to speaker base pitch $\text{ST} = 12 \log_2(F_0 / F_{base})$ and computing Z-scores.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_normalization.py -v verifies invariant pitch contours across male and female speaker ranges.


STT-069: Syllable-Level Pitch Contour Segmentation & Windowing
Domain / Module: Pitch Alignment
Dependencies: STT-033, STT-068
Technical Specification: Create backend/app/pitch/syllable_windowing.py slicing continuous pitch tracks into normalized 100-point time-interpolated contours per syllable based on character timestamps.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_syllable_windowing.py -v verifies fixed-dimension 100-point vector generation.


STT-070: Mandarin 5-Tone Acoustic Feature Vector Extractor
Domain / Module: Mandarin Tones
Dependencies: STT-069
Technical Specification: Create backend/app/pitch/mandarin/features.py computing slope, mean pitch, curvature (2nd derivative), and onset-to-offset delta for Mandarin syllables.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_mandarin_features.py -v validates feature vector extraction.


STT-071: Mandarin 5-Tone Classifier Engine
Domain / Module: Mandarin Tones
Dependencies: STT-070
Technical Specification: Create backend/app/pitch/mandarin/classifier.py classifying normalized vectors into Tone 1 (High Level), Tone 2 (Rising), Tone 3 (Dipping), Tone 4 (Falling), and Tone 5 (Neutral).
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_mandarin_classifier.py -v verifies classification accuracy $> 95\%$ on benchmark datasets.


STT-072: Thai 5-Tone Feature Extractor & Slope Analyzer
Domain / Module: Thai Tones
Dependencies: STT-069
Technical Specification: Create backend/app/pitch/thai/features.py extracting pitch contours for Central Thai syllables with initial consonant duration weighting.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_thai_features.py -v validates Thai acoustic feature vectors.


STT-073: Thai 5-Tone Classifier Engine
Domain / Module: Thai Tones
Dependencies: STT-072
Technical Specification: Create backend/app/pitch/thai/classifier.py classifying Thai tones into Mid, Low, Falling, High, and Rising categories.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_thai_classifier.py -v verifies Thai tone classification accuracy $> 94\%$.


STT-074: Vietnamese 6-Tone Glottalization & Pitch Contour Extractor
Domain / Module: Vietnamese Tones
Dependencies: STT-069
Technical Specification: Create backend/app/pitch/vietnamese/features.py detecting energy drop / glottal stop breaks characteristic of *ngã* and *nặng* tones alongside F0 trajectory.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_vietnamese_features.py -v verifies glottalization detection.


STT-075: Vietnamese 6-Tone Classifier Engine
Domain / Module: Vietnamese Tones
Dependencies: STT-074
Technical Specification: Create backend/app/pitch/vietnamese/classifier.py classifying into Ngang, Huyền, Sắc, Hỏi, Ngã, and Nặng tones.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_vietnamese_classifier.py -v verifies Vietnamese tone classification accuracy $> 93\%$.


STT-076: Japanese Tokyo-Standard Pitch Accent Models
Domain / Module: Japanese Pitch
Dependencies: None
Technical Specification: Create backend/app/pitch/japanese/models.py defining canonical pitch accent templates: Atamadaka (1), Nakadaka (2..N-1), Odaka (N), and Heiban (0).
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_japanese_models.py -v validates pitch accent template schemas.


STT-077: Japanese Pitch Accent Step Classifier & Mora Evaluator
Domain / Module: Japanese Pitch
Dependencies: STT-069, STT-076
Technical Specification: Create backend/app/pitch/japanese/classifier.py evaluating mora-by-mora relative pitch steps (High vs Low) and matching against lexical dictionary patterns.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_japanese_classifier.py -v verifies pitch accent detection on Japanese test words.


STT-078: SVG & JSON Pitch Contour Coordinate Generator for Frontend HUD
Domain / Module: Visualization Export
Dependencies: STT-068
Technical Specification: Create backend/app/pitch/contour_export.py converting pitch curves into normalized SVG Bezier curves and JSON coordinate arrays for Next.js frontend rendering.
Acceptance Criteria & Validation: uv run pytest tests/pitch/test_contour_export.py -v verifies SVG path syntax and normalized JSON coordinates.


STT-079: Unit Test Suite for Yin Algorithm Numerical Accuracy
Domain / Module: QA & Testing
Dependencies: STT-061 to STT-065
Technical Specification: Create backend/tests/pitch/test_yin.py testing Yin algorithm on pure sinusoids from 80Hz to 600Hz.
Acceptance Criteria & Validation: uv run pytest backend/tests/pitch/test_yin.py passes with maximum frequency error $< 0.1\%$.


STT-080: Integration Test Suite for Multilingual Tone Classification
Domain / Module: QA & Testing
Dependencies: STT-070 to STT-077
Technical Specification: Create backend/tests/pitch/test_tone_classifiers.py testing tone classification across Mandarin, Thai, Vietnamese, and Japanese spoken corpora.
Acceptance Criteria & Validation: uv run pytest backend/tests/pitch/test_tone_classifiers.py passes with $> 94\%$ average accuracy.


Sub-Domain 5: Dynamic Time Warping (DTW), Levenshtein Distance & Pronunciation Scoring (STT-081 – STT-100)


STT-081: Levenshtein Phonetic Distance Matrix with Weighted Substitution Costs
Domain / Module: Pronunciation Scoring
Dependencies: STT-041
Technical Specification: Create backend/app/scoring/levenshtein.py implementing weighted Levenshtein distance where phonetic substitution costs are derived from IPA articulatory distance (place/manner/voicing differences cost less than unrelated phonemes).
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_levenshtein.py -v verifies lower penalty for similar phonemes (e.g., $[b] \rightarrow [p]$ vs $[b] \rightarrow [s]$).


STT-082: Dynamic Time Warping (DTW) Acoustic Trajectory Alignment
Domain / Module: Pronunciation Scoring
Dependencies: STT-069
Technical Specification: Create backend/app/scoring/dtw.py implementing standard Dynamic Time Warping (DTW) to align user pitch and MFCC acoustic feature sequences with native reference recordings.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_dtw.py -v verifies optimal warping path alignment.


STT-083: FastDTW Approximation Engine for Low-Latency Real-Time Matching
Domain / Module: Pronunciation Scoring
Dependencies: STT-082
Technical Specification: Create backend/app/scoring/fast_dtw.py implementing FastDTW with $O(N)$ linear time complexity and configurable radius $R = 10$ for real-time WebSocket scoring.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_fast_dtw.py -v verifies alignment within $1.5\%$ distance error of exact DTW in $< 2\text{ ms}$.


STT-084: Phoneme-Level Accuracy Scoring Engine ($S_{acc}$)
Domain / Module: Pronunciation Scoring
Dependencies: STT-081
Technical Specification: Create backend/app/scoring/accuracy.py computing $S_{acc} = 100 \times \max\left(0, 1 - \frac{\sum w_i d(p_i, r_i)}{\sum w_i}\right)$ scoring individual phonemes from 0 to 100.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_accuracy.py -v verifies score scaling on perfect, intermediate, and flawed pronunciations.


STT-085: Tone Accuracy Scoring Function ($S_{tone}$)
Domain / Module: Pronunciation Scoring
Dependencies: STT-071, STT-073, STT-075, STT-077
Technical Specification: Create backend/app/scoring/tone_score.py computing tone accuracy score based on pitch contour correlation and discrete tone classification match.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_tone_score.py -v verifies 100 for correct tone, 50 for adjacent contour, 0 for opposite contour.


STT-086: Fluency & Speech Rate Scoring Engine ($S_{flu}$)
Domain / Module: Pronunciation Scoring
Dependencies: STT-023
Technical Specification: Create backend/app/scoring/fluency.py calculating Speech Rate (syllables per second), Pausing Ratio (silent frames / total duration), and Articulation Rate, scoring fluency $S_{flu} \in [0, 100]$.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_fluency.py -v verifies fluency score penalties for excessive hesitation or unnatural pauses.


STT-087: Completeness & Omission Penalty Engine ($S_{comp}$)
Domain / Module: Pronunciation Scoring
Dependencies: STT-081
Technical Specification: Create backend/app/scoring/completeness.py calculating ratio of recognized target words/syllables $S_{comp} = 100 \times \frac{N_{\text{recognized}}}{N_{\text{reference}}}$, penalizing omitted words and truncated sentence endings.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_completeness.py -v verifies linear scaling with sentence completeness.


STT-088: Unified Pronunciation Assessment Weighted Aggregate Formula
Domain / Module: Pronunciation Scoring
Dependencies: STT-084 to STT-087
Technical Specification: Create backend/app/scoring/aggregate.py computing composite score $S_{overall} = w_1 S_{acc} + w_2 S_{tone} + w_3 S_{flu} + w_4 S_{comp}$ with language-specific weights (higher $w_{tone} = 0.35$ for Mandarin/Thai/Vietnamese).
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_aggregate.py -v verifies composite score calculations across all supported languages.


STT-089: Granular Error Diagnostic & Mispronounced Phoneme Highlighting
Domain / Module: Feedback Engine
Dependencies: STT-084, STT-085
Technical Specification: Create backend/app/scoring/diagnostics.py generating word-by-word feedback payloads highlighting exact mispronounced phonemes, tone mismatches, and audio timestamp offsets.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_diagnostics.py -v validates JSON feedback schema.


STT-090: Politeness & Formality Score Validator
Domain / Module: Pedagogical Intelligence
Dependencies: STT-045, STT-049
Technical Specification: Create backend/app/scoring/politeness.py verifying polite particles (Japanese *desu/masu/keigo*, Thai *khrap/kha*, Korean *yo/nida*) match scenario social expectations.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_politeness.py -v verifies formality detection and warning emission on inappropriate casual speech.


STT-091: Low-Latency Full-Duplex WebSocket Frame Router
Domain / Module: WebSocket Architecture
Dependencies: None
Technical Specification: Create backend/app/websockets/stt_router.py managing incoming binary audio packets (0x01), control JSON frames (0x02), and ping/pong keep-alives with client connection registry.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_stt_router.py -v verifies binary frame routing without memory leaks.


STT-092: Streaming Audio Chunk Ingestion & VAD Trigger Session Handler
Domain / Module: WebSocket Architecture
Dependencies: STT-009, STT-091
Technical Specification: Create backend/app/websockets/session_handler.py maintaining stateful per-connection VAD buffers and triggering STT decoding upon detected speech pauses.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_session_handler.py -v verifies session lifecycle management.


STT-093: Real-Time Bidirectional Event Emitter
Domain / Module: WebSocket Architecture
Dependencies: STT-091
Technical Specification: Create backend/app/websockets/event_emitter.py streaming interim transcripts (TRANSCRIPTION_PARTIAL), pitch contours (PITCH_DATA), and final assessment results (ASSESSMENT_RESULT).
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_event_emitter.py -v validates JSON event format.


STT-094: Audio & Assessment Result Caching in Redis / Memory Store
Domain / Module: Caching
Dependencies: STT-088
Technical Specification: Create backend/app/scoring/result_cache.py caching assessment scores and generated pitch contours for 24 hours to support review and leaderboard syncing.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_result_cache.py -v verifies cache read/write operations.


STT-095: Assessment Feedback DTO & JSON Schema Serializers
Domain / Module: Schemas
Dependencies: None
Technical Specification: Create backend/app/schemas/scoring_dto.py with PronunciationAssessmentResponse, WordScoreDTO, PhonemeScoreDTO, and ToneAssessmentDTO.
Acceptance Criteria & Validation: uv run pytest tests/schemas/test_scoring_dto.py -v validates Pydantic schema serialization.


STT-096: Edge Speech Assessment REST API Endpoints
Domain / Module: API Routing
Dependencies: STT-084 to STT-095
Technical Specification: Create backend/app/routers/assess.py exposing POST /api/v1/assess/pronunciation and POST /api/v1/assess/tone-curve for synchronous evaluations.
Acceptance Criteria & Validation: uv run pytest tests/routers/test_assess_router.py -v verifies API responses.


STT-097: End-to-End Pipeline Latency Benchmarking & Profiler
Domain / Module: Performance & Benchmarks
Dependencies: STT-001 to STT-096
Technical Specification: Create backend/app/scoring/benchmarks.py benchmarking total latency from user speech completion to final pronunciation & pitch score payload delivery.
Acceptance Criteria & Validation: uv run pytest tests/scoring/test_benchmarks.py -v verifies total roundtrip latency is under $350\text{ ms}$.


STT-098: Unit Test Suite for Levenshtein Distance & DTW Alignment
Domain / Module: QA & Testing
Dependencies: STT-081, STT-082, STT-083
Technical Specification: Create backend/tests/scoring/test_dtw_levenshtein.py validating alignment and distance matrix calculations.
Acceptance Criteria & Validation: uv run pytest backend/tests/scoring/test_dtw_levenshtein.py passes with 100% assertions.


STT-099: Unit Test Suite for Composite Pronunciation Scoring Formulas
Domain / Module: QA & Testing
Dependencies: STT-084 to STT-090
Technical Specification: Create backend/tests/scoring/test_pronunciation_scoring.py verifying numerical scoring accuracy across all edge cases.
Acceptance Criteria & Validation: uv run pytest backend/tests/scoring/test_pronunciation_scoring.py passes without floating point regressions.


STT-100: End-to-End WebSocket Integration Test & Multi-Language Stress Suite
Domain / Module: QA & Testing
Dependencies: STT-001 to STT-099
Technical Specification: Create backend/tests/integration/test_stt_assessment_e2e.py simulating 50 concurrent client voice sessions across Japanese, Mandarin, Thai, Vietnamese, and Korean audio streams.
Acceptance Criteria & Validation: uv run pytest backend/tests/integration/test_stt_assessment_e2e.py passes with zero dropped frames and p95 latency $< 300\text{ ms}$.
Track 6 of 10
Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering
Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering
Comprehensive Engineering Specification & 100 Micro-Tasks Breakdown (`TASK-101` – `TASK-200`)


**System Architecture Overview**

                                [ Next.js 16 Client / Web Audio ]                                                │                                        (WebSocket Frames)                                                ▼                         [ WebSocket Protocol & Stream Multiplexer ]                                                │                ┌───────────────────────────────┼───────────────────────────────┐                ▼                               ▼                               ▼     [ Input Guardrails & PII ]      [ Scenario FSM Engine ]       [ VAD & Interruption Handler ]     • Prompt Injection Defense      • State Transitions & Guards  • Barge-In Signal Processing     • Asian Slang/Profanity Check   • Dynamic Difficulty Scaling  • Token Stream Interleaving                │                               │                               │                └───────────────────────────────┼───────────────────────────────┘                                                ▼                               [ Edge LLM Orchestrator (vLLM) ]                                 • Multi-Persona System Prompts                                 • Dynamic Few-Shot Exemplars                                 • Token KV Prefix Caching                                                │                ┌───────────────────────────────┴───────────────────────────────┐                ▼                                                               ▼   [ Dialogue Stream to TTS ]                                    [ Pedagogical Correction Engine ]   • Sentence Boundary Buffering                                 • Grammar & Particle Analyzer   • Streaming to Moonshot TTS                                   • Speech Register (Keigo/Banmal)                                                                 • Inline Correction JSON Payload


**Cluster 1: Edge LLM Inference Core & Streaming Protocols (`TASK-101` – `TASK-110`)**


`TASK-101`: Async vLLM / Ollama OpenAI-Compatible Client Wrapper
Domain / Module: core/llm/client.py
Dependencies: None
Technical Specification: Implement AsyncEdgeLLMClient wrapping httpx.AsyncClient supporting streaming chat completions (/v1/chat/completions) for local vLLM and Ollama instances. Handle connection timeouts (connect: 2.0s, read: 15.0s), connection pooling (max 100 keepalive), and streaming token generators.
Acceptance Criteria & Validation: uv run pytest tests/llm/test_client.py -v verifies streaming token yields, connection reuse, and clean exception mapping for HTTPStatusError and ConnectTimeout.



`TASK-102`: Edge Model Registry & Multi-Model Routing Strategy
Domain / Module: core/llm/registry.py
Dependencies: TASK-101
Technical Specification: Create ModelRegistry mapping tasks to target models (roleplay-fast: Qwen-2.5-7B-Instruct, pedagogy-analysis: DeepSeek-R1-Distill-8B, safety-filter: Llama-3.2-3B). Implement fallback routing if primary model endpoint fails health probes.
Acceptance Criteria & Validation: uv run pytest tests/llm/test_registry.py -v verifies routing resolution and automatic fallback when the primary model reports unavailable.



`TASK-103`: Token Stream Chunking, Buffering & Punctuation Segmenter
Domain / Module: core/llm/stream_buffer.py
Dependencies: TASK-101
Technical Specification: Implement TokenStreamSegmenter to accumulate incoming LLM token deltas and segment sentences on both Asian delimiters (。, ！, ？, \n) and Western punctuation (., !, ?). Emits complete sentences immediately to the downstream TTS buffer while streaming raw tokens to the client UI.
Acceptance Criteria & Validation: uv run pytest tests/llm/test_stream_buffer.py -v verifies exact sentence chunk boundaries across mixed Japanese/English and Thai/English streams.



`TASK-104`: Time-to-First-Token (TTFT) & Tokens-per-Second (TPS) Telemetry Monitor
Domain / Module: core/llm/telemetry.py
Dependencies: TASK-101
Technical Specification: Implement InferenceTelemetryTracker recording request timestamp, first-token arrival timestamp, total completion duration, and total token count. Expose Prometheus metrics: llm_ttft_seconds (histogram) and llm_tps_rate (gauge).
Acceptance Criteria & Validation: uv run pytest tests/llm/test_telemetry.py -v validates metric accuracy under simulated 50ms and 150ms token delay intervals.



`TASK-105`: Fallback Engine, Circuit Breaker & Timeout Watchdog
Domain / Module: core/llm/circuit_breaker.py
Dependencies: TASK-101, TASK-102
Technical Specification: Implement LLMCircuitBreaker using a sliding window of 20 requests. If failure rate > 25% or p95 TTFT > 3.0s, transition state from CLOSED to OPEN and route requests to edge backup endpoints or pre-cached deterministic fallback utterances.
Acceptance Criteria & Validation: uv run pytest tests/llm/test_circuit_breaker.py -v verifies state transitions (CLOSED -> OPEN -> HALF-OPEN) and fallback response dispatch.



`TASK-106`: Structured JSON Output Enforcement via Grammar & Pydantic
Domain / Module: core/llm/structured_output.py
Dependencies: TASK-101
Technical Specification: Implement StructuredOutputExtractor wrapping LLM calls with JSON schema constraints (utilizing vLLM guided decoding or regex grammar constraints). Enforce strict parsing against target Pydantic models with automated schema correction retry on parse failure.
Acceptance Criteria & Validation: uv run pytest tests/llm/test_structured_output.py -v validates schema adherence for malformed or truncated JSON payloads.



`TASK-107`: Token KV Cache Management & Prefix Caching Optimizer
Domain / Module: core/llm/kv_cache.py
Dependencies: TASK-101
Technical Specification: Implement PrefixCacheOptimizer structuring system prompts with standardized static prefixes (persona definition, cultural constraints, scenario rules) placed at the top of the context window to maximize vLLM automatic prefix KV cache reuse across turns.
Acceptance Criteria & Validation: uv run pytest tests/llm/test_kv_cache.py -v asserts that static prompt prefixes maintain bitwise-identical hash signatures across session turns.



`TASK-108`: Temperature & Top-P Dynamic Decay Scheduler
Domain / Module: core/llm/sampling.py
Dependencies: TASK-101
Technical Specification: Implement SamplingScheduler dynamically adjusting sampling parameters based on conversation turn and scenario type: creative roleplay (temperature: 0.75, top_p: 0.90) vs. pedagogical correction extraction (temperature: 0.1, top_p: 0.2).
Acceptance Criteria & Validation: uv run pytest tests/llm/test_sampling.py -v verifies parameter injection per scenario mode.



`TASK-109`: Async Connection Pool & Semaphore Request Limiter
Domain / Module: core/llm/pool.py
Dependencies: TASK-101
Technical Specification: Implement InferenceConcurrencyLimiter using asyncio.Semaphore bounded by Kubernetes node GPU/CPU capacity. Queues excess incoming user turns with a maximum queue timeout of 5.0s before returning graceful retry notifications.
Acceptance Criteria & Validation: uv run pytest tests/llm/test_pool.py -v verifies queue draining and timeout rejection under simulated concurrency overload (100 simultaneous requests).



`TASK-110`: Edge Inference Health Checker & Warmup Endpoint
Domain / Module: core/llm/health.py
Dependencies: TASK-101, TASK-102
Technical Specification: Create GET /api/v1/llm/health and background startup warmup routine that dispatches a 5-token completion request on container boot to ensure model weights and KV cache memory are fully allocated before receiving live traffic.
Acceptance Criteria & Validation: curl -f http://localhost:8000/api/v1/llm/health returns HTTP 200 with model ready states.


**Cluster 2: WebSocket Protocol & Real-Time Event Loop (`TASK-111` – `TASK-120`)**


`TASK-111`: WebSocket Binary / JSON Multiplexed Frame Schema
Domain / Module: websockets/schemas.py
Dependencies: None
Technical Specification: Define Pydantic models for incoming and outgoing WebSocket frames:
* Inbound: AUDIO_CHUNK (binary Opus/PCM), TEXT_MESSAGE, INTERRUPT_SIGNAL, SCENARIO_CONFIG.
* Outbound: TRANSCRIPTION_DELTA, LLM_TOKEN_DELTA, TTS_AUDIO_STREAM (binary), CORRECTION_PAYLOAD, STATE_TRANSITION, SESSION_ERROR.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_schemas.py -v validates serialization and deserialization of all frame variants.



`TASK-112`: Bidirectional Connection Manager with Session Affinity
Domain / Module: websockets/connection_manager.py
Dependencies: TASK-111
Technical Specification: Implement WebSocketConnectionManager managing active client sockets indexed by session_id and user_id. Tracks socket health, active background asyncio tasks, and ensures clean cleanup on network drops.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_connection_manager.py -v asserts proper registration, broadcast, and teardown across 50 simulated connections.



`TASK-113`: Interleaved Token & Audio Chunk Streaming Pipeline
Domain / Module: websockets/stream_pipeline.py
Dependencies: TASK-103, TASK-111, TASK-112
Technical Specification: Implement StreamMultiplexer coordinating concurrent transmission of UTF-8 text tokens (for live subtitle UI rendering) and binary TTS audio packets over the same WebSocket connection with sequence numbers to prevent ordering desynchronization.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_stream_pipeline.py -v verifies packet sequencing and zero race conditions between token and audio frame delivery.



`TASK-114`: User Barge-In / Interruption Cancellation Handler
Domain / Module: websockets/barge_in.py
Dependencies: TASK-112, TASK-113
Technical Specification: Implement BargeInController. When the user begins speaking while the AI is streaming TTS audio:
1. Captures INTERRUPT_SIGNAL or VAD trigger.
2. Cancels active downstream LLM generation task.
3. Cancels ongoing Moonshot TTS synthesis.
4. Flushes the WebSocket audio output buffer.
5. Sends PLAYBACK_STOPPED frame to the client.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_barge_in.py -v verifies task cancellation and buffer flush within 50ms of interrupt trigger.



`TASK-115`: Heartbeat, Ping/Pong & Graceful Reconnect Protocol
Domain / Module: websockets/heartbeat.py
Dependencies: TASK-112
Technical Specification: Implement ping/pong protocol with 15s heartbeat interval. If two consecutive pings fail, cleanly close the socket and persist conversation state to memory cache for 5 minutes, allowing zero-loss client reconnection.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_heartbeat.py -v validates heartbeat timeout detection and state persistence for reconnecting clients.



`TASK-116`: WebSocket Message Rate Limiter & Flood Guard
Domain / Module: websockets/rate_limit.py
Dependencies: TASK-111
Technical Specification: Implement token-bucket rate limiter per WebSocket connection. Restricts incoming audio/text frames to 30 frames/sec and max bandwidth of 64KB/sec. Drops abusive frames and dispatches a RATE_LIMIT_WARNING frame before socket closure.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_rate_limit.py -v asserts throttling under intentional message flood conditions.



`TASK-117`: Session State Serialization & In-Memory Sync
Domain / Module: websockets/session_state.py
Dependencies: TASK-111
Technical Specification: Implement SessionStateStore saving active conversation context (current FSM state, dialog history, formality baseline, active vocabulary targets) into an in-memory TTL cache synchronized across worker threads.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_session_state.py -v verifies state hydration, mutation, and serialization.



`TASK-118`: End-of-Turn Silence & Voice Activity Detection (VAD) Bridge
Domain / Module: websockets/vad_bridge.py
Dependencies: TASK-111
Technical Specification: Implement VADStreamBridge listening to incoming audio chunk energy levels. Triggers TURN_END when silence exceeds dynamic threshold: 800ms for beginner mode, 500ms for intermediate, 350ms for advanced.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_vad_bridge.py -v verifies turn-end triggering across variable silence durations and threshold configurations.



`TASK-119`: Real-Time Latency Profiler & Network Jitter Compensator
Domain / Module: websockets/jitter_buffer.py
Dependencies: TASK-113
Technical Specification: Implement JitterBufferManager computing round-trip time (RTT) and adjusting audio packet chunk sizing (from 100ms chunks on fast networks up to 300ms chunks on jittery mobile connections).
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_jitter_buffer.py -v verifies dynamic packet sizing under simulated network packet delay variance.



`TASK-120`: WebSocket Error Dispatcher & Client Disconnect Cleanup
Domain / Module: websockets/error_handler.py
Dependencies: TASK-112
Technical Specification: Implement WebSocketErrorHandler converting unhandled backend exceptions into structured JSON error payloads with client-friendly recovery messages and localized troubleshooting hints. Ensures all background tasks are cancelled on disconnect.
Acceptance Criteria & Validation: uv run pytest tests/websockets/test_error_handler.py -v verifies zero dangling async tasks on unexpected client socket termination.


**Cluster 3: Travel Scenario State Machines & Transition Engines (`TASK-121` – `TASK-130`)**


`TASK-121`: Finite State Machine (FSM) Base Architecture & Transition Guard
Domain / Module: scenarios/fsm_engine.py
Dependencies: None
Technical Specification: Create BaseScenarioFSM utilizing strict state transitions:
* Attributes: current_state, allowed_transitions: dict[str, list[str]], state_context: dict.
* Methods: transition_to(target_state: str, guard_fn: Callable), get_prompt_constraints() -> str.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_fsm_engine.py -v verifies rejection of invalid transitions and successful execution of state entry/exit hooks.



`TASK-122`: Night Market Bargaining FSM (Offer -> Counter -> Walk-Away -> Deal)
Domain / Module: scenarios/bargaining_fsm.py
Dependencies: TASK-121
Technical Specification: Implement BargainingScenarioFSM:
* States: GREETING, INQUIRE_PRICE, INITIAL_OFFER, VENDOR_COUNTER, SECOND_OFFER, WALK_AWAY_BLUFF, DEAL_AGREED, PAYMENT_METHOD, DEAL_REJECTED.
* Guard rules: Prevents reaching DEAL_AGREED if user discount > 70% without intermediate counter-offers.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_bargaining_fsm.py -v verifies progression through all bargaining stages based on extracted intent.



`TASK-123`: Street Food & Izakaya Ordering FSM (Dietary, Spiciness, Bills)
Domain / Module: scenarios/food_ordering_fsm.py
Dependencies: TASK-121
Technical Specification: Implement FoodOrderingFSM:
* States: TABLE_REQUEST, MENU_INQUIRY, SPECIALTY_RECOMMENDATION, DIETARY_ALLERGY_CHECK, SPICE_LEVEL_SELECTION, ORDER_CONFIRMATION, MID_MEAL_ADDON, BILL_SPLIT_PAYMENT.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_food_ordering_fsm.py -v verifies spice-level selection and allergy acknowledgment guards.



`TASK-124`: Taxi & Tuk-Tuk Navigation FSM (Destination, Meter, Drop-Off)
Domain / Module: scenarios/taxi_navigation_fsm.py
Dependencies: TASK-121
Technical Specification: Implement TaxiNavigationFSM:
* States: HAIL_TAXI, STATE_DESTINATION, METER_OR_FLAT_NEGOTIATION, ROUTE_PREFERENCE (Highway/Toll vs Local), LIVE_CORRECTION (Turn left/right, stop here), PAYMENT_CHANGE.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_taxi_fsm.py -v tests transitions for meter refusal and navigation directives.



`TASK-125`: Hotel & Airbnb Villa Check-In FSM (Keycards, Amenities, Requests)
Domain / Module: scenarios/hotel_checkin_fsm.py
Dependencies: TASK-121
Technical Specification: Implement HotelCheckinFSM:
* States: CHECKIN_GREETING, RESERVATION_CONFIRMATION, PASSPORT_DEPOSIT, AMENITY_INQUIRY (Wi-Fi password, breakfast hours, pool), SPECIAL_REQUEST (Extra towels, late checkout), ROOM_KEY_HANDOFF.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_hotel_fsm.py -v validates passport/ID check step and room key handoff completion.



`TASK-126`: Nightlife & Social Introductions FSM (Drinks, Icebreakers, Exchange)
Domain / Module: scenarios/social_dating_fsm.py
Dependencies: TASK-121
Technical Specification: Implement SocialDatingFSM:
* States: OPENING_ICEBREAKER, ORIGIN_AND_OCCUPATION, TRAVEL_PLANS_SHARING, FOOD_MUSIC_RECOMMENDATIONS, CULTURAL_EXCHANGE, CONTACT_EXCHANGE (Line/Instagram/WeChat), POLITE_DEPARTURE.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_social_fsm.py -v asserts natural progression through conversation topics without abrupt endings.



`TASK-127`: Pharmacy & Medical Emergency FSM (Symptoms, Allergies, Dosage)
Domain / Module: scenarios/emergency_fsm.py
Dependencies: TASK-121
Technical Specification: Implement PharmacyEmergencyFSM:
* States: TRIAGE_GREETING, SYMPTOM_DESCRIPTION (Fever, stomach pain, headache, cuts), DURATION_AND_SEVERITY, ALLERGY_HISTORY, MEDICATION_RECOMMENDATION, DOSAGE_INSTRUCTIONS, PURCHASE.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_emergency_fsm.py -v verifies symptom clarification and dosage explanation transitions.



`TASK-128`: Transit & Train Station Navigation FSM (IC Cards, Transfers, Delays)
Domain / Module: scenarios/transit_fsm.py
Dependencies: TASK-121
Technical Specification: Implement TransitNavigationFSM:
* States: TICKET_COUNTER_GREETING, DESTINATION_SELECTION, TICKET_TYPE (Single, Express, IC Card recharge), PLATFORM_TRANSFER_INQUIRY, DELAY_ANNOUNCEMENT_HANDLING, GATE_EXIT.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_transit_fsm.py -v validates platform transfer inquiry branch.



`TASK-129`: Scooter Rental & Fueling FSM (Deposit, Inspection, Gas Stations)
Domain / Module: scenarios/scooter_rental_fsm.py
Dependencies: TASK-121
Technical Specification: Implement ScooterRentalFSM:
* States: RENTAL_INQUIRY, DURATION_AND_ENGINE_SIZE, HELMET_INSURANCE_ADDON, DAMAGE_INSPECTION, FUEL_TYPE_EXPLANATION (91/95 Octane), GAS_STATION_INTERACTION, RETURN_INSPECTION.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_scooter_fsm.py -v tests vehicle inspection and fueling dialogue branches.



`TASK-130`: FSM State Persistence, Snapshotting & Rollback Handler
Domain / Module: scenarios/state_store.py
Dependencies: TASK-121 to TASK-129
Technical Specification: Implement FSMStateStore serializing full state machine snapshots per turn. Enables "Rewind Turn" or "Retry Scenario Branch" functionality without resetting the entire conversation.
Acceptance Criteria & Validation: uv run pytest tests/scenarios/test_state_store.py -v verifies state snapshot restoration to an exact previous conversation state.


**Cluster 4: System Prompt Matrix & Few-Shot Persona Templates (`TASK-131` – `TASK-140`)**


`TASK-131`: Parameterized Multi-Persona System Prompt Builder
Domain / Module: prompts/builder.py
Dependencies: None
Technical Specification: Create SystemPromptBuilder generating structured prompt contexts:
* Sections: [IDENTITY & ROLE], [CURRENT SCENARIO STATE], [TARGET LANGUAGE & REGISTER], [PEDAGOGICAL CONSTRAINTS], [FEW-SHOT EXAMPLES], [OUTPUT FORMAT].
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_builder.py -v validates complete prompt construction with all variable slots populated.



`TASK-132`: Japanese Izakaya Master & Tokyo Taxi Driver Personas
Domain / Module: prompts/japanese_personas.py
Dependencies: TASK-131
Technical Specification: Define persona profiles:
* Izakaya Master: Gruff, warm, colloquial Japanese (*Da-tai* / *Desu-masu*), uses food vocabulary, nudges customer to order drinks first (*"Toriaezu Nama"*).
* Tokyo Taxi Driver: Hyper-polite (*Keigo/Teineigo*), confirms routes clearly, clarifies landmarks.
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_japanese_personas.py -v asserts persona vocabulary markers and tone accuracy.



`TASK-133`: Mandarin Taipei Night Market Vendor & Beijing Barista Personas
Domain / Module: prompts/mandarin_personas.py
Dependencies: TASK-131
Technical Specification: Define persona profiles:
* Taipei Vendor: Energetic, friendly, uses Taiwanese Mandarin sentence particles (*Ah*, *La*, *O*), negotiates prices playfully.
* Beijing Barista: Modern, polite (*Nin* vs *Ni*), guides customer through drink preferences (ice level, sugar level).
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_mandarin_personas.py -v verifies dialect-appropriate particle injection.



`TASK-134`: Thai Bangkok Tuk-Tuk Driver & Street Food Auntie Personas
Domain / Module: prompts/thai_personas.py
Dependencies: TASK-131
Technical Specification: Define persona profiles:
* Tuk-Tuk Driver: Friendly negotiator, suggests destinations, uses polite particle *Khrap*, counters price cuts humorously.
* Food Auntie (Jay/Pee): Maternal, checks spice tolerance (*Phet mai?*), encourages trying daily specials.
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_thai_personas.py -v verifies polite particle consistency (*Khrap/Kha*).



`TASK-135`: Vietnamese Saigon Grab Driver & Hanoi Pho Master Personas
Domain / Module: prompts/vietnamese_personas.py
Dependencies: TASK-131
Technical Specification: Define persona profiles:
* Grab Driver: Fast-paced, clarifies pickup spot landmarks, uses Southern dialect terms (*Quẹo* instead of *Rẽ*).
* Pho Master: Traditional, precise regarding beef cuts (*Tái, Nạm, Gầu*), uses Northern pronoun conventions (*Bác, Em*).
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_vietnamese_personas.py -v verifies Northern and Southern vocabulary tags.



`TASK-136`: Korean Hongdae Street Fashion Vendor & Pocha Owner Personas
Domain / Module: prompts/korean_personas.py
Dependencies: TASK-131
Technical Specification: Define persona profiles:
* Fashion Vendor: Trendy, fast, compliments customer style, offers bundle discounts (*Service juseyo* responses).
* Pocha Owner (Imo): Warm, informal-polite (*Haeyoche*), recommends soju pairings with street food.
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_korean_personas.py -v verifies speech level adherence.



`TASK-137`: Dynamic Few-Shot Dialogue Exemplar Retriever (RAG)
Domain / Module: prompts/few_shot_retriever.py
Dependencies: TASK-131
Technical Specification: Implement FewShotExemplarRetriever selecting the top-3 most relevant dialogue turn examples from a curated vector/metadata store matching the user's current scenario state, language, and difficulty level.
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_few_shot_retriever.py -v verifies retrieved exemplar relevance and sub-10ms lookup latency.



`TASK-138`: Pedagogical Hint & Hidden Thought Injector
Domain / Module: prompts/thought_injector.py
Dependencies: TASK-131
Technical Specification: Implement prompt structuring instructing the model to output a hidden XML block containing intermediate analysis (user intent, grammatical flaws, conversational goal status) prior to generating the visible dialogue response.
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_thought_injector.py -v verifies regex extraction and separation of thought tags from final dialogue.



`TASK-139`: Scenario Objective Tracker & Completion Evaluator Prompt
Domain / Module: prompts/objective_evaluator.py
Dependencies: TASK-131
Technical Specification: Implement evaluation prompt evaluating whether the user successfully achieved the scenario mission (e.g., got a 20% discount, successfully ordered food with no cilantro, arrived at destination). Returns objective score (0–100) and milestone checklist.
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_objective_evaluator.py -v validates milestone score calculation on completed dialogues.



`TASK-140`: Multi-Turn Conversation History Compressor & Truncation Engine
Domain / Module: prompts/context_compressor.py
Dependencies: TASK-131
Technical Specification: Implement ConversationCompressor keeping the last 6 active turns verbatim while summarizing earlier turns into a compact 50-token scenario summary, preserving token budget within edge model context limits.
Acceptance Criteria & Validation: uv run pytest tests/prompts/test_context_compressor.py -v verifies context window stability across a 30-turn roleplay session.


**Cluster 5: Dynamic Difficulty & Vocabulary Adaptation (`TASK-141` – `TASK-150`)**


`TASK-141`: CEFR / JLPT / HSK Proficiency Level Mapping System
Domain / Module: adaptation/proficiency_levels.py
Dependencies: None
Technical Specification: Create ProficiencyMatrix standardizing proficiency tiers:
* Tier 1 (Beginner): JLPT N5 / HSK 1-2 / CEFR A1.
* Tier 2 (Elementary): JLPT N4 / HSK 3 / CEFR A2.
* Tier 3 (Intermediate): JLPT N3 / HSK 4 / CEFR B1.
* Tier 4 (Immersion): JLPT N2+ / HSK 5+ / CEFR B2+.
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_proficiency_levels.py -v verifies language-agnostic level mappings.



`TASK-142`: Vocabulary Whitelist & Blacklist Frequency Filter
Domain / Module: adaptation/vocab_filter.py
Dependencies: TASK-141
Technical Specification: Implement VocabularyFilter checking model outputs against frequency tier lists. In Beginner mode, prompts model to avoid rare idioms (e.g., Yojijukugo in Japanese or Chengyu in Mandarin) and substitute top-500 high-frequency travel terms.
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_vocab_filter.py -v flags advanced lexical items in beginner-tier outputs.



`TASK-143`: Grammar & Syntax Complexity Regulator (Clause Length Limiter)
Domain / Module: adaptation/syntax_regulator.py
Dependencies: TASK-141
Technical Specification: Implement syntax constraints per tier:
* Beginner: Max 1 clause per sentence, no passive/causative grammar, simple present/past.
* Intermediate: Compound sentences with conjunctions (*Keredo*, *Inshang*, *Tte*).
* Advanced: Full natural sentence complexity with native ellipsis and contractions.
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_syntax_regulator.py -v validates clause count and grammatical structure against active tier.



`TASK-144`: Real-Time Speech Rate & Response Length Adjuster
Domain / Module: adaptation/pacing_controller.py
Dependencies: TASK-141
Technical Specification: Implement PacingController configuring response length and Moonshot TTS speed:
* Beginner: 1–2 sentences max, TTS speed 0.85x.
* Intermediate: 2–3 sentences, TTS speed 1.0x.
* Advanced: Unconstrained natural conversational length, TTS speed 1.15x.
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_pacing_controller.py -v asserts output sentence length limits and speed metadata.



`TASK-145`: Dynamic English Gloss & Pinyin/Romaji Support Injector
Domain / Module: adaptation/gloss_injector.py
Dependencies: TASK-141
Technical Specification: Implement GlossInjector appending inline phonetic annotations and English glosses to response metadata when the user level is Tier 1 or 2, without polluting the primary speech audio stream.
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_gloss_injector.py -v verifies metadata attachment without modifying native text speech chunks.



`TASK-146`: User Error Frequency Tracker & Auto-Downgrade Engine
Domain / Module: adaptation/difficulty_decay.py
Dependencies: TASK-141
Technical Specification: Implement DifficultyDecayEngine. If a user fails to communicate intent or receives 3 consecutive critical grammar/formality errors, automatically decays difficulty tier by 1 level for the remainder of the session and provides supportive hints.
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_difficulty_decay.py -v tests auto-downgrade triggering and prompt adjustment.



`TASK-147`: Challenge Escalation & Native Slang Intro Engine
Domain / Module: adaptation/slang_escalator.py
Dependencies: TASK-141
Technical Specification: Implement ChallengeEscalator. When user fluency score > 90% across 5 turns, injects local colloquialisms and unexpected scenario curveballs (e.g., vendor is out of the requested item, taxi encounters a road closure).
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_slang_escalator.py -v verifies scenario curveball injection on high fluency scores.



`TASK-148`: Fluency & Conversational Smoothness Metric Calculator
Domain / Module: adaptation/fluency_scorer.py
Dependencies: None
Technical Specification: Implement FluencyScorer calculating turn-level metrics: response latency, lexical diversity (Type-Token Ratio), grammatical accuracy, and communicative effectiveness. Returns aggregate score (0–100).
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_fluency_scorer.py -v validates scoring consistency across synthetic test turn samples.



`TASK-149`: Real-Time User Vocabulary Mastery Matrix
Domain / Module: adaptation/mastery_matrix.py
Dependencies: TASK-148
Technical Specification: Implement MasteryMatrixTracker recording words and grammatical structures successfully used by the user during roleplay, marking them as active/mastered in the user's persistent learning profile.
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_mastery_matrix.py -v verifies vocabulary extraction and mastery state updates.



`TASK-150`: Adaptive Scenario Branch Re-Routing Engine
Domain / Module: adaptation/branch_router.py
Dependencies: TASK-121, TASK-146, TASK-147
Technical Specification: Implement AdaptiveBranchRouter dynamically modifying FSM destination paths based on user conversational choices (e.g., if user suggests going to a different market stall or ordering a different dish).
Acceptance Criteria & Validation: uv run pytest tests/adaptation/test_branch_router.py -v validates dynamic FSM branch re-routing.


**Cluster 6: Real-Time Pedagogical Correction & Error Analysis (`TASK-151` – `TASK-160`)**


`TASK-151`: Pedagogical Grammar Correction Prompt & JSON Schema
Domain / Module: pedagogy/grammar_analyzer.py
Dependencies: None
Technical Specification: Define Pydantic models for pedagogical feedback:
`python
class GrammarCorrection(BaseModel):
has_error: bool
original_segment: str
corrected_segment: str
error_category: Literal["particle", "conjugation", "vocabulary", "word_order", "tone", "none"]
explanation_en: str
better_alternative: str
`
Implement prompt template for zero-shot real-time analysis of user utterances.
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_grammar_analyzer.py -v validates output parsing against known grammatical errors.



`TASK-152`: Semantic Intent Alignment & Misunderstanding Detector
Domain / Module: pedagogy/semantic_aligner.py
Dependencies: TASK-151
Technical Specification: Implement SemanticIntentAligner checking if the user utterance actually satisfied the conversational requirement (e.g., user answered "yes" to an "A or B" question, or gave a number when asked for a location).
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_semantic_aligner.py -v detects intent mismatches in synthetic dialogues.



`TASK-153`: Japanese Particle Validator (は/が/を/に/で/へ)
Domain / Module: pedagogy/japanese_particles.py
Dependencies: TASK-151
Technical Specification: Implement specialized rule-based and LLM-assisted validator for Japanese particle confusion (e.g., *Wa* vs *Ga*, *Ni* vs *De* for location of action vs existence). Generates clear, non-academic explanations.
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_japanese_particles.py -v catches 100% of particle error test fixtures.



`TASK-154`: Korean Subject & Topic Marker Validator (은/는/이/가/을/를)
Domain / Module: pedagogy/korean_particles.py
Dependencies: TASK-151
Technical Specification: Implement Korean particle validator checking topic markers (*Eun/Neun*) vs subject markers (*I/Ga*) and object markers (*Eul/Reul*), accounting for vowel/consonant ending euphonic rules.
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_korean_particles.py -v verifies euphonic consonant rule enforcement.



`TASK-155`: Thai Sentence-Ending & Polite Particle Validator (ครับ/ค่ะ/นะ/ด้วย)
Domain / Module: pedagogy/thai_particles.py
Dependencies: TASK-151
Technical Specification: Implement Thai particle analyzer checking speaker gender consistency (*Khrap* for male speakers, *Kha/Kha* for female speakers) and softening particles (*Na*, *Duay*, *Si*).
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_thai_particles.py -v verifies gender-particle agreement.



`TASK-156`: Vietnamese Kinship Pronoun Alignment (Anh/Em/Chị/Cô/Chú)
Domain / Module: pedagogy/vietnamese_pronouns.py
Dependencies: TASK-151
Technical Specification: Implement Vietnamese pronoun checker analyzing hierarchical self-address and partner-address: *Em* (younger) to *Anh/Chị* (older), *Cháu* to *Cô/Chú/Bác*, and flags disrespectful neutral pronoun usage (*Tôi/Mày/Tao* in service encounters).
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_vietnamese_pronouns.py -v verifies pronoun hierarchy checks.



`TASK-157`: Mandarin Measure Word (Classifier) Error Checker (个/张/本/杯/位)
Domain / Module: pedagogy/mandarin_classifiers.py
Dependencies: TASK-151
Technical Specification: Implement classifier validator flagging over-reliance on generic *Ge* (个) when ordering items requiring specific measure words: drinks (*Bei* 杯), bowls (*Wan* 碗), flat objects/tickets (*Zhang* 张), people (*Wei* 位).
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_mandarin_classifiers.py -v validates noun-classifier pairing accuracy.



`TASK-158`: Natural Alternative Phrasing & Slang Suggester
Domain / Module: pedagogy/alternative_suggester.py
Dependencies: TASK-151
Technical Specification: Implement AlternativeSuggester producing a "More Natural / Local Phrasing" suggestion for grammatically correct but robotic textbook sentences (e.g., converting *"Watashi wa bīru o nomitai desu"* -> *"Toriaezu bīru kudasai"*).
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_alternative_suggester.py -v validates local phrase substitution suggestions.



`TASK-159`: Async Pedagogical Correction Cache & Deduplicator
Domain / Module: pedagogy/correction_cache.py
Dependencies: TASK-151
Technical Specification: Implement CorrectionCache caching frequent user mistake patterns to avoid redundant LLM analysis calls on recurring beginner mistakes.
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_correction_cache.py -v verifies cache hit rates and sub-1ms return on cached mistakes.



`TASK-160`: Pedagogical Response Stream Splitter (Dialogue vs Correction)
Domain / Module: pedagogy/stream_splitter.py
Dependencies: TASK-113, TASK-151
Technical Specification: Implement StreamSplitter routing the persona's spoken dialogue response directly to the TTS audio pipeline while emitting the structured correction metadata to the client's visual feedback UI stream.
Acceptance Criteria & Validation: uv run pytest tests/pedagogy/test_stream_splitter.py -v verifies zero audio contamination from correction strings.


**Cluster 7: Formality & Cultural Nuance Grading Engines (`TASK-161` – `TASK-170`)**


`TASK-161`: Japanese Speech Register Classifier (Keigo vs Teineigo vs Casual)
Domain / Module: formality/japanese_register.py
Dependencies: None
Technical Specification: Implement JapaneseRegisterClassifier identifying verbal endings:
* Kudaketa (Casual): Plain form (*Da*, *Nai*, *Ta*, *Ru*).
* Teineigo (Polite): *Desu*, *Masu*.
* Sonkeigo (Honorific): *O-ni naru*, *Irassharu*, *Osharu*.
* Kenjougo (Humble): *Mousu*, *Itasu*, *Itadaku*.
Acceptance Criteria & Validation: uv run pytest tests/formality/test_japanese_register.py -v achieves > 99% classification accuracy across test verbs.



`TASK-162`: Korean Speech Level Classifier (Hasoseo / Hasio / Haeyo / Banmal)
Domain / Module: formality/korean_register.py
Dependencies: None
Technical Specification: Implement KoreanSpeechLevelClassifier classifying verb endings:
* Hapsyoche (Formal polite: *-b/seumnida*).
* Haeyoche (Informal polite: *-a/eoyo*).
* Haerache (Plain formal: *-da*).
* Banmal (Casual/Intimate: *-a/eo*, *-ya*).
Acceptance Criteria & Validation: uv run pytest tests/formality/test_korean_register.py -v classifies Korean sentence endings accurately.



`TASK-163`: Thai Politeness & Social Hierarchy Engine (Wai & Khrap/Kha)
Domain / Module: formality/thai_formality.py
Dependencies: None
Technical Specification: Implement ThaiFormalityEngine calculating polite particle density and social status alignment (monks, elders, peers, service staff) and providing appropriate *Wai* (greeting gesture) contextual advice.
Acceptance Criteria & Validation: uv run pytest tests/formality/test_thai_formality.py -v scores formality compliance across scenarios.



`TASK-164`: Vietnamese Social Distance & Age Pronoun Engine
Domain / Module: formality/vietnamese_formality.py
Dependencies: None
Technical Specification: Implement VietnameseFormalityEngine checking respect markers (e.g., *Dạ*, *Thưa*, *Cảm ơn*) and verifying that the user matches the expected conversational distance for hospitality vs market scenarios.
Acceptance Criteria & Validation: uv run pytest tests/formality/test_vietnamese_formality.py -v validates politeness marker detection.



`TASK-165`: Mandarin Honorific vs Casual Expression Detector (您 vs 你)
Domain / Module: formality/mandarin_formality.py
Dependencies: None
Technical Specification: Implement MandarinFormalityDetector identifying formal pronouns (*Nin* 您), polite request openings (*Qingwen* 请问, *Laojia* 劳驾, *Mafan nin* 麻烦您), and alerting if tone is overly abrupt.
Acceptance Criteria & Validation: uv run pytest tests/formality/test_mandarin_formality.py -v detects abrupt vs polite request phrasing.



`TASK-166`: Cultural Faux-Pas & Taboo Utterance Identifier
Domain / Module: formality/cultural_taboo.py
Dependencies: None
Technical Specification: Implement CulturalTabooDetector scanning for cultural missteps:
* Sticking chopsticks upright in rice (*Tsukitate-bashi* in Japan).
* Inquiring about monarchy in Thailand.
* Inappropriate tipping comments in non-tipping countries (Japan/Korea).
* Touching someone's head in Thailand/Buddhist cultures.
Acceptance Criteria & Validation: uv run pytest tests/formality/test_cultural_taboo.py -v catches 100% of defined cultural taboo test triggers and injects polite corrective advice.



`TASK-167`: Formality Mismatch Severity Calculator & UI Alert Generator
Domain / Module: formality/mismatch_alert.py
Dependencies: TASK-161 to TASK-165
Technical Specification: Implement FormalityMismatchCalculator evaluating difference between scenario expected register ($R_{expected}$) and user register ($R_{actual}$). Emits UI warning: MILD_NOTE (polite in casual setting), WARNING (casual in business), CRITICAL (rude in formal).
Acceptance Criteria & Validation: uv run pytest tests/formality/test_mismatch_alert.py -v verifies alert level generation.



`TASK-168`: Contextual Politeness Goal Tracker
Domain / Module: formality/politeness_goal.py
Dependencies: TASK-167
Technical Specification: Implement PolitenessGoalTracker setting target formality goals per scenario (e.g., "Complete the check-in using 100% *Desu-Masu* or *Keigo*") and awarding bonus XP on success.
Acceptance Criteria & Validation: uv run pytest tests/formality/test_politeness_goal.py -v verifies goal evaluation on conversation completion.



`TASK-169`: Cultural Etiquette Tip Generator for Roleplay Scenarios
Domain / Module: formality/etiquette_tips.py
Dependencies: None
Technical Specification: Implement EtiquetteTipGenerator supplying 1-sentence actionable cultural tips before entering scenario (e.g., *"In Thailand, always use Khrap/Kha at the end of sentences when asking for prices"*).
Acceptance Criteria & Validation: uv run pytest tests/formality/test_etiquette_tips.py -v returns appropriate tips for all active scenarios.



`TASK-170`: Multi-Lingual Formality Benchmark & Rule Evaluator
Domain / Module: formality/rule_evaluator.py
Dependencies: TASK-161 to TASK-169
Technical Specification: Implement test evaluation suite running 500 standardized sentences across Japanese, Korean, Thai, Vietnamese, and Mandarin against the formality classification engines.
Acceptance Criteria & Validation: uv run pytest tests/formality/test_rule_evaluator.py -v verifies classification accuracy $\ge 98.5\%$.


**Cluster 8: Prompt Injection Defense & Guardrails (`TASK-171` – `TASK-180`)**


`TASK-171`: Adversarial Prompt Injection & Jailbreak Classifier
Domain / Module: guardrails/injection_classifier.py
Dependencies: None
Technical Specification: Implement fast classifier (regex + lightweight ONNX DeBERTa model) checking user input for injection signatures (*"ignore previous instructions"*, *"you are now DAN"*, *"system prompt override"*, *"pretend you have no rules"*).
Acceptance Criteria & Validation: uv run pytest tests/guardrails/test_injection_classifier.py -v flags 100% of OWASP LLM Top 10 injection test prompts.



`TASK-172`: Delimiter Escaping & System Prompt Sandboxing
Domain / Module: guardrails/prompt_sandbox.py
Dependencies: TASK-171
Technical Specification: Implement PromptSanitizer escaping XML/Markdown delimiters (, , json, ### Human:`) in raw user speech-to-text transcripts before interpolating into the LLM context.
Acceptance Criteria & Validation: uv run pytest tests/guardrails/test_prompt_sandbox.py -v verifies delimiter neutralization.



`TASK-173`: Token Smuggling & Multi-Turn Instruction Override Filter
Domain / Module: guardrails/token_smuggling.py
Dependencies: TASK-171
Technical Specification: Implement TokenSmugglingFilter detecting base64 encoded strings, rot13, unicode homoglyph substitutions, and spaced character evasions (e.g., s y s t e m).
Acceptance Criteria & Validation: uv run pytest tests/guardrails/test_token_smuggling.py -v decodes and sanitizes obfuscated injection attempts.



`TASK-174`: System Prompt Exfiltration & Leakage Blocker
Domain / Module: guardrails/exfiltration_guard.py
Dependencies: None
Technical Specification: Implement ExfiltrationGuard scanning LLM output streams for verbatim leakage of internal instructions, API keys, or prompt template markers. If leakage similarity > 70%, immediately drops the stream and emits a canned persona response.
Acceptance Criteria & Validation: uv run pytest tests/guardrails/test_exfiltration_guard.py -v prevents deliberate prompt extraction attacks.



`TASK-175`: Out-of-Role & Persona Break Detector
Domain / Module: guardrails/persona_guard.py
Dependencies: None
Technical Specification: Implement PersonaGuard monitoring LLM outputs for assistant self-identification (e.g., *"As an AI language model..."*, *"I cannot assist with that..."*). Truncates the turn and regenerates with higher persona constraint temperature.
Acceptance Criteria & Validation: uv run pytest tests/guardrails/test_persona_guard.py -v catches and replaces out-of-character model responses.



`TASK-176`: Structured Output Regex & AST Validation Enforcement
Domain / Module: guardrails/schema_guard.py
Dependencies: TASK-106
Technical Specification: Implement SchemaGuard running AST validation on extracted pedagogical JSON chunks before dispatching to client sockets. Discards invalid keys and fills missing fields with defaults.
Acceptance Criteria & Validation: uv run pytest tests/guardrails/test_schema_guard.py -v ensures zero client runtime JSON parse crashes.



`TASK-177`: Unsafe Code & Script Execution Guard
Domain / Module: guardrails/code_guard.py
Dependencies: None
Technical Specification: Implement CodeExecutionGuard stripping executable scripts (
