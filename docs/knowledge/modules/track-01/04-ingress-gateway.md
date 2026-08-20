---
id: t01-ingress-gateway
title: "Module 4: Ingress-NGINX & Gateway Traffic Architecture"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-031–TASK-040"
status: complete
tags: [k8s, ingress-nginx, websocket, rate-limiting, tls]
related: [t01-networkpolicies, t01-cert-manager]
---

# Module 4: Ingress-NGINX & Gateway Traffic Architecture

Configures the single Ingress-NGINX controller that fronts both the Next.js
frontend and the Python worker: HA replica count, audio-upload-sized proxy
buffers, long-lived WebSocket timeouts for roleplay sessions, real client
IP preservation behind Volterra edge, host/path routing, abuse rate
limiting, graceful 5xx fallback, and compression.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-031 | Ingress-NGINX Controller Helm Values Customization | None | Create `helm/ingress-nginx/values.yaml`: `controller.replicaCount: 2`, `controller.minAvailable: 1`, `controller.allowSnippetAnnotations: "false"` (hardens against snippet-execution CVEs), `controller.metrics.enabled: "true"`, `controller.service.externalTrafficPolicy: "Local"`. | `helm template ingress-nginx ingress-nginx/ingress-nginx -f helm/ingress-nginx/values.yaml` generates valid manifests. |
| TASK-032 | Proxy Buffer & Body Size Tuning for Audio Payloads | TASK-031 | Update `helm/ingress-nginx/values.yaml`: `proxy-body-size: "25m"` (voice audio uploads), `proxy-buffer-size: "128k"`, `proxy-buffers-number: "4"`, `client-header-buffer-size: "64k"`. | Uploading a 20MB WAV test payload through Ingress passes without HTTP 413. |
| TASK-033 | WebSocket Long-Lived Connection Timeouts Configuration | TASK-031 | Create `k8s/base/ingress-worker.yaml` annotations: `nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"`, `proxy-send-timeout: "3600"`, `websocket-services: "lingo-worker-service"`. | WebSocket sessions stay active > 30 minutes during roleplay pauses, no timeout disconnect. |
| TASK-034 | Client Real-IP & X-Forwarded-For Header Preservation | TASK-031 | Set `use-forwarded-headers: "true"`, `compute-full-forwarded-for: "true"` in `helm/ingress-nginx/values.yaml`. | Python worker logs show original client IP forwarded from Volterra edge nodes. |
| TASK-035 | Ingress Resource for Frontend Routing (`lingo.yourdomain.com`) | TASK-031 | Create `k8s/base/ingress-frontend.yaml`: host `lingo.yourdomain.com`, path `/` → `lingo-frontend-service:80`, TLS secret `lingo-tls-cert`. | `kubectl apply --dry-run=client -f k8s/base/ingress-frontend.yaml -n lingo-prod` passes. |
| TASK-036 | Ingress Resource for Python Worker API & WebSockets | TASK-031, TASK-033 | Create `k8s/base/ingress-worker.yaml`: host `lingo.yourdomain.com`, paths `/api/py` and `/ws` → `lingo-worker-service:8000`. | Ingress routes `/` to Next.js frontend and `/api/py/*` to FastAPI backend seamlessly. |
| TASK-037 | Ingress Rate Limiting Annotations for Abuse Mitigation | TASK-036 | Add to `k8s/base/ingress-worker.yaml`: `limit-rps: "20"`, `limit-connections: "10"`, `limit-burst-multiplier: "3"`. | Exceeding 60 req/sec triggers HTTP 429 from Ingress controller. |
| TASK-038 | Custom Error Pages & 5xx Upstream Fallback Routing | TASK-035 | Create `k8s/base/ingress-custom-errors.yaml`: `custom-http-errors: "502,503,504"` routed to an offline travel maintenance page. | Backend downtime serves the graceful static fallback page, not raw NGINX error. |
| TASK-039 | Gzip & Brotli Compression Annotations for API Payloads | TASK-035 | Enable `enable-brotli: "true"`, `enable-gzip: "true"` for MIME types `application/json`, `text/html`, `application/javascript`, `text/css` in `helm/ingress-nginx/values.yaml`. | Response header shows `Content-Encoding: gzip` or `br` for JSON payloads > 1KB. |
| TASK-040 | Ingress Traffic Conformance & Routing Header Verification Script | TASK-031…TASK-039 | Create `scripts/test-ingress-routing.sh`: cURL probes across every hostname/path prefix. | Validates status codes, TLS handshake, and header preservation across all endpoints. |

## Related packages
- [[t01-networkpolicies]] — network rules that gate traffic reaching this ingress layer.
- [[t01-cert-manager]] — issues the `lingo-tls-cert` secret this module's Ingress resources consume.
