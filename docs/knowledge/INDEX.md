---
id: index
title: Knowledge Base Index
track: meta
status: partial
tags: [meta, index, moc]
---

# Asian Language Learning Platform — Knowledge Base

A wikillm-style reorganization of the platform's 1,000-micro-task
specification: small, cross-linked packages instead of one sprawling
document. Every task from the source spec lives in exactly one package
under `modules/`, grouped by the module/domain/sub-track boundary the
source itself uses. Start with whichever track you're touching; each
track page links down to its modules, each module page has the full task
table.

**Read `PACKAGE-FORMAT.md` first** if you're adding or editing a package —
it defines the frontmatter schema and body shape every file here follows.
**Read `ai-agent-docs-guide.md`** before writing task specs or acceptance
criteria; **read `style-guide.md`** before writing any other prose here.

## Completeness at a glance

See `docs/source-specs/README.md` for the full census. Short version: the
source specification itself is truncated, so this knowledge base is too —
faithfully, not padded.

| Track                          | Status      | Coverage                              |
| ------------------------------ | ----------- | ------------------------------------- |
| [[track-01-k8s-infra]]         | ✅ complete | 100/100                               |
| [[track-02-docker-cicd]]       | ✅ complete | 100/100                               |
| [[track-03-python-backend]]    | ✅ complete | 100/100                               |
| [[track-04-tts-audio]]         | ✅ complete | 100/100                               |
| [[track-05-stt-pronunciation]] | ✅ complete | 100/100                               |
| [[track-06-llm-roleplay]]      | ⚠️ partial  | 77/100 (source cuts off mid-TASK-177) |
| [[track-07-srs-engine]]        | ❌ stub     | 0/100 — scope line only               |
| [[track-08-convex-db]]         | ❌ stub     | 0/100 — scope line only               |
| [[track-09-nextjs-frontend]]   | ❌ stub     | 0/100 — scope line only               |
| [[track-10-phrasebook-pwa]]    | ❌ stub     | 0/100 — scope line only               |

**577 of 1,000 tasks** have full extracted detail; the platform's own
allocation table accounts for the rest by scope, not by task body.

## Track 1 — Kubernetes, Cloud Infrastructure & Volterra Edge Mesh

[[track-01-k8s-infra]] · 10 modules, TASK-001–100

1. [[t01-namespaces-governance]] — namespaces, quotas, PSA
2. [[t01-rbac-identity]] — ServiceAccounts, RBAC
3. [[t01-networkpolicies]] — CNI isolation, Cilium
4. [[t01-ingress-gateway]] — Ingress-NGINX
5. [[t01-cert-manager]] — TLS automation
6. [[t01-volterra-edge]] — edge LB, WAF, CDN
7. [[t01-containerization]] — base Dockerfiles
8. [[t01-workload-deployments]] — Deployments, probes
9. [[t01-autoscaling]] — HPA, node scheduling
10. [[t01-observability]] — Prometheus, alerting, CD rollout

## Track 2 — Docker, Multi-Arch Pipelines & CI/CD

[[track-02-docker-cicd]] · 5 sub-tracks, TASK-CI-001–100

1. [[t02-dockerfile-architecture]] — multi-stage builds
2. [[t02-multiarch-buildx]] — buildx, QEMU, GHCR
3. [[t02-security-signing]] — Trivy, SBOMs, Cosign
4. [[t02-ci-quality-gates]] — lint, typecheck, tests, E2E
5. [[t02-cd-rollout-rollbacks]] — staging/prod rollout

## Track 3 — Python 3.13 Backend, FastAPI Core & Gateway

[[track-03-python-backend]] · 10 domains, PY-001–100

