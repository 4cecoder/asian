---
id: t04-audio-ingestion-resampling
title: "Module 3: Raw Audio Ingestion, Decoding & Resampling"
track: "Track 4: Moonshot TTS Engine, Audio Processing Pipeline, Storage & Streaming"
task_range: "TTS-031–TTS-045"
status: complete
tags: [tts, audio, pyav, resampling, pcm]
related: [t04-moonshot-client-resilience, t04-loudness-normalization]
---

# Module 3: Raw Audio Ingestion, Decoding & Resampling

The PyAV/FFmpeg-based decode path that turns arbitrary TTS output bytes
(MP3, WAV, Ogg/Opus, AAC, WebM, at any sample rate) into a standardized
16kHz mono PCM16 buffer — with mono downmix, sinc resampling, silence
trimming, zero-crossing splicing, and corrupted-frame repair.

## Tasks

| ID      | Title                                              | Depends on       | Spec (condensed)                                                                                                                                                                                 | Acceptance check                                                                                                      |
| ------- | -------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| TTS-031 | PyAV/FFmpeg context init & probe                   | None             | `backend/app/core/audio/engine.py`. Init PyAV (`av`) context; verify `libavformat`, `libavcodec`, `libswresample`, `libopus`. `get_av_capabilities() -> dict`.                                   | Confirms PyAV is linked against required decoders/encoders. `uv run pytest tests/audio/test_engine.py`.               |
| TTS-032 | Binary container sniffer & format probe            | TTS-031          | `backend/app/core/audio/probe.py`. `probe_audio_bytes(data) -> AudioStreamMetadata`: container, codec, sample rate, channels, duration, bit depth from magic bytes/headers.                      | Correctly identifies MP3, WAV, Ogg/Opus, AAC, WebM. `uv run pytest tests/audio/test_probe.py`.                        |
| TTS-033 | In-memory byte stream decoder                      | TTS-031, TTS-032 | `backend/app/core/audio/decoder.py`. `decode_to_numpy(audio_bytes) -> tuple[np.ndarray, int]` via `io.BytesIO`, float32 `[-1.0, 1.0]`.                                                           | Decodes arbitrary MP3/WAV into PCM arrays with no disk I/O. `uv run pytest tests/audio/test_decoder.py`.              |
| TTS-034 | Multi-channel to mono downmixer                    | TTS-033          | `backend/app/core/audio/channels.py`. `downmix_to_mono(audio_data)`. Stereo: `M = 0.5·L + 0.5·R`. >2 channels: normalized-weight sum.                                                            | Outputs 1D mono array; 1D inputs pass through unchanged. `uv run pytest tests/audio/test_channels.py`.                |
| TTS-035 | High-fidelity 16kHz sinc resampling filter         | TTS-033          | `backend/app/core/audio/resampler.py`. `resample_audio(audio_data, orig_sr, target_sr=16000)` via `av.AudioResampler` or `scipy.signal.resample_poly` with anti-aliasing low-pass.               | Resamples 24/44.1/48kHz to 16kHz with SNR > 90dB, no audible aliasing. `uv run pytest tests/audio/test_resampler.py`. |
| TTS-036 | Linear PCM16 LE formatter                          | TTS-035          | `backend/app/core/audio/pcm.py`. `float32_to_pcm16` / `pcm16_to_float32`. Clip to `[-1.0, 1.0]`, scale to int16 range.                                                                           | Valid raw PCM16 LE buffers compatible with Whisper STT and Web Audio API. `uv run pytest tests/audio/test_pcm.py`.    |
| TTS-037 | Audio frame slicer & time-indexed chunker          | TTS-036          | `backend/app/core/audio/chunker.py`. `chunk_pcm16_stream(pcm_bytes, frame_duration_ms=20, sample_rate=16000)`. Frame size = 640 bytes (`16000·2·20/1000`).                                       | Emits contiguous 640-byte chunks for exact 20ms frames. `uv run pytest tests/audio/test_chunker.py`.                  |
| TTS-038 | Silence trimmer & noise gate                       | TTS-033          | `backend/app/core/audio/silence.py`. `trim_silence(audio_data, threshold_db=-45.0, pad_ms=50, sample_rate=16000)`. Retains a 50ms fade boundary.                                                 | Trims dead air without cutting initial attack phonemes. `uv run pytest tests/audio/test_silence.py`.                  |
| TTS-039 | Zero-crossing point audio splicer                  | TTS-033          | `backend/app/core/audio/splicer.py`. `splice_audio_chunks(chunks, crossfade_samples=64)`, 4ms linear crossfade at the nearest zero-crossing.                                                     | Eliminates clicks/pops at sentence splice boundaries. `uv run pytest tests/audio/test_splicer.py`.                    |
| TTS-040 | Dynamic audio buffer pool & memory recycler        | None             | `backend/app/core/audio/pool.py`. `AudioMemoryPool` reuses pre-allocated `bytearray` buffers to cut GC pauses under high-concurrency streaming.                                                  | Recycles buffers, cuts allocation overhead by > 60%. `uv run pytest tests/audio/test_pool.py`.                        |
| TTS-041 | Async audio transform pipeline                     | TTS-033–TTS-039  | `backend/app/core/audio/pipeline.py`. `AudioIngestionPipeline.process_raw_bytes(raw_bytes) -> tuple[bytes, AudioStreamMetadata]`: decode → downmix mono → resample 16kHz → trim silence → PCM16. | Any input converts to standardized 16kHz mono PCM16 in < 15ms. `uv run pytest tests/audio/test_pipeline.py`.          |
| TTS-042 | Corrupted frame recovery & header repair           | TTS-031          | `backend/app/core/audio/repair.py`. `repair_truncated_audio_stream(truncated_bytes, container="mp3")` rebuilds container headers, truncates partial trailing frames.                             | Gracefully decodes mid-stream dropped TCP audio, no uncaught exceptions. `uv run pytest tests/audio/test_repair.py`.  |
| TTS-043 | Audio duration/sample count/bitrate validator      | TTS-032          | `backend/app/core/audio/validator.py`. `validate_audio_characteristics(pcm_bytes, max_duration_sec=30.0, sample_rate=16000)`.                                                                    | Raises `AudioDurationLimitExceeded` on oversized files. `uv run pytest tests/audio/test_validator.py`.                |
| TTS-044 | Synthetic tone/sine wave generator for calibration | TTS-036          | `backend/app/core/audio/synth.py`. `generate_sine_wave(freq_hz=440.0, duration_sec=1.0, sample_rate=16000, amplitude=0.5) -> bytes`.                                                             | Produces calibration signals for audio pipeline unit tests. `uv run pytest tests/audio/test_synth.py`.                |
| TTS-045 | Resampling & PCM conversion test suite             | TTS-031–TTS-044  | Covers MP3/WAV/OGG/FLAC/AAC/M4A at 8/22.05/44.1/48/96kHz.                                                                                                                                        | All formats convert to standardized 16kHz mono PCM16. `uv run pytest tests/core/test_resampling.py -v`.               |

## Related packages

- [[t04-moonshot-client-resilience]] — supplies the raw bytes this module decodes
- [[t04-loudness-normalization]] — operates on this module's PCM output
