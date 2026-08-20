---
id: t05-pitch-tone-classification
title: "Sub-Domain 4: Fundamental Frequency (F0) Extraction & Tone Classification"
track: "Track 5: Speech-to-Text (STT), Pronunciation Assessment & Pitch/Tone Analysis"
task_range: "STT-061–STT-080"
status: complete
tags: [stt, pitch, yin, tone-classification, mandarin, thai, vietnamese, japanese]
related: [t05-phoneme-g2p, t05-dtw-pronunciation-scoring]
---

# Sub-Domain 4: Fundamental Frequency (F0) Extraction & Tone Classification

Extracts pitch (F0) from raw audio with the Yin algorithm, smooths and
speaker-normalizes it, then classifies it into the tone system of each
target language: 5 tones for Mandarin, 5 for Thai, 6 for Vietnamese, and
pitch-accent patterns for Japanese. Feeds the tone-accuracy term of the
overall pronunciation score.

Core formulas (see `docs/source-specs/complete-spec-nextjs16.md` lines
4601–4618 for full LaTeX): Yin difference function
`d_t(τ) = Σ(x_j − x_{j+τ})²`, cumulative mean normalized difference
`d'_t(τ)`, and parabolic sub-sample peak interpolation to get F0 = f_s/τ*.

## Tasks

