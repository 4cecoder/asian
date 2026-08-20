---
id: t04-codecs-streaming
title: "Module 5: Codec Encoders & WebSocket/HTTP Streaming"
track: "Track 4: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming"
task_range: "TTS-061–TTS-075"
status: complete
tags: [tts, audio, opus, websocket, streaming, codecs]
related: [t04-loudness-normalization, t04-storage-uploads]
---

# Module 5: Codec Encoders & WebSocket/HTTP Streaming

Encodes normalized PCM into Opus (primary), AAC and MP3 (compatibility
fallbacks), muxes into Ogg/WebM containers, and streams frames to clients
over binary WebSocket or HTTP chunked transfer — with backpressure
handling and gapless multi-sentence concatenation.

## Tasks

| ID      | Title                                           | Depends on       | Spec (condensed)                                                                                                                                                                  | Acceptance check                                                                                                                |
| ------- | ----------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| TTS-061 | libopus PyAV async audio encoder                | TTS-031, TTS-036 | `backend/app/core/codecs/opus.py`. `OpusEncoder` (PyAV libopus): `encode_frame(pcm16_frame) -> bytes`, `flush() -> bytes`. 20ms frames at 16kHz mono.                             | Compresses 640-byte PCM frames into valid Opus packets. `uv run pytest tests/codecs/test_opus.py`.                              |
| TTS-062 | Opus bitrate/complexity/VBR config matrix       | TTS-061          | `backend/app/core/codecs/opus_config.py`. `bit_rate=24000`, `application="voip"`, `complexity=5`, `vbr=True`.                                                                     | Balances low CPU use on edge nodes with clear voice. `uv run pytest tests/codecs/test_opus_config.py`.                          |
| TTS-063 | Ogg/Opus container multiplexer                  | TTS-061          | `backend/app/core/codecs/ogg_mux.py`. `OggOpusMuxer` generates `OpusHead`/`OpusTags` headers with granule position tracking.                                                      | Produces `.opus`/`.ogg` files playable in browser `<audio>` tags. `uv run pytest tests/codecs/test_ogg_mux.py`.                 |
| TTS-064 | WebM/Opus streaming container packager          | TTS-061          | `backend/app/core/codecs/webm_mux.py`. `WebMOpusStreamer` packages Opus frames in EBML/Matroska WebM clusters for HTML5 live streaming.                                           | Client starts playback after the first EBML header cluster arrives. `uv run pytest tests/codecs/test_webm_mux.py`.              |
| TTS-065 | AAC-LC/MP4 encoder fallback                     | TTS-031          | `backend/app/core/codecs/aac.py`. `AACEncoder` (32kbps, ADTS container) for legacy iOS Safari.                                                                                    | Encodes PCM into a valid ADTS AAC stream. `uv run pytest tests/codecs/test_aac.py`.                                             |
| TTS-066 | MP3 high-compatibility encoder                  | TTS-031          | `backend/app/core/codecs/mp3.py`. `MP3Encoder` via libmp3lame, CBR 64kbps mono, for static flashcard downloads.                                                                   | Valid MP3 stream with valid ID3 tags. `uv run pytest tests/codecs/test_mp3.py`.                                                 |
| TTS-067 | Frame-by-frame chunked stream generator         | TTS-037, TTS-061 | `backend/app/core/streaming/chunk_stream.py`. `pcm_to_opus_stream(pcm_stream) -> AsyncGenerator[bytes, None]`, encodes 20ms PCM chunks into Opus in real time.                    | Yields Opus frames with < 2ms per-frame latency. `uv run pytest tests/streaming/test_chunk_stream.py`.                          |
| TTS-068 | Binary WebSocket audio frame serializer         | None             | `backend/app/core/streaming/ws_serializer.py`. Protocol: 4-byte header (magic `0xAA 0x55`, 1-byte type `0x01=AUDIO_OPUS`, 1-byte sequence ID) + raw Opus payload.                 | Serializes/parses binary WS voice packets with sequence integrity. `uv run pytest tests/streaming/test_ws_serializer.py`.       |
| TTS-069 | Out-of-band metadata & sequence header          | TTS-068          | `backend/app/core/streaming/headers.py`. JSON control schemas: `StreamStart(sample_rate, channels, codec)`, `StreamEnd(total_frames, duration_ms)`, `StreamError(code, message)`. | Transmits stream lifecycle signals over text WS frames alongside binary audio. `uv run pytest tests/streaming/test_headers.py`. |
| TTS-070 | Client backpressure & adaptive bitrate throttle | None             | `backend/app/core/streaming/backpressure.py`. Monitors WS send buffer; if client buffer > 500ms, throttles Opus bitrate 24→16kbps or drops non-essential metadata frames.         | Prevents server memory bloat under network jitter/packet loss. `uv run pytest tests/streaming/test_backpressure.py`.            |
| TTS-071 | Streaming audio jitter buffer simulator         | TTS-068          | `backend/app/core/streaming/jitter.py`. `JitterBufferSimulator`: 0–200ms randomized delay and out-of-order delivery for testing.                                                  | Simulates lossy mobile network conditions for automated QA. `uv run pytest tests/streaming/test_jitter.py`.                     |
| TTS-072 | HTTP chunked transfer audio endpoint            | TTS-063, TTS-067 | `backend/app/routers/streaming_http.py`. `GET /api/v1/audio/stream/tts` → `StreamingResponse(content_type="audio/ogg; codecs=opus")`, `Transfer-Encoding: chunked`.               | Plays back in HTML5 with immediate playback start. `uv run pytest tests/routers/test_streaming_http.py`.                        |
| TTS-073 | WebSocket low-latency binary voice dispatcher   | TTS-068, TTS-069 | `backend/app/routers/streaming_ws.py`. `WS /api/v1/ws/tts/live`, bidirectional binary voice chunks, ping/pong keepalive.                                                          | < 150ms glass-to-glass latency. `uv run pytest tests/routers/test_streaming_ws.py`.                                             |
| TTS-074 | Gapless audio concatenation engine              | TTS-039, TTS-061 | `backend/app/core/streaming/gapless.py`. Concatenates multiple sentence audio files into one seamless stream, zero phase discontinuities.                                         | Smooth multi-sentence playback, no pauses/pops. `uv run pytest tests/streaming/test_gapless.py`.                                |
| TTS-075 | Codec & streaming performance benchmark         | TTS-061–TTS-074  | Benchmarks encoding speed/memory overhead across 100 concurrent streams.                                                                                                          | Real-time encoding factor > 15x on a single CPU core. `uv run pytest tests/core/test_codecs.py -v`.                             |

## Related packages

- [[t04-loudness-normalization]] — this module encodes the normalized PCM
- [[t04-storage-uploads]] — encoded audio flows to storage next
