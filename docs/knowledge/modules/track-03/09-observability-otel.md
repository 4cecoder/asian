---
id: t03-observability-otel
title: "Domain 9: Observability, Prometheus Metrics & OpenTelemetry"
track: "Track 3: Python 3.13 Backend Architecture, FastAPI Core & API Gateway"
task_range: "PY-081–PY-090"
status: complete
tags: [python, prometheus, opentelemetry, metrics, tracing]
related: [t03-structured-logging, t03-lifespan-connections]
---

# Domain 9: Observability, Prometheus Metrics & OpenTelemetry

A Prometheus metrics registry (HTTP + business metrics) plus a full OTel
tracing stack: tracer provider, OTLP exporter, FastAPI + httpx
auto-instrumentation, and custom span decorators for AI-specific business
logic (TTS synthesis, LLM inference).

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| PY-081 | Prometheus metrics registry & collectors | PY-005 | Create `app/core/metrics.py`: custom `CollectorRegistry`. Metrics: `http_requests_total(method, path, status_code)` Counter, `http_request_duration_seconds(method, path)` Histogram (buckets `0.005–10.0`), `http_requests_in_progress(method, path)` Gauge. | Registry initializes with zero namespace conflicts. `uv run pytest tests/core/test_metrics_registry.py`. |
| PY-082 | Prometheus HTTP metrics middleware | PY-081 | `PrometheusMetricsMiddleware` records duration, status, in-flight gauge. Normalize dynamic path params (`/decks/123` → `/decks/{id}`). | Path normalization prevents cardinality explosion. `uv run pytest tests/middleware/test_metrics_middleware.py`. |
| PY-083 | Domain-specific business metric collectors | PY-081 | `tts_synthesis_duration_seconds(language, voice_id)`, `stt_transcription_duration_seconds(language)`, `srs_reviews_processed_total(rating, language)`, `active_voice_roleplay_sessions` Gauge. | Business events increment the right metrics. `uv run pytest tests/core/test_business_metrics.py`. |
| PY-084 | OTel tracer provider & resource setup | PY-005 | Create `app/core/tracer.py`: `TracerProvider(resource=Resource.create({"service.name": "lingo-python-api", "service.version": VERSION}))`, set as global provider. | Tracer initializes with configured service metadata. `uv run pytest tests/core/test_tracer_init.py`. |
| PY-085 | OTLP exporter & sampler config | PY-084 | `BatchSpanProcessor(OTLPSpanExporter(endpoint=OTEL_EXPORTER_OTLP_ENDPOINT))`. `ParentBasedTraceIdRatioBasedSampler(rate=1.0 dev / 0.1 prod)`. | Batch processor exports spans async, without blocking request loops. `uv run pytest tests/core/test_span_exporter.py`. |
| PY-086 | FastAPI OTel auto-instrumentation | PY-084, PY-085 | `FastAPIInstrumentor.instrument_app(app, tracer_provider=..., excluded_urls="healthz,readyz,metrics")`. | Incoming requests auto-create root spans with HTTP attributes. `uv run pytest tests/core/test_fastapi_instrumentation.py`. |
| PY-087 | Custom span decorators for AI logic | PY-084 | `@trace_span(name="tts.synthesize", attributes={"service": "moonshot"})` wraps sync/async business functions. | Wrapped functions create child spans on the active trace. `uv run pytest tests/core/test_tracing_decorators.py`. |
| PY-088 | HTTP client OTel instrumentation | PY-012, PY-084 | `HTTPXClientInstrumentor` injects W3C `traceparent` headers into outgoing requests to Moonshot and other external APIs. | Outgoing requests propagate distributed trace context. `uv run pytest tests/core/test_http_tracer.py`. |
| PY-089 | Prometheus scrape endpoint (`GET /metrics`) | PY-081 | `GET /metrics` returns `Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)`. | Returns standard Prometheus exposition text. `uv run pytest tests/routers/test_metrics_endpoint.py`. |
| PY-090 | Metrics & tracing integration test suite | PY-081–PY-089 | Requests asserted to increment metric counters and record trace spans, no memory leaks. | 100% verification of metric updates and trace generation. `uv run pytest tests/core/test_observability_suite.py`. |

## Related packages
- [[t03-structured-logging]] — shares trace/span context with logs
- [[t03-lifespan-connections]] — tracer/exporter initialize during app lifespan
