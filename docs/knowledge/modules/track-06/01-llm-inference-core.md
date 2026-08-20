---
id: t06-llm-inference-core
title: "Cluster 1: Edge LLM Inference Core & Streaming Protocols"
track: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
task_range: "TASK-101–TASK-110"
status: complete
tags: [llm, vllm, ollama, streaming, backend]
related: [t06-websocket-protocol, t05-whisper-inference-alignment]
---

# Cluster 1: Edge LLM Inference Core & Streaming Protocols

The base LLM client layer everything else in Track 6 sits on top of: an
async client for local vLLM/Ollama, model routing, token-stream sentence
segmentation, telemetry, a circuit breaker, structured-output enforcement,
KV-cache-friendly prompt structuring, sampling control, concurrency
limiting, and health checks.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-101 | Async vLLM / Ollama OpenAI-Compatible Client Wrapper | None | `core/llm/client.py`: `AsyncEdgeLLMClient` wraps `httpx.AsyncClient`, streams `/v1/chat/completions` for local vLLM/Ollama. Timeouts: connect 2.0s, read 15.0s. Connection pool: max 100 keepalive. | `uv run pytest tests/llm/test_client.py -v` verifies streaming yields, connection reuse, exception mapping for `HTTPStatusError`/`ConnectTimeout`. |
| TASK-102 | Edge Model Registry & Multi-Model Routing Strategy | TASK-101 | `core/llm/registry.py`: `ModelRegistry` maps tasks to models (roleplay-fast: Qwen-2.5-7B-Instruct, pedagogy-analysis: DeepSeek-R1-Distill-8B, safety-filter: Llama-3.2-3B). Fallback routing on primary health-probe failure. | `uv run pytest tests/llm/test_registry.py -v` verifies routing resolution and automatic fallback. |
| TASK-103 | Token Stream Chunking, Buffering & Punctuation Segmenter | TASK-101 | `core/llm/stream_buffer.py`: `TokenStreamSegmenter` accumulates token deltas, segments sentences on Asian delimiters (。！？\n) and Western punctuation. Emits complete sentences to TTS buffer while streaming raw tokens to UI. | `uv run pytest tests/llm/test_stream_buffer.py -v` verifies exact chunk boundaries across mixed JA/EN and TH/EN streams. |
| TASK-104 | Time-to-First-Token (TTFT) & Tokens-per-Second (TPS) Telemetry Monitor | TASK-101 | `core/llm/telemetry.py`: `InferenceTelemetryTracker` records request/first-token timestamps, completion duration, token count. Exposes `llm_ttft_seconds` (histogram), `llm_tps_rate` (gauge). | `uv run pytest tests/llm/test_telemetry.py -v` validates metric accuracy under 50ms/150ms simulated delay. |
| TASK-105 | Fallback Engine, Circuit Breaker & Timeout Watchdog | TASK-101, TASK-102 | `core/llm/circuit_breaker.py`: `LLMCircuitBreaker`, sliding window of 20 requests. Failure rate > 25% or p95 TTFT > 3.0s ⇒ CLOSED→OPEN, route to backup endpoints or cached fallback utterances. | `uv run pytest tests/llm/test_circuit_breaker.py -v` verifies CLOSED→OPEN→HALF-OPEN transitions and fallback dispatch. |
| TASK-106 | Structured JSON Output Enforcement via Grammar & Pydantic | TASK-101 | `core/llm/structured_output.py`: `StructuredOutputExtractor` wraps LLM calls with JSON schema constraints (vLLM guided decoding or regex grammar). Strict Pydantic parsing with schema-correction retry on parse failure. | `uv run pytest tests/llm/test_structured_output.py -v` validates schema adherence on malformed/truncated JSON. |
| TASK-107 | Token KV Cache Management & Prefix Caching Optimizer | TASK-101 | `core/llm/kv_cache.py`: `PrefixCacheOptimizer` places static system-prompt prefixes (persona, cultural constraints, scenario rules) at context top to maximize vLLM automatic prefix KV-cache reuse across turns. | `uv run pytest tests/llm/test_kv_cache.py -v` asserts static prefixes keep bitwise-identical hash signatures across turns. |
| TASK-108 | Temperature & Top-P Dynamic Decay Scheduler | TASK-101 | `core/llm/sampling.py`: `SamplingScheduler` adjusts sampling per turn/scenario type — creative roleplay (temp 0.75, top_p 0.90) vs pedagogical correction extraction (temp 0.1, top_p 0.2). | `uv run pytest tests/llm/test_sampling.py -v` verifies parameter injection per scenario mode. |
| TASK-109 | Async Connection Pool & Semaphore Request Limiter | TASK-101 | `core/llm/pool.py`: `InferenceConcurrencyLimiter` uses `asyncio.Semaphore` bounded by node GPU/CPU capacity. Queues excess turns, max queue timeout 5.0s, then graceful retry notice. | `uv run pytest tests/llm/test_pool.py -v` verifies queue draining and timeout rejection under 100 simultaneous requests. |
| TASK-110 | Edge Inference Health Checker & Warmup Endpoint | TASK-101, TASK-102 | `core/llm/health.py`: `GET /api/v1/llm/health` plus background startup warmup dispatching a 5-token completion at boot to fully allocate model weights/KV cache before live traffic. | `curl -f http://localhost:8000/api/v1/llm/health` returns HTTP 200 with model ready states. |

## Related packages
- [[t06-websocket-protocol]] — carries this cluster's token stream to the client over the wire.
- [[t05-whisper-inference-alignment]] — analogous inference-engine-loader pattern (STT-021) on the STT side.
