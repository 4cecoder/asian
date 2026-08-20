---
id: t06-formality-cultural-grading
title: "Cluster 7: Formality & Cultural Nuance Grading Engines"
track: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
task_range: "TASK-161–TASK-170"
status: complete
tags: [formality, culture, register, roleplay]
related: [t06-pedagogical-correction, t06-prompt-personas]
---

# Cluster 7: Formality & Cultural Nuance Grading Engines

Five language-specific speech-register classifiers (Japanese keigo tiers,
Korean speech levels, Thai/Vietnamese/Mandarin politeness), a
cross-language cultural-taboo detector, a formality-mismatch severity
calculator, a per-scenario politeness goal tracker, an etiquette-tip
generator, and a 500-sentence benchmark suite tying it all together.

## Tasks

| ID       | Title                                                             | Depends on        | Spec (condensed)                                                                                                                                                                                                                                        | Acceptance check                                                                                                             |
| -------- | ----------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| TASK-161 | Japanese Speech Register Classifier (Keigo vs Teineigo vs Casual) | None              | `formality/japanese_register.py`: `JapaneseRegisterClassifier` identifies verbal endings — Kudaketa/Casual (Da, Nai, Ta, Ru), Teineigo/Polite (Desu, Masu), Sonkeigo/Honorific (O-ni naru, Irassharu, Osharu), Kenjougo/Humble (Mousu, Itasu, Itadaku). | `uv run pytest tests/formality/test_japanese_register.py -v` achieves > 99% classification accuracy.                         |
| TASK-162 | Korean Speech Level Classifier (Hasoseo / Hasio / Haeyo / Banmal) | None              | `formality/korean_register.py`: `KoreanSpeechLevelClassifier` classifies verb endings — Hapsyoche (-b/seumnida), Haeyoche (-a/eoyo), Haerache (-da), Banmal (-a/eo, -ya).                                                                               | `uv run pytest tests/formality/test_korean_register.py -v` classifies Korean sentence endings accurately.                    |
| TASK-163 | Thai Politeness & Social Hierarchy Engine (Wai & Khrap/Kha)       | None              | `formality/thai_formality.py`: `ThaiFormalityEngine` computes polite-particle density and social-status alignment (monks, elders, peers, service staff); gives contextual Wai-gesture advice.                                                           | `uv run pytest tests/formality/test_thai_formality.py -v` scores formality compliance across scenarios.                      |
| TASK-164 | Vietnamese Social Distance & Age Pronoun Engine                   | None              | `formality/vietnamese_formality.py`: `VietnameseFormalityEngine` checks respect markers (Dạ, Thưa, Cảm ơn) and verifies expected conversational distance for hospitality vs market scenarios.                                                           | `uv run pytest tests/formality/test_vietnamese_formality.py -v` validates politeness marker detection.                       |
| TASK-165 | Mandarin Honorific vs Casual Expression Detector (您 vs 你)       | None              | `formality/mandarin_formality.py`: `MandarinFormalityDetector` identifies formal pronoun Nin 您, polite openings (Qingwen 请问, Laojia 劳驾, Mafan nin 麻烦您); flags overly abrupt tone.                                                               | `uv run pytest tests/formality/test_mandarin_formality.py -v` detects abrupt vs polite phrasing.                             |
| TASK-166 | Cultural Faux-Pas & Taboo Utterance Identifier                    | None              | `formality/cultural_taboo.py`: `CulturalTabooDetector` scans for missteps — upright chopsticks in rice (JP), asking about monarchy (TH), tipping comments (JP/KR), touching someone's head (TH/Buddhist cultures).                                      | `uv run pytest tests/formality/test_cultural_taboo.py -v` catches 100% of defined taboo triggers, injects corrective advice. |
| TASK-167 | Formality Mismatch Severity Calculator & UI Alert Generator       | TASK-161…TASK-165 | `formality/mismatch_alert.py`: `FormalityMismatchCalculator` compares R_expected vs R_actual register. Emits `MILD_NOTE` (polite in casual), `WARNING` (casual in business), `CRITICAL` (rude in formal).                                               | `uv run pytest tests/formality/test_mismatch_alert.py -v` verifies alert-level generation.                                   |
| TASK-168 | Contextual Politeness Goal Tracker                                | TASK-167          | `formality/politeness_goal.py`: `PolitenessGoalTracker` sets per-scenario formality goals (e.g. "complete check-in using 100% Desu-Masu/Keigo"), awards bonus XP on success.                                                                            | `uv run pytest tests/formality/test_politeness_goal.py -v` verifies goal evaluation on conversation completion.              |
| TASK-169 | Cultural Etiquette Tip Generator for Roleplay Scenarios           | None              | `formality/etiquette_tips.py`: `EtiquetteTipGenerator` supplies a 1-sentence actionable tip before a scenario starts (e.g. "In Thailand, always use Khrap/Kha when asking prices").                                                                     | `uv run pytest tests/formality/test_etiquette_tips.py -v` returns appropriate tips for all active scenarios.                 |
| TASK-170 | Multi-Lingual Formality Benchmark & Rule Evaluator                | TASK-161…TASK-169 | Test suite running 500 standardized sentences across Japanese, Korean, Thai, Vietnamese, Mandarin against the formality classification engines.                                                                                                         | `uv run pytest tests/formality/test_rule_evaluator.py -v` verifies classification accuracy ≥ 98.5%.                          |

## Related packages

- [[t06-pedagogical-correction]] — sibling correction layer, focused on grammar/particles rather than register.
- [[t06-prompt-personas]] — each persona's expected register (e.g. Tokyo Taxi Driver's keigo) is what these classifiers grade against.