| ID      | Title                                                               | Depends on       | Spec (condensed)                                                                                                                                                   | Acceptance check                                                                                             |
| ------- | ------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| STT-061 | Yin Algorithm Step 1: Squared Difference Function d_t(τ)            | STT-002          | Create `backend/app/pitch/yin_difference.py`. Implement d_t(τ) = Σ_{j=1}^{W}(x_j − x_{j+τ})² for τ ∈ [τ_min, τ_max] using FFT cross-correlation acceleration.      | `uv run pytest tests/pitch/test_yin_difference.py -v` verifies equivalence to direct time-domain difference. |
| STT-062 | Yin Algorithm Step 2: Cumulative Mean Normalized Difference d'_t(τ) | STT-061          | Create `backend/app/pitch/yin_cmndf.py`. d'_t(τ)=1 if τ=0, else d_t(τ)/[(1/τ)Σ_{j=1}^{τ}d_t(j)], to avoid zero-lag trivial dips.                                   | `uv run pytest tests/pitch/test_yin_cmndf.py -v` verifies CMNDF normalization properties.                    |
| STT-063 | Yin Algorithm Step 3: Absolute Thresholding & Dip Search            | STT-062          | Create `backend/app/pitch/yin_threshold.py`. Select the first dip in d'_t(τ) below threshold δ=0.10 to avoid octave errors.                                        | `uv run pytest tests/pitch/test_yin_threshold.py -v` verifies dip selection on synthetic harmonic signals.   |
| STT-064 | Yin Algorithm Step 4: Parabolic Sub-Sample Interpolation            | STT-063          | Create `backend/app/pitch/yin_interpolation.py`. Fit a parabola through (τ-1, τ, τ+1) for sub-sample period τ* with precision < 0.01 samples.                      | `uv run pytest tests/pitch/test_yin_interpolation.py -v` verifies pitch error < 0.1 Hz.                      |
| STT-065 | Yin Algorithm Step 5: Global Best Local Estimate & Voicing Gating   | STT-064          | Create `backend/app/pitch/yin_voicing.py`. Gate unvoiced frames when minimum dip exceeds 0.20; return F0 = f_s/τ*.                                                 | `uv run pytest tests/pitch/test_yin_voicing.py -v` verifies voiced/unvoiced classification.                  |
| STT-066 | PyIN Probabilistic Viterbi HMM Pitch Tracking                       | STT-065          | Create `backend/app/pitch/pyin_hmm.py`. Viterbi decoding across candidate pitch dips for temporal trajectory smoothness.                                           | `uv run pytest tests/pitch/test_pyin_hmm.py -v` verifies smooth contour through noisy segments.              |
| STT-067 | Pitch Contour Smoothing via Median & Savitzky-Golay Filtering       | STT-065          | Create `backend/app/pitch/smoothing.py`. 5-frame median filter + 3rd-order Savitzky-Golay smoothing removes octave jumps and jitter.                               | `uv run pytest tests/pitch/test_smoothing.py -v` verifies removal of isolated single-frame outliers.         |
| STT-068 | Speaker Pitch Normalization (Semitone & Z-Score Transform)          | STT-067          | Create `backend/app/pitch/normalization.py`. Convert Hz F0 to semitones vs speaker base pitch: ST = 12·log2(F0/F_base); compute Z-scores.                          | `uv run pytest tests/pitch/test_normalization.py -v` verifies invariance across male/female ranges.          |
| STT-069 | Syllable-Level Pitch Contour Segmentation & Windowing               | STT-033, STT-068 | Create `backend/app/pitch/syllable_windowing.py`. Slice pitch tracks into normalized 100-point time-interpolated contours per syllable using character timestamps. | `uv run pytest tests/pitch/test_syllable_windowing.py -v` verifies fixed 100-point vector generation.        |
| STT-070 | Mandarin 5-Tone Acoustic Feature Vector Extractor                   | STT-069          | Create `backend/app/pitch/mandarin/features.py`. Compute slope, mean pitch, curvature (2nd derivative), onset-to-offset delta.                                     | `uv run pytest tests/pitch/test_mandarin_features.py -v` validates feature vector extraction.                |
| STT-071 | Mandarin 5-Tone Classifier Engine                                   | STT-070          | Create `backend/app/pitch/mandarin/classifier.py`. Classify: Tone 1 (High Level), 2 (Rising), 3 (Dipping), 4 (Falling), 5 (Neutral).                               | `uv run pytest tests/pitch/test_mandarin_classifier.py -v` verifies accuracy > 95%.                          |
| STT-072 | Thai 5-Tone Feature Extractor & Slope Analyzer                      | STT-069          | Create `backend/app/pitch/thai/features.py`. Extract pitch contours for Central Thai syllables with initial-consonant duration weighting.                          | `uv run pytest tests/pitch/test_thai_features.py -v` validates Thai acoustic feature vectors.                |
| STT-073 | Thai 5-Tone Classifier Engine                                       | STT-072          | Create `backend/app/pitch/thai/classifier.py`. Classify into Mid, Low, Falling, High, Rising.                                                                      | `uv run pytest tests/pitch/test_thai_classifier.py -v` verifies accuracy > 94%.                              |
| STT-074 | Vietnamese 6-Tone Glottalization & Pitch Contour Extractor          | STT-069          | Create `backend/app/pitch/vietnamese/features.py`. Detect energy-drop/glottal-stop breaks characteristic of ngã/nặng plus F0 trajectory.                           | `uv run pytest tests/pitch/test_vietnamese_features.py -v` verifies glottalization detection.                |
| STT-075 | Vietnamese 6-Tone Classifier Engine                                 | STT-074          | Create `backend/app/pitch/vietnamese/classifier.py`. Classify Ngang, Huyền, Sắc, Hỏi, Ngã, Nặng.                                                                   | `uv run pytest tests/pitch/test_vietnamese_classifier.py -v` verifies accuracy > 93%.                        |
| STT-076 | Japanese Tokyo-Standard Pitch Accent Models                         | None             | Create `backend/app/pitch/japanese/models.py`. Define canonical pitch-accent templates: Atamadaka (1), Nakadaka (2..N-1), Odaka (N), Heiban (0).                   | `uv run pytest tests/pitch/test_japanese_models.py -v` validates pitch-accent template schemas.              |
| STT-077 | Japanese Pitch Accent Step Classifier & Mora Evaluator              | STT-069, STT-076 | Create `backend/app/pitch/japanese/classifier.py`. Evaluate mora-by-mora relative pitch steps (High/Low) against lexical dictionary patterns.                      | `uv run pytest tests/pitch/test_japanese_classifier.py -v` verifies pitch-accent detection on test words.    |
| STT-078 | SVG & JSON Pitch Contour Coordinate Generator for Frontend HUD      | STT-068          | Create `backend/app/pitch/contour_export.py`. Convert pitch curves to normalized SVG Bezier curves + JSON coordinate arrays for the Next.js frontend.              | `uv run pytest tests/pitch/test_contour_export.py -v` verifies SVG path syntax and normalized JSON.          |
| STT-079 | Unit Test Suite for Yin Algorithm Numerical Accuracy                | STT-061…STT-065  | Create `backend/tests/pitch/test_yin.py`. Test on pure sinusoids from 80Hz to 600Hz.                                                                               | `uv run pytest backend/tests/pitch/test_yin.py` passes with max frequency error < 0.1%.                      |
| STT-080 | Integration Test Suite for Multilingual Tone Classification         | STT-070…STT-077  | Create `backend/tests/pitch/test_tone_classifiers.py`. Test tone classification across Mandarin, Thai, Vietnamese, Japanese corpora.                               | `uv run pytest backend/tests/pitch/test_tone_classifiers.py` passes with > 94% average accuracy.             |

## Related packages

- [[t05-phoneme-g2p]] — supplies syllable/character boundaries (STT-033) used for pitch windowing (STT-069).
- [[t05-dtw-pronunciation-scoring]] — downstream: consumes classified tones and pitch contours for the tone-accuracy score S_tone.