1. [[t03-scaffolding-settings]] — uv, pyproject, ruff
2. [[t03-lifespan-connections]] — app lifespan, pools
3. [[t03-structured-logging]] — structlog, correlation IDs
4. [[t03-middleware-suite]] — request pipeline
5. [[t03-rate-limiting]] — Redis token bucket
6. [[t03-exception-architecture]] — RFC 7807/9457 errors
7. [[t03-dependency-injection]] — auth, security primitives
8. [[t03-api-routing-openapi]] — versioning, OpenAPI 3.1
9. [[t03-observability-otel]] — Prometheus, OpenTelemetry
10. [[t03-health-probes-testing]] — healthz/readyz, test infra

## Track 4 — Moonshot TTS, Audio Pipeline, Storage & Streaming

[[track-04-tts-audio]] · 7 modules, TTS-001–100

1. [[t04-moonshot-client-resilience]] — TTS API client
2. [[t04-sentence-boundary-buffering]] — Asian text segmentation
3. [[t04-audio-ingestion-resampling]] — PyAV/FFmpeg decode
4. [[t04-loudness-normalization]] — EBU R128, -16 LUFS
5. [[t04-codecs-streaming]] — encoders, WS/HTTP streaming
6. [[t04-storage-uploads]] — S3/R2, multipart, presigned URLs
7. [[t04-waveform-cdn-observability]] — peaks, caching, metrics

## Track 5 — Speech-to-Text, Pronunciation Scoring & Tone Analysis

[[track-05-stt-pronunciation]] · 5 sub-domains, STT-001–100

1. [[t05-audio-ingestion-vad]] — ingestion, Silero VAD
2. [[t05-whisper-inference-alignment]] — Faster-Whisper INT8/FP16
3. [[t05-phoneme-g2p]] — grapheme-to-phoneme
4. [[t05-pitch-tone-classification]] — Yin F0 pitch tracking
5. [[t05-dtw-pronunciation-scoring]] — DTW acoustic alignment

## Track 6 — Edge LLM Orchestration, Voice Roleplay & Prompt Engineering

[[track-06-llm-roleplay]] · 8 clusters, TASK-101–177 (⚠️ partial, of 101–200)

1. [[t06-llm-inference-core]] — vLLM/Ollama client, KV cache
2. [[t06-websocket-protocol]] — duplex streaming, connection mgmt
3. [[t06-scenario-fsm]] — travel scenario state machines
4. [[t06-prompt-personas]] — system prompts, few-shot exemplars
5. [[t06-difficulty-adaptation]] — dynamic difficulty scaling
6. [[t06-pedagogical-correction]] — grammar/particle correction
7. [[t06-formality-cultural-grading]] — Keigo/Banmal register grading
8. [[t06-guardrails-injection-defense]] — prompt injection defense (⚠️ ends mid-task)

## Tracks 7–10 — scope-only stubs

No task-level detail exists in the source document for these. Each page
below states exactly what's known (the one-line scope from the allocation
table) and what's missing.

- [[track-07-srs-engine]] — FSRS v4.5, SM-2 fallback, leech quarantine
- [[track-08-convex-db]] — Convex schema, 15+ tables, crons
- [[track-09-nextjs-frontend]] — the app scaffolded at `apps/web` in this repo
- [[track-10-phrasebook-pwa]] — offline PWA, 500+ situational phrases

## Architecture decisions

- [[adr-0001-android-kotlin]] — if a native Android app is built, it's Kotlin/Compose, not Java/Flutter/RN. Scaffold already exists at `apps/android/`.
- [[adr-0002-ios-swift]] — if a native iOS app is built, it's Swift 6.2+/SwiftUI. Scaffold already exists at `apps/ios/` (XcodeGen, not a committed `.xcodeproj`).

## Meta

- [[PACKAGE-FORMAT]] — the schema every package in this base follows
- [[style-guide]] — documentation writing rules (ASD-STE100-derived)
- [[ai-agent-docs-guide]] — writing rules for agent-consumed docs specifically
- [[glossary]] — domain terms
- `docs/source-specs/README.md` — provenance and the full completeness census
- `CONTRIBUTING.md` — dev setup, everyday commands, git hooks, branching
- `SECURITY.md` — what "public except Convex data" actually means
