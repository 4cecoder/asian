---
id: track-05-stt-pronunciation
title: "Track 5: Speech-to-Text (STT), Pronunciation Assessment & Pitch/Tone Analysis"
track: meta
task_range: "STT-001–STT-100"
status: complete
tags: [track-moc, stt, whisper, pitch, pronunciation]
related: [track-04-tts-audio, track-06-llm-roleplay, track-03-python-backend]
---

# Track 5: Speech-to-Text (STT), Pronunciation Assessment & Pitch/Tone Analysis

Turns the user's spoken attempt at Japanese/Mandarin/Thai/Vietnamese/Korean
into a scored pronunciation assessment, in real time over WebSockets.
Pipeline: decode & VAD-gate audio → Faster-Whisper transcription → G2P
phonetic decomposition (5 languages) → Yin pitch extraction & tone
classification → DTW/Levenshtein alignment → composite 0–100 score
(accuracy, tone, fluency, completeness). Target end-to-end latency: under
300ms round trip. Full task detail lives in the module packages below;
this doc's own source specification does not use "Module N"/"Domain N"
headers for this track — the grouping here follows the source's own
"Sub-Domain 1–5" headers exactly.

## Modules

1. [[t05-audio-ingestion-vad]] (STT-001–020) — decode, resample, normalize, VAD-gate incoming audio.
2. [[t05-whisper-inference-alignment]] (STT-021–040) — Faster-Whisper transcription, language forcing, timestamps, REST API.
3. [[t05-phoneme-g2p]] (STT-041–060) — grapheme-to-phoneme engines for Mandarin, Japanese, Thai, Vietnamese, Korean.
4. [[t05-pitch-tone-classification]] (STT-061–080) — Yin F0 extraction, smoothing, per-language tone classifiers.
5. [[t05-dtw-pronunciation-scoring]] (STT-081–100) — DTW/Levenshtein alignment, composite scoring, WebSocket + REST delivery.

## Related tracks
- [[track-04-tts-audio]] — the output half of the voice loop (this track is the input/scoring half).
- [[track-06-llm-roleplay]] — consumes this track's transcripts and scores inside live roleplay sessions.
- [[track-03-python-backend]] — shares the FastAPI/Pydantic/structlog/OpenTelemetry conventions this track's routers and metrics use.
