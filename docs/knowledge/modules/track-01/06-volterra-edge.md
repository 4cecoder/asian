---
id: t01-volterra-edge
title: "Module 6: Volterra (F5 Distributed Cloud) Edge Mesh & CDN"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-051–TASK-065"
status: complete
tags: [volterra, cdn, waf, edge, tls, ddos]
related: [t01-ingress-gateway, t01-cert-manager, t01-observability]
---

# Module 6: Volterra (F5 Distributed Cloud) Edge Mesh & CDN

Everything in front of the Kubernetes cluster: Volterra origin pool +
health monitor pointed at the K8s Ingress, an HTTP load balancer for
`lingo.yourdomain.com`, a blocking-mode WAF, edge caching split by asset
type (static Next.js assets vs. range-request audio), a no-cache
WebSocket/API bypass route, bot defense, DNS delegation, multi-region
failover, TLS termination/HSTS, security-event export to SIEM, synthetic
uptime monitoring, and a validation script tying it all together.

## Tasks

| ID       | Title                                                             | Depends on         | Spec (condensed)                                                                                                                                                                                 | Acceptance check                                                                                                                        |
| -------- | ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| TASK-051 | Volterra Origin Pool Specification for Vultr K8s Ingress          | TASK-035, TASK-045 | Create `volterra/origin-pool.json`: `name: lingo-k8s-origin`, origin servers = public IP/CNAME of K8s Ingress nodes, `port: 443`, `use_tls: true`, `tls_config.skip_server_verification: false`. | `jq . volterra/origin-pool.json` returns valid structure (Volterra API client schema check).                                            |
| TASK-052 | Origin Pool Health Monitor (TCP & HTTP GET `/healthz`)            | TASK-051           | Create `volterra/health-monitor.json`: type HTTP, path `/healthz`, expected status 200, interval 10s, timeout 3s, healthy threshold 2, unhealthy threshold 3.                                    | Volterra console/API reports Origin Pool status `HEALTHY`.                                                                              |
| TASK-053 | Volterra HTTP Load Balancer Base Configuration                    | TASK-051, TASK-052 | Create `volterra/http-loadbalancer.json`: domains `["lingo.yourdomain.com"]`, downstream HTTPS with auto-certificate, default origin pool `lingo-k8s-origin`.                                    | `volterra-cli apply -f volterra/http-loadbalancer.json` creates an active load balancer object.                                         |
| TASK-054 | Web Application Firewall (WAF) Policy in Blocking Mode            | TASK-053           | Create `volterra/waf-policy.json`: App Firewall in `BLOCKING` mode, high sensitivity vs. SQLi, XSS, command injection, malicious user agents.                                                    | `curl "https://lingo.yourdomain.com/?id=1%20OR%201=1"` (simulated SQLi) returns HTTP 403 from Volterra Edge.                            |
| TASK-055 | Volterra Edge Caching Rules for Static Next.js Assets             | TASK-053           | Create `volterra/cache-rules-static.json`: route `/_next/static/*`, cache TTL 2592000s (30 days), honor client Cache-Control `false`, strip cookie headers `true`.                               | JS/CSS asset response header shows `x-volterra-cache: HIT`.                                                                             |
| TASK-056 | Volterra Edge Caching Rules for Audio Assets (`/audio/*`, `.mp3`) | TASK-053           | Create `volterra/cache-rules-audio.json`: match `/audio/*`, `*.mp3`, `*.opus`; cache TTL 604800s (7 days); range request support `true` (enables byte-range audio streaming).                    | Repeated audio downloads return `x-volterra-cache: HIT` with `Accept-Ranges: bytes`.                                                    |
| TASK-057 | Volterra Dynamic API Route Bypass & WebSocket Proxying            | TASK-053           | Create `volterra/routes-dynamic.json`: paths `/api/*`, `/ws/*`; cache `NO_CACHE`; WebSocket support enabled; idle timeout 3600s.                                                                 | Real-time WebSocket connection to voice roleplay endpoint establishes and holds persistent streaming state through Volterra edge nodes. |
| TASK-058 | Volterra Rate Limiting & Bot Defense Layer Configuration          | TASK-053           | Create `volterra/bot-defense.json`: JavaScript challenge for untrusted scrapers, IP rate limit 100 requests/minute per client.                                                                   | Headless bot scraper gets a challenge page; legitimate browser passes cleanly.                                                          |
| TASK-059 | Custom Domain DNS Delegation & CNAME Routing Specification        | TASK-053           | Create `volterra/dns-delegation.md` documenting the CNAME from `lingo.yourdomain.com` to the Volterra tenant edge endpoint (`lingo.ves.volterra.io`).                                            | `dig CNAME lingo.yourdomain.com` resolves to the Volterra edge domain.                                                                  |
| TASK-060 | Multi-Region Edge Failover & Zero-Downtime Origin Switching       | TASK-051, TASK-053 | Update `volterra/origin-pool.json` with a backup origin pool pointed at a secondary cluster region, automatic health-check failover weighting.                                                   | Simulated primary-cluster outage shifts edge traffic to the backup pool in < 5 seconds.                                                 |
| TASK-061 | Volterra Client TLS Termination & Modern Cipher Profile           | TASK-053           | Configure TLS Termination Profile in `volterra/http-loadbalancer.json`: automatic certificate renewal, TLS 1.3 preference.                                                                       | SSL Labs scan of `lingo.yourdomain.com` achieves an A+ rating.                                                                          |
| TASK-062 | HTTP-to-HTTPS Automatic Redirect & HSTS Header Injection          | TASK-053           | In `volterra/http-loadbalancer.json`: `http_redirect: true`, inject header `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.                                            | `curl -I http://lingo.yourdomain.com` returns HTTP 301 to HTTPS with the HSTS header present.                                           |
| TASK-063 | Volterra Security Events & Threat Analytics Export                | TASK-054, TASK-058 | Create `volterra/log-receiver.json`: HTTP log streaming to Grafana Loki / SIEM endpoint for real-time edge security telemetry.                                                                   | Blocked WAF security events reach the log ingestion pipeline within 10 seconds.                                                         |
| TASK-064 | Volterra Synthetic Uptime Monitor & Alerting Webhooks             | TASK-053           | Create `volterra/synthetic-monitor.json`: global multi-region HTTP probes every 60s; webhook alert if global availability drops below 99.9%.                                                     | Synthetic probe logs are visible in the Volterra observability dashboard.                                                               |
| TASK-065 | Automated Volterra API Configuration Verification Script          | TASK-051…TASK-064  | Create `scripts/verify-volterra.sh`: query the Volterra REST API to assert status of origin pools, load balancers, WAF rules, cache hit ratios.                                                  | Script outputs a JSON validation report confirming 100% operational health across all edge policies.                                    |

## Related packages

- [[t01-ingress-gateway]] — origin the Volterra pool points at.
- [[t01-cert-manager]] — cluster-side TLS this module's edge TLS sits in front of.
- [[t01-observability]] — where security-event and synthetic-monitor telemetry ultimately lands.
