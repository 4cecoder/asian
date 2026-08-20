---
id: t01-cert-manager
title: "Module 5: Cert-Manager, Automated TLS & Key Management"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-041–TASK-050"
status: complete
tags: [k8s, cert-manager, tls, letsencrypt, dns-01]
related: [t01-ingress-gateway, t01-volterra-edge]
---

# Module 5: Cert-Manager, Automated TLS & Key Management

Automated TLS lifecycle via cert-manager: staging and production Let's
Encrypt ClusterIssuers (HTTP-01), a DNS-01 issuer for wildcard SANs,
per-environment Certificate resources, expiry alerting, TLS 1.3-only
cipher hardening, cross-namespace secret mirroring, and a scriptable
handshake/expiry health check.

## Tasks

| ID       | Title                                                              | Depends on         | Spec (condensed)                                                                                                                                                                                                    | Acceptance check                                                                                       |
| -------- | ------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| TASK-041 | Cert-Manager Helm Deployment with Prometheus Metrics               | None               | Create `helm/cert-manager/values.yaml`: `installCRDs: true`, `prometheus.enabled: true`, `replicaCount: 2`.                                                                                                         | `helm template cert-manager jetstack/cert-manager -f helm/cert-manager/values.yaml` validates cleanly. |
| TASK-042 | Let's Encrypt Staging ACME ClusterIssuer (HTTP-01 Solver)          | TASK-041           | Create `k8s/cert-manager/issuer-staging.yaml`: server `https://acme-staging-v02.api.letsencrypt.org/directory`, solver `http01.ingress.class: nginx`.                                                               | `kubectl apply -f k8s/cert-manager/issuer-staging.yaml` registers ClusterIssuer in `Ready: True`.      |
| TASK-043 | Let's Encrypt Production ACME ClusterIssuer (HTTP-01 Solver)       | TASK-041           | Create `k8s/cert-manager/issuer-prod.yaml`: server `https://acme-v02.api.letsencrypt.org/directory`, `privateKeySecretRef: letsencrypt-prod-account-key`.                                                           | ClusterIssuer registers and reports valid Let's Encrypt registration.                                  |
| TASK-044 | DNS-01 Solver ClusterIssuer for Wildcard SANs (Vultr / Cloudflare) | TASK-041           | Create `k8s/cert-manager/issuer-dns01.yaml`, using the API token in `k8s/cert-manager/dns-secret.yaml` for automated TXT record resolution.                                                                         | DNS-01 solver completes validation for `*.lingo.yourdomain.com`.                                       |
| TASK-045 | Production TLS Certificate Resource for Application Domains        | TASK-043           | Create `k8s/base/certificate-prod.yaml` in `lingo-prod`: `secretName: lingo-tls-cert`, `dnsNames: ["lingo.yourdomain.com", "api.lingo.yourdomain.com"]`, `issuerRef.name: letsencrypt-prod` (kind `ClusterIssuer`). | `kubectl describe certificate lingo-tls-cert -n lingo-prod` shows `CertificateIssued: True`.           |
| TASK-046 | Staging TLS Certificate Resource for Pre-Production Validation     | TASK-042           | Create `k8s/overlays/staging/certificate.yaml` targeting the staging issuer.                                                                                                                                        | Staging certificate creates its secret without touching Let's Encrypt production rate limits.          |
| TASK-047 | Automated Certificate Renewal & Expiry Alerting Configuration      | TASK-045           | Create `k8s/observability/prometheus-cert-alerts.yaml`: alert `CertExpiryLessThan15Days` fires when `certmanager_certificate_expiration_timestamp_seconds - time() < 1296000`.                                      | `promtool check rules k8s/observability/prometheus-cert-alerts.yaml` passes.                           |
| TASK-048 | TLS Cipher Suites & Modern TLS 1.3 Strict Enforcement              | TASK-031, TASK-045 | In Ingress-NGINX values, set `ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384"`, `ssl-protocols: "TLSv1.2 TLSv1.3"`.              | SSL Labs / `testssl.sh` confirms SSLv3, TLS 1.0, TLS 1.1 fully disabled.                               |
| TASK-049 | Secret Synchronizer / Reflector for Wildcard Cert Sharing          | TASK-045           | Create `k8s/cert-manager/reflector-config.yaml` using Emberstack Reflector annotations to mirror `lingo-tls-cert` into development and monitoring namespaces.                                                       | Updated secret in `lingo-prod` propagates to mirror namespaces in < 5 seconds.                         |
| TASK-050 | TLS Handshake & Certificate Expiry Automated Health Check          | TASK-041…TASK-049  | Create `scripts/verify-tls.sh` using `openssl s_client` to verify certificate subject, days-remaining validity, and TLS 1.3 cipher negotiation.                                                                     | Script exits 0, prints full certificate chain details.                                                 |

## Related packages

- [[t01-ingress-gateway]] — Ingress resources that consume `lingo-tls-cert`.
- [[t01-volterra-edge]] — edge mesh layer TLS terminates behind.
