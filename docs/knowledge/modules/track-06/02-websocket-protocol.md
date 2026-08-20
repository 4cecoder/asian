---
id: t06-websocket-protocol
title: "Cluster 2: WebSocket Protocol & Real-Time Event Loop"
track: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
task_range: "TASK-111–TASK-120"
status: complete
tags: [websockets, streaming, backend, real-time]
related: [t06-llm-inference-core, t05-dtw-pronunciation-scoring]
---

# Cluster 2: WebSocket Protocol & Real-Time Event Loop

The duplex transport layer for live roleplay: frame schemas, connection
management, interleaved token/audio streaming, user barge-in handling,
heartbeats/reconnect, rate limiting, session-state sync, VAD-driven
turn-end detection, jitter compensation, and error handling.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-111 | WebSocket Binary / JSON Multiplexed Frame Schema | None | `websockets/schemas.py`: Pydantic models. Inbound: `AUDIO_CHUNK` (binary Opus/PCM), `TEXT_MESSAGE`, `INTERRUPT_SIGNAL`, `SCENARIO_CONFIG`. Outbound: `TRANSCRIPTION_DELTA`, `LLM_TOKEN_DELTA`, `TTS_AUDIO_STREAM` (binary), `CORRECTION_PAYLOAD`, `STATE_TRANSITION`, `SESSION_ERROR`. | `uv run pytest tests/websockets/test_schemas.py -v` validates serialization/deserialization of all frame variants. |
| TASK-112 | Bidirectional Connection Manager with Session Affinity | TASK-111 | `websockets/connection_manager.py`: `WebSocketConnectionManager` indexes sockets by `session_id`/`user_id`, tracks health and background tasks, cleans up on drops. | `uv run pytest tests/websockets/test_connection_manager.py -v` asserts registration/broadcast/teardown across 50 simulated connections. |
| TASK-113 | Interleaved Token & Audio Chunk Streaming Pipeline | TASK-103, TASK-111, TASK-112 | `websockets/stream_pipeline.py`: `StreamMultiplexer` coordinates concurrent UTF-8 text tokens (subtitle UI) and binary TTS audio packets on one connection, with sequence numbers preventing desync. | `uv run pytest tests/websockets/test_stream_pipeline.py -v` verifies packet sequencing, zero race conditions. |
| TASK-114 | User Barge-In / Interruption Cancellation Handler | TASK-112, TASK-113 | `websockets/barge_in.py`: `BargeInController`. On user speech during AI TTS playback: capture `INTERRUPT_SIGNAL`/VAD trigger → cancel LLM generation task → cancel TTS synthesis → flush audio output buffer → send `PLAYBACK_STOPPED`. | `uv run pytest tests/websockets/test_barge_in.py -v` verifies cancellation + flush within 50ms of interrupt. |
| TASK-115 | Heartbeat, Ping/Pong & Graceful Reconnect Protocol | TASK-112 | `websockets/heartbeat.py`: ping/pong every 15s. Two consecutive failed pings ⇒ close socket cleanly, persist conversation state to memory cache for 5 minutes for zero-loss reconnect. | `uv run pytest tests/websockets/test_heartbeat.py -v` validates timeout detection and state persistence for reconnect. |
| TASK-116 | WebSocket Message Rate Limiter & Flood Guard | TASK-111 | `websockets/rate_limit.py`: token-bucket limiter per connection. Max 30 frames/sec, 64KB/sec bandwidth. Drops abusive frames, sends `RATE_LIMIT_WARNING` before closing. | `uv run pytest tests/websockets/test_rate_limit.py -v` asserts throttling under intentional flood. |
| TASK-117 | Session State Serialization & In-Memory Sync | TASK-111 | `websockets/session_state.py`: `SessionStateStore` saves active context (FSM state, dialog history, formality baseline, vocab targets) in an in-memory TTL cache synced across worker threads. | `uv run pytest tests/websockets/test_session_state.py -v` verifies hydration, mutation, serialization. |
| TASK-118 | End-of-Turn Silence & Voice Activity Detection (VAD) Bridge | TASK-111 | `websockets/vad_bridge.py`: `VADStreamBridge` listens to chunk energy; triggers `TURN_END` on silence: 800ms beginner, 500ms intermediate, 350ms advanced. | `uv run pytest tests/websockets/test_vad_bridge.py -v` verifies turn-end triggering across silence durations/thresholds. |
| TASK-119 | Real-Time Latency Profiler & Network Jitter Compensator | TASK-113 | `websockets/jitter_buffer.py`: `JitterBufferManager` computes RTT, adjusts audio packet chunk size (100ms fast networks up to 300ms jittery mobile). | `uv run pytest tests/websockets/test_jitter_buffer.py -v` verifies dynamic packet sizing under simulated jitter. |
| TASK-120 | WebSocket Error Dispatcher & Client Disconnect Cleanup | TASK-112 | `websockets/error_handler.py`: `WebSocketErrorHandler` converts unhandled exceptions into structured JSON errors with client-friendly recovery messages; cancels all background tasks on disconnect. | `uv run pytest tests/websockets/test_error_handler.py -v` verifies zero dangling async tasks on unexpected termination. |

## Related packages
- [[t06-llm-inference-core]] — token stream this layer multiplexes to the client.
- [[t05-dtw-pronunciation-scoring]] — Track 5's WebSocket router (STT-091) uses the same binary/JSON frame-multiplexing pattern.
