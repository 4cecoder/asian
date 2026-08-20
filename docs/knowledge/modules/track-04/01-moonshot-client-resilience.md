---
id: t04-moonshot-client-resilience
title: "Module 1: Moonshot TTS API Client & Network Resilience"
track: "Track 4: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming"
task_range: "TTS-001–TTS-015"
status: complete
tags: [tts, moonshot, resilience, circuit-breaker]
related: [t04-sentence-boundary-buffering, t04-codecs-streaming]
---

# Module 1: Moonshot TTS API Client & Network Resilience

The resilient async client that talks to the Moonshot TTS API: config,
pooled HTTP sessions, a voice registry for 5 languages, retry/backoff,
circuit breaker, a token-bucket limiter, streaming + non-streaming
synthesis, an in-memory dedup cache, and a mock adapter for offline tests.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TTS-001 | Core Moonshot TTS config schema | None | `backend/app/core/tts/config.py`. `MoonshotTTSConfig(BaseSettings)`: `api_key: SecretStr`, `base_url: HttpUrl = "https://api.moonshot.cn/v1"`, `timeout_seconds=15.0`, `max_connections=100`, `max_keepalive_connections=20`, `default_voice="moonshot-v1-zh-female"`, `default_speed=1.0`, `default_audio_format="mp3"`. | `MOONSHOT_API_KEY`/`MOONSHOT_BASE_URL` env vars parse into immutable typed settings. `uv run pytest tests/tts/test_config.py`. |
| TTS-002 | Async HTTP session & connection pool manager | TTS-001 | `backend/app/core/tts/session.py`. Singleton `TTSClientSessionManager` with `httpx.AsyncClient`, `httpx.Limits(max_connections=100, max_keepalive_connections=20, keepalive_expiry=30.0)`, `httpx.Timeout(15.0, connect=3.0)`. `startup()`/`shutdown()` lifecycle hooks. | Session pool reuses TCP sockets on sequential calls, no leaked file descriptors. `uv run pytest tests/tts/test_session_pool.py`. |
| TTS-003 | Voice ID catalog & language-gender registry | None | `backend/app/core/tts/voices.py`. `VoiceProfile` dataclass (`voice_id`, `language_code`, `gender`, `accent_region`, `recommended_speed`, `style_tags`). `VoiceRegistry` maps `zh, ja, th, vi, ko` to voice profiles. `get_voice_for_language(lang, gender="female")` with deterministic fallback. | Registry resolves valid voice IDs for all 5 target languages. `uv run pytest tests/tts/test_voices.py`. |
| TTS-004 | Request/response Pydantic v2 DTOs | None | `backend/app/schemas/tts.py`. `MoonshotTTSRequest(model="moonshot-tts-v1", input, voice, response_format="mp3"\|"wav"\|"opus", speed)`. `TTSGenerationResult(audio_bytes, content_type, duration_seconds, sample_rate, voice_id, cached)`. Text length 1–1000 chars. | Rejects empty text or speed outside 0.5–2.0. `uv run pytest tests/tts/test_schemas.py`. |
| TTS-005 | Low-level HTTP dispatcher with header signing | TTS-001, TTS-002, TTS-004 | `backend/app/core/tts/dispatcher.py`. `dispatch_tts_request(payload, client) -> httpx.Response`. Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`, `User-Agent: LingoApp-AudioEngine/1.0`. | POSTs to `/audio/speech`, captures the raw response stream. `uv run pytest tests/tts/test_dispatcher.py`. |
| TTS-006 | Tenacity exponential backoff for 429/5xx | TTS-005 | `backend/app/core/tts/retry.py`. `stop_after_attempt(4)`, `wait_random_exponential(multiplier=0.5, max=5.0)`. Retries on HTTP 429/502/503/504 and `httpx.ConnectTimeout`. | Simulated 429 triggers backoff, succeeds on a later mock 200. `uv run pytest tests/tts/test_retry.py`. |
| TTS-007 | Circuit breaker state machine | TTS-006 | `backend/app/core/tts/circuit_breaker.py`. `TTSCircuitBreaker` states `CLOSED/OPEN/HALF_OPEN`. Trips to OPEN for 30s at ≥50% failure rate over 20 consecutive requests. Raises `CircuitBreakerOpenException`. | Rapid 500s trip the breaker OPEN and fast-fail subsequent calls. `uv run pytest tests/tts/test_circuit_breaker.py`. |
| TTS-008 | Sliding-window token bucket limiter | None | `backend/app/core/tts/rate_limiter.py`. In-memory `TokenBucketRateLimiter(rate=20.0, capacity=40.0)`. `async def acquire(tokens=1) -> float` computes sleep time when depleted. | Keeps concurrency under Moonshot's upstream QPS limit. `uv run pytest tests/tts/test_rate_limiter.py`. |
| TTS-009 | Non-streaming raw audio synthesis | TTS-005, TTS-006, TTS-007, TTS-008 | `MoonshotTTSClient.synthesize_speech(text, voice_id, speed=1.0) -> bytes`, running through the rate limiter, retry wrapper, and circuit breaker. | Returns a complete audio byte buffer for phrases < 200 chars. `uv run pytest tests/tts/test_client_sync.py`. |
| TTS-010 | Chunk-encoded async streaming consumer | TTS-005 | `backend/app/core/tts/streaming.py`. `stream_speech_bytes(text, voice_id) -> AsyncGenerator[bytes, None]` via `response.aiter_bytes(chunk_size=4096)`, minimizing time-to-first-byte. | Yields partial audio buffers as they arrive. `uv run pytest tests/tts/test_streaming_consumer.py`. |
| TTS-011 | Pitch, speed & emotion parameter mapper | TTS-004 | `backend/app/core/tts/modulators.py`. `TTSParameterModulator.build_payload(text, voice, speed, pitch_shift=0.0)`. Clamp speed to `[0.75, 1.25]` for comprehension. | Produces spec-compliant Moonshot API JSON. `uv run pytest tests/tts/test_modulators.py`. |
| TTS-012 | In-memory SHA-256 dedup cache | TTS-004 | `backend/app/core/tts/cache.py`. `TTSMemoryCache`, LRU, key `sha256(text + voice_id + str(speed) + format)`, 256MB max with eviction metrics. | Identical requests return cached audio with 0ms network latency. `uv run pytest tests/tts/test_memory_cache.py`. |
| TTS-013 | Fallback voice selector on deprecation | TTS-003 | `backend/app/core/tts/fallback.py`. `FallbackVoiceManager.resolve_fallback(requested_voice, error_code)`. On 404/400 (deprecated), picks the next best compatible voice for the locale. | Retired/invalid voice IDs handled without a 500 bubbling to the user. `uv run pytest tests/tts/test_fallback.py`. |
| TTS-014 | Mock adapter for unit testing | TTS-009 | `backend/app/tests/mocks/tts_mock.py`. `MockMoonshotTTSClient` produces deterministic synthetic MP3/WAV byte streams with valid headers; configurable latency, failure injection, rate-limit triggers. | Enables fully offline testing across upstream-dependent services. `uv run pytest tests/tts/test_mock_adapter.py`. |
| TTS-015 | Health check ping probe | TTS-009 | `backend/app/core/tts/health.py`. `verify_moonshot_health() -> HealthStatusReport` synthesizes a 1-syllable word ("Hai"/"Ni"), reports round-trip latency, breaker status, token bucket level. | Sub-system health endpoint returns 200 OK or 503. `uv run pytest tests/tts/test_health.py`. |

## Related packages
- [[t04-sentence-boundary-buffering]] — feeds punctuated text into this client
- [[t04-codecs-streaming]] — consumes the raw/streamed audio this module returns
