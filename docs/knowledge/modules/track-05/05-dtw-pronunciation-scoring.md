---
id: t05-dtw-pronunciation-scoring
title: "Sub-Domain 5: Dynamic Time Warping (DTW), Levenshtein Distance & Pronunciation Scoring"
track: "Track 5: Speech-to-Text (STT), Pronunciation Assessment & Pitch/Tone Analysis"
task_range: "STT-081–STT-100"
status: complete
tags: [stt, dtw, levenshtein, scoring, websockets, backend]
related: [t05-phoneme-g2p, t05-pitch-tone-classification, t06-websocket-protocol]
---

# Sub-Domain 5: DTW, Levenshtein Distance & Pronunciation Scoring

The scoring finale of the STT track: aligns the user's phonemes/pitch
against the reference (Levenshtein + DTW/FastDTW), computes the four
component scores (accuracy, tone, fluency, completeness), combines them
into one composite score with language-specific weights, and exposes it
over both WebSocket events and REST endpoints.

Composite formula: `S_overall = w_acc·S_acc + w_tone·S_tone + w_flu·S_flu
+ w_comp·S_comp`. Weights: Mandarin/Thai/Vietnamese `w_acc=0.35,
w_tone=0.35, w_flu=0.15, w_comp=0.15`; Japanese/Korean `w_acc=0.50,
w_tone=0.20, w_flu=0.15, w_comp=0.15`.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| STT-081 | Levenshtein Phonetic Distance Matrix with Weighted Substitution Costs | STT-041 | Create `backend/app/scoring/levenshtein.py`. Weighted Levenshtein where substitution cost derives from IPA articulatory distance (place/manner/voicing). | `uv run pytest tests/scoring/test_levenshtein.py -v` verifies lower penalty for [b]→[p] than [b]→[s]. |
| STT-082 | Dynamic Time Warping (DTW) Acoustic Trajectory Alignment | STT-069 | Create `backend/app/scoring/dtw.py`. Standard DTW aligning user pitch/MFCC feature sequences against native reference recordings. | `uv run pytest tests/scoring/test_dtw.py -v` verifies optimal warping path alignment. |
| STT-083 | FastDTW Approximation Engine for Low-Latency Real-Time Matching | STT-082 | Create `backend/app/scoring/fast_dtw.py`. FastDTW, O(N) time, radius R=10, for real-time WebSocket scoring. | `uv run pytest tests/scoring/test_fast_dtw.py -v` verifies alignment within 1.5% of exact DTW in < 2ms. |
| STT-084 | Phoneme-Level Accuracy Scoring Engine (S_acc) | STT-081 | Create `backend/app/scoring/accuracy.py`. S_acc = 100·max(0, 1 − Σw_i·d(p_i,r_i)/Σw_i). | `uv run pytest tests/scoring/test_accuracy.py -v` verifies scaling on perfect/intermediate/flawed pronunciation. |
| STT-085 | Tone Accuracy Scoring Function (S_tone) | STT-071, STT-073, STT-075, STT-077 | Create `backend/app/scoring/tone_score.py`. Score from pitch-contour correlation + discrete tone-classification match. | `uv run pytest tests/scoring/test_tone_score.py -v` verifies 100 correct tone, 50 adjacent, 0 opposite contour. |
| STT-086 | Fluency & Speech Rate Scoring Engine (S_flu) | STT-023 | Create `backend/app/scoring/fluency.py`. Compute speech rate (syllables/sec), pausing ratio, articulation rate → S_flu ∈ [0,100]. | `uv run pytest tests/scoring/test_fluency.py -v` verifies penalties for excessive hesitation/unnatural pauses. |
| STT-087 | Completeness & Omission Penalty Engine (S_comp) | STT-081 | Create `backend/app/scoring/completeness.py`. S_comp = 100·N_recognized/N_reference, penalizing omitted words/truncated endings. | `uv run pytest tests/scoring/test_completeness.py -v` verifies linear scaling with completeness. |
| STT-088 | Unified Pronunciation Assessment Weighted Aggregate Formula | STT-084…STT-087 | Create `backend/app/scoring/aggregate.py`. S_overall composite with language-specific weights (w_tone=0.35 for Mandarin/Thai/Vietnamese). | `uv run pytest tests/scoring/test_aggregate.py -v` verifies composite calc across all languages. |
| STT-089 | Granular Error Diagnostic & Mispronounced Phoneme Highlighting | STT-084, STT-085 | Create `backend/app/scoring/diagnostics.py`. Generate word-by-word feedback: mispronounced phonemes, tone mismatches, audio timestamp offsets. | `uv run pytest tests/scoring/test_diagnostics.py -v` validates JSON feedback schema. |
| STT-090 | Politeness & Formality Score Validator | STT-045, STT-049 | Create `backend/app/scoring/politeness.py`. Verify polite particles (JA desu/masu/keigo, TH khrap/kha, KO yo/nida) match scenario expectations. | `uv run pytest tests/scoring/test_politeness.py -v` verifies detection + warning on inappropriate casual speech. |
| STT-091 | Low-Latency Full-Duplex WebSocket Frame Router | None | Create `backend/app/websockets/stt_router.py`. Manage binary audio (0x01), control JSON (0x02), ping/pong, connection registry. | `uv run pytest tests/websockets/test_stt_router.py -v` verifies binary frame routing, no memory leaks. |
| STT-092 | Streaming Audio Chunk Ingestion & VAD Trigger Session Handler | STT-009, STT-091 | Create `backend/app/websockets/session_handler.py`. Maintain per-connection VAD buffers; trigger STT decoding on detected speech pauses. | `uv run pytest tests/websockets/test_session_handler.py -v` verifies session lifecycle management. |
| STT-093 | Real-Time Bidirectional Event Emitter | STT-091 | Create `backend/app/websockets/event_emitter.py`. Stream `TRANSCRIPTION_PARTIAL`, `PITCH_DATA`, `ASSESSMENT_RESULT` events. | `uv run pytest tests/websockets/test_event_emitter.py -v` validates JSON event format. |
| STT-094 | Audio & Assessment Result Caching in Redis / Memory Store | STT-088 | Create `backend/app/scoring/result_cache.py`. Cache assessment scores + pitch contours for 24h (review, leaderboard sync). | `uv run pytest tests/scoring/test_result_cache.py -v` verifies cache read/write. |
| STT-095 | Assessment Feedback DTO & JSON Schema Serializers | None | Create `backend/app/schemas/scoring_dto.py` with `PronunciationAssessmentResponse`, `WordScoreDTO`, `PhonemeScoreDTO`, `ToneAssessmentDTO`. | `uv run pytest tests/schemas/test_scoring_dto.py -v` validates Pydantic serialization. |
| STT-096 | Edge Speech Assessment REST API Endpoints | STT-084…STT-095 | Create `backend/app/routers/assess.py`. Expose `POST /api/v1/assess/pronunciation` and `POST /api/v1/assess/tone-curve`. | `uv run pytest tests/routers/test_assess_router.py -v` verifies API responses. |
| STT-097 | End-to-End Pipeline Latency Benchmarking & Profiler | STT-001…STT-096 | Create `backend/app/scoring/benchmarks.py`. Benchmark total latency from speech completion to final score payload. | `uv run pytest tests/scoring/test_benchmarks.py -v` verifies roundtrip latency < 350ms. |
| STT-098 | Unit Test Suite for Levenshtein Distance & DTW Alignment | STT-081, STT-082, STT-083 | Create `backend/tests/scoring/test_dtw_levenshtein.py` validating alignment/distance matrix calculations. | `uv run pytest backend/tests/scoring/test_dtw_levenshtein.py` passes with 100% assertions. |
| STT-099 | Unit Test Suite for Composite Pronunciation Scoring Formulas | STT-084…STT-090 | Create `backend/tests/scoring/test_pronunciation_scoring.py` verifying numerical accuracy across edge cases. | `uv run pytest backend/tests/scoring/test_pronunciation_scoring.py` passes with no float regressions. |
| STT-100 | End-to-End WebSocket Integration Test & Multi-Language Stress Suite | STT-001…STT-099 | Create `backend/tests/integration/test_stt_assessment_e2e.py`. Simulate 50 concurrent client sessions across 5 languages. | `uv run pytest backend/tests/integration/test_stt_assessment_e2e.py` passes, zero dropped frames, p95 < 300ms. |

## Related packages
- [[t05-phoneme-g2p]] — reference phoneme sequences this package scores against.
- [[t05-pitch-tone-classification]] — reference tone/pitch data feeding S_tone.
- [[t06-websocket-protocol]] — Track 6's WebSocket layer follows the same frame-multiplexing pattern established by STT-091.
