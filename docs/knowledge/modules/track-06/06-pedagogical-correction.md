---
id: t06-pedagogical-correction
title: "Cluster 6: Real-Time Pedagogical Correction & Error Analysis"
track: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
task_range: "TASK-151–TASK-160"
status: complete
tags: [pedagogy, grammar, correction, roleplay]
related: [t06-difficulty-adaptation, t06-formality-cultural-grading]
---

# Cluster 6: Real-Time Pedagogical Correction & Error Analysis

Live grammar and intent-alignment correction during roleplay: a shared
grammar-correction schema, a semantic intent aligner, and five
language-specific particle/pronoun/classifier validators (Japanese,
Korean, Thai, Vietnamese, Mandarin), plus a "more natural phrasing"
suggester, a correction cache, and a stream splitter that keeps corrections
out of the spoken audio.

## Tasks

| ID       | Title                                                               | Depends on         | Spec (condensed)                                                                                                                                                                                                                                                                                           | Acceptance check                                                                                                           |
| -------- | ------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| TASK-151 | Pedagogical Grammar Correction Prompt & JSON Schema                 | None               | `pedagogy/grammar_analyzer.py`: `GrammarCorrection` Pydantic model — `has_error: bool`, `original_segment`, `corrected_segment`, `error_category: Literal["particle","conjugation","vocabulary","word_order","tone","none"]`, `explanation_en`, `better_alternative`. Zero-shot real-time analysis prompt. | `uv run pytest tests/pedagogy/test_grammar_analyzer.py -v` validates output parsing against known grammatical errors.      |
| TASK-152 | Semantic Intent Alignment & Misunderstanding Detector               | TASK-151           | `pedagogy/semantic_aligner.py`: `SemanticIntentAligner` checks whether the user's utterance actually satisfied the conversational requirement (e.g. answered "yes" to an A-or-B question).                                                                                                                 | `uv run pytest tests/pedagogy/test_semantic_aligner.py -v` detects intent mismatches in synthetic dialogues.               |
| TASK-153 | Japanese Particle Validator (は/が/を/に/で/へ)                     | TASK-151           | `pedagogy/japanese_particles.py`: rule-based + LLM-assisted validator for particle confusion (Wa vs Ga, Ni vs De for location-of-action vs existence). Non-academic explanations.                                                                                                                          | `uv run pytest tests/pedagogy/test_japanese_particles.py -v` catches 100% of particle-error test fixtures.                 |
| TASK-154 | Korean Subject & Topic Marker Validator (은/는/이/가/을/를)         | TASK-151           | `pedagogy/korean_particles.py`: checks topic markers (Eun/Neun) vs subject (I/Ga) vs object (Eul/Reul), accounting for vowel/consonant-ending euphonic rules.                                                                                                                                              | `uv run pytest tests/pedagogy/test_korean_particles.py -v` verifies euphonic consonant rule enforcement.                   |
| TASK-155 | Thai Sentence-Ending & Polite Particle Validator (ครับ/ค่ะ/นะ/ด้วย) | TASK-151           | `pedagogy/thai_particles.py`: checks speaker-gender consistency (Khrap male, Kha female) and softening particles (Na, Duay, Si).                                                                                                                                                                           | `uv run pytest tests/pedagogy/test_thai_particles.py -v` verifies gender-particle agreement.                               |
| TASK-156 | Vietnamese Kinship Pronoun Alignment (Anh/Em/Chị/Cô/Chú)            | TASK-151           | `pedagogy/vietnamese_pronouns.py`: analyzes hierarchical address — Em (younger)→Anh/Chị (older), Cháu→Cô/Chú/Bác; flags disrespectful neutral pronouns (Tôi/Mày/Tao) in service settings.                                                                                                                  | `uv run pytest tests/pedagogy/test_vietnamese_pronouns.py -v` verifies pronoun hierarchy checks.                           |
| TASK-157 | Mandarin Measure Word (Classifier) Error Checker (个/张/本/杯/位)   | TASK-151           | `pedagogy/mandarin_classifiers.py`: flags over-reliance on generic Ge (个) when items need specific classifiers — drinks Bei 杯, bowls Wan 碗, flat objects/tickets Zhang 张, people Wei 位.                                                                                                               | `uv run pytest tests/pedagogy/test_mandarin_classifiers.py -v` validates noun-classifier pairing accuracy.                 |
| TASK-158 | Natural Alternative Phrasing & Slang Suggester                      | TASK-151           | `pedagogy/alternative_suggester.py`: `AlternativeSuggester` produces a "more natural/local phrasing" suggestion for grammatically correct but robotic textbook sentences.                                                                                                                                  | `uv run pytest tests/pedagogy/test_alternative_suggester.py -v` validates local phrase substitution suggestions.           |
| TASK-159 | Async Pedagogical Correction Cache & Deduplicator                   | TASK-151           | `pedagogy/correction_cache.py`: `CorrectionCache` caches frequent user mistake patterns to skip redundant LLM analysis on recurring beginner mistakes.                                                                                                                                                     | `uv run pytest tests/pedagogy/test_correction_cache.py -v` verifies cache hit rates and sub-1ms return on cached mistakes. |
| TASK-160 | Pedagogical Response Stream Splitter (Dialogue vs Correction)       | TASK-113, TASK-151 | `pedagogy/stream_splitter.py`: `StreamSplitter` routes the persona's spoken response to the TTS pipeline while emitting structured correction metadata to the client's visual feedback stream separately.                                                                                                  | `uv run pytest tests/pedagogy/test_stream_splitter.py -v` verifies zero audio contamination from correction strings.       |

## Related packages

- [[t06-difficulty-adaptation]] — error frequency detected here drives that cluster's auto-downgrade engine (TASK-146).
- [[t06-formality-cultural-grading]] — sibling correction layer, focused on register/politeness rather than grammar.
