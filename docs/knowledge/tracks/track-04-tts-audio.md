---
id: track-04-tts-audio
title: "Track 4: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming"
track: meta
task_range: "TTS-001–TTS-100"
status: complete
tags: [tts, audio, moc]
related:
  [
    t04-moonshot-client-resilience,
    t04-sentence-boundary-buffering,
    t04-audio-ingestion-resampling,
    t04-loudness-normalization,
    t04-codecs-streaming,
    t04-storage-uploads,
    t04-waveform-cdn-observability,
  ]
---

# Track 4: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming

Turns LLM-generated text into broadcast-quality voice audio delivered to
the client with minimal latency. Pipeline: sentence segmentation → resilient
Moonshot API client → PyAV decode/resample to 16kHz mono PCM → EBU R128
loudness normalization (-16 LUFS, -1.0 dBTP) → Opus/AAC/MP3 encoding →
WebSocket/HTTP streaming → S3/R2 storage with presigned URLs → waveform
extraction + CDN caching, all instrumented with Prometheus/OTel.
100/100 tasks present, across 7 modules.

## Modules

| #   | Package                             | Range       | Scope                                                                    |
| --- | ----------------------------------- | ----------- | ------------------------------------------------------------------------ |
| 1   | [[t04-moonshot-client-resilience]]  | TTS-001–015 | Moonshot API client, retries, circuit breaker, rate limiter, dedup cache |
| 2   | [[t04-sentence-boundary-buffering]] | TTS-016–030 | CJK/Thai sentence segmentation, quote handling, number normalization     |
| 3   | [[t04-audio-ingestion-resampling]]  | TTS-031–045 | PyAV decode, mono downmix, 16kHz resample, PCM16 formatting              |
| 4   | [[t04-loudness-normalization]]      | TTS-046–060 | EBU R128 LUFS meter, gain calc, limiter, compressor, two-pass normalizer |
| 5   | [[t04-codecs-streaming]]            | TTS-061–075 | Opus/AAC/MP3 encoders, Ogg/WebM muxing, WebSocket/HTTP streaming         |
| 6   | [[t04-storage-uploads]]             | TTS-076–088 | S3/R2 client, multipart uploads, presigned URLs, lifecycle rules         |
| 7   | [[t04-waveform-cdn-observability]]  | TTS-089–100 | Waveform peaks, CDN caching/purge, Prometheus/OTel, golden-master E2E    |

## Related tracks

- [[track-03-python-backend]] — mounts this pipeline under `/api/v1/audio` and `/api/v1/tts`
- [[track-05-stt-pronunciation]] — the mirror-image pipeline for the inbound (speech-to-text) direction
