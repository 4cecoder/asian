---
id: t04-loudness-normalization
title: "Module 4: Normalization, EBU R128 LUFS & Dynamic Range Control"
track: "Track 4: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming"
task_range: "TTS-046–TTS-060"
status: complete
tags: [tts, audio, lufs, loudness, dsp]
related: [t04-audio-ingestion-resampling, t04-codecs-streaming]
---

# Module 4: Normalization, EBU R128 LUFS & Dynamic Range Control

A full EBU R128 / ITU-R BS.1770-4 loudness pipeline: measurement, gain
calculation, true-peak detection, a lookahead limiter, a speech compressor,
high-pass/de-esser filtering, and a two-pass normalizer that lands every
clip at -16 LUFS ±0.5, ≤ -1.0 dBTP.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TTS-046 | EBU R128/BS.1770-4 loudness meter engine | TTS-033 | `backend/app/core/audio/lufs_meter.py`. `LoudnessMeterBS1770` applies K-weighting pre-filter (f₀=1681.9Hz, G=+3.99dB) and RLB high-pass weighting. | Measures loudness within ±0.1 LUFS of BS.1770-4 calibration tolerance. `uv run pytest tests/audio/test_lufs_meter.py`. |
| TTS-047 | Integrated loudness calculation | TTS-046 | `backend/app/core/audio/integrated_lufs.py`. `calculate_integrated_lufs(audio_data, sample_rate=16000)`: gated loudness over 400ms overlapping blocks, -70 LKFS absolute gate, -10 LU relative gate. | Returns an accurate integrated LUFS metric across the full track. `uv run pytest tests/audio/test_integrated_lufs.py`. |
| TTS-048 | Short-term & momentary loudness window calc | TTS-046 | `backend/app/core/audio/windowed_lufs.py`. `calculate_momentary_lufs(frame_400ms)`, `calculate_short_term_lufs(window_3s)`. | Sliding loudness telemetry for live streaming. `uv run pytest tests/audio/test_windowed_lufs.py`. |
| TTS-049 | Target -16 LUFS linear gain calculator | TTS-047 | `backend/app/core/audio/gain.py`. `calculate_lufs_gain_factor(current_lufs, target_lufs=-16.0)`: `gain_db = target - current`, `factor = 10^(gain_db/20)`. | Correctly computes the linear multiplier to hit -16 LUFS. `uv run pytest tests/audio/test_gain.py`. |
| TTS-050 | True peak intersample overshoot detector | TTS-033 | `backend/app/core/audio/true_peak.py`. `calculate_true_peak_dbfs(audio_data, sample_rate=16000)`, 4x oversampling polyphase interpolation. | Accurately detects intersample overshoots > 0.0 dBFS. `uv run pytest tests/audio/test_true_peak.py`. |
| TTS-051 | Hard/soft knee peak limiter (-1.0 dBTP) | TTS-050 | `backend/app/core/audio/limiter.py`. `apply_lookahead_limiter(audio_data, ceiling_dbtp=-1.0, lookahead_ms=3.0, release_ms=50.0, sample_rate=16000)`. | Clamps true peaks strictly below -1.0 dBTP, no harsh distortion or clipping. `uv run pytest tests/audio/test_limiter.py`. |
| TTS-052 | Dynamic range compression (DRC) processor | TTS-033 | `backend/app/core/audio/compressor.py`. `apply_speech_compressor(audio_data, threshold_db=-24.0, ratio=2.5, attack_ms=15.0, release_ms=100.0, sample_rate=16000)`. | Evens out whisper-to-shout volume swings for mobile speaker clarity. `uv run pytest tests/audio/test_compressor.py`. |
| TTS-053 | Sub-bass high-pass filter (80Hz cutoff) | TTS-033 | `backend/app/core/audio/highpass.py`. Butterworth 2nd-order high-pass (fc=80Hz) via `scipy.signal.butter` + `sosfilt`. | Attenuates < 80Hz rumble by > 18dB/octave. `uv run pytest tests/audio/test_highpass.py`. |
| TTS-054 | High-frequency de-esser for sibilance | TTS-033 | `backend/app/core/audio/deesser.py`. Sidechain bandpass (5–8kHz) dynamic compressor for Japanese/Mandarin fricatives (sh, ch, ts). | Reduces harsh HF spikes without muffling vocal presence. `uv run pytest tests/audio/test_deesser.py`. |
| TTS-055 | Two-pass loudness normalizer wrapper | TTS-047, TTS-049, TTS-051, TTS-053, TTS-054 | `backend/app/core/audio/normalizer.py`. `normalize_audio_lufs(audio_data, target_lufs=-16.0, ceiling_dbtp=-1.0, sample_rate=16000)`. Pass 1: highpass → de-esser → measure LUFS → apply gain. Pass 2: peak limiter to ceiling. | Output measures -16.0 ±0.5 LUFS, true peak ≤ -1.0 dBTP. `uv run pytest tests/audio/test_normalizer.py`. |
| TTS-056 | Single-pass fast normalizer for live streams | TTS-048, TTS-051 | `backend/app/core/audio/fast_normalizer.py`. `StreamingFastNormalizer` maintains an EMA of frame loudness, applies instantaneous gain with smoothed release. | Normalizes real-time streams with < 1ms compute latency. `uv run pytest tests/audio/test_fast_normalizer.py`. |
| TTS-057 | Audio clipping & distortion telemetry sensor | TTS-033 | `backend/app/core/audio/clipping.py`. `detect_clipping_events(audio_data, threshold=0.999)`, warns past 3 consecutive clipped samples. | Detects clipped waveforms, records quality-monitoring metrics. `uv run pytest tests/audio/test_clipping.py`. |
| TTS-058 | Acoustic loudness profile comparator | TTS-047, TTS-050 | `backend/app/core/audio/comparator.py`. `compare_audio_profiles(before, after)` → ΔLUFS, ΔTruePeak, DRC ratio, RMS energy shift. | Structured diagnostic diffs for automated audio QA. `uv run pytest tests/audio/test_comparator.py`. |
| TTS-059 | Normalization presets | None | `backend/app/core/audio/profiles.py`. `FLASHCARD_PRONUNCIATION` (-14 LUFS, aggressive limiter), `TRAVEL_ROLEPLAY` (-16 LUFS, natural dynamics), `OFFLINE_PHRASEBOOK` (-15 LUFS, max intelligibility). | Typed profile objects pass into the normalizer seamlessly. `uv run pytest tests/audio/test_profiles.py`. |
| TTS-060 | Normalization test suite, multi-loudness assets | TTS-046–TTS-059 | Clips ranging from -30 LUFS to -6 LUFS. | All converge to -16.0 ±0.5 LUFS with no digital clipping. `uv run pytest tests/core/test_normalizer.py -v`. |

## Related packages
- [[t04-audio-ingestion-resampling]] — supplies the PCM this module normalizes
- [[t04-codecs-streaming]] — encodes the normalized output
