---
id: t06-difficulty-adaptation
title: "Cluster 5: Dynamic Difficulty & Vocabulary Adaptation"
track: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
task_range: "TASK-141–TASK-150"
status: complete
tags: [adaptation, difficulty, vocabulary, cefr, roleplay]
related: [t06-scenario-fsm, t06-pedagogical-correction]
---

# Cluster 5: Dynamic Difficulty & Vocabulary Adaptation

Maps users onto standard proficiency tiers (CEFR/JLPT/HSK), then adjusts
vocabulary, grammar complexity, speech pacing, and gloss support to match.
Tracks fluency and vocabulary mastery in real time and auto-adjusts
difficulty up or down, including re-routing the active scenario FSM.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-141 | CEFR / JLPT / HSK Proficiency Level Mapping System | None | `adaptation/proficiency_levels.py`: `ProficiencyMatrix`. Tier 1 Beginner = JLPT N5/HSK 1-2/CEFR A1. Tier 2 Elementary = N4/HSK 3/A2. Tier 3 Intermediate = N3/HSK 4/B1. Tier 4 Immersion = N2+/HSK 5+/B2+. | `uv run pytest tests/adaptation/test_proficiency_levels.py -v` verifies language-agnostic level mappings. |
| TASK-142 | Vocabulary Whitelist & Blacklist Frequency Filter | TASK-141 | `adaptation/vocab_filter.py`: `VocabularyFilter` checks outputs against frequency tier lists. Beginner mode avoids rare idioms (Yojijukugo JA, Chengyu ZH), substitutes top-500 high-frequency travel terms. | `uv run pytest tests/adaptation/test_vocab_filter.py -v` flags advanced lexical items in beginner-tier outputs. |
| TASK-143 | Grammar & Syntax Complexity Regulator (Clause Length Limiter) | TASK-141 | `adaptation/syntax_regulator.py`: Beginner = max 1 clause, no passive/causative. Intermediate = compound sentences (Keredo, Inshang, Tte). Advanced = full complexity with native ellipsis/contractions. | `uv run pytest tests/adaptation/test_syntax_regulator.py -v` validates clause count/grammar structure against active tier. |
| TASK-144 | Real-Time Speech Rate & Response Length Adjuster | TASK-141 | `adaptation/pacing_controller.py`: `PacingController`. Beginner = 1–2 sentences, TTS 0.85x. Intermediate = 2–3 sentences, TTS 1.0x. Advanced = unconstrained, TTS 1.15x. | `uv run pytest tests/adaptation/test_pacing_controller.py -v` asserts sentence-length limits and speed metadata. |
| TASK-145 | Dynamic English Gloss & Pinyin/Romaji Support Injector | TASK-141 | `adaptation/gloss_injector.py`: `GlossInjector` appends inline phonetic annotations + English glosses to response metadata for Tier 1/2 users, without polluting the primary speech audio. | `uv run pytest tests/adaptation/test_gloss_injector.py -v` verifies metadata attachment, native speech chunks unmodified. |
| TASK-146 | User Error Frequency Tracker & Auto-Downgrade Engine | TASK-141 | `adaptation/difficulty_decay.py`: `DifficultyDecayEngine`. 3 consecutive critical grammar/formality errors ⇒ auto-decay difficulty 1 tier for rest of session, supportive hints. | `uv run pytest tests/adaptation/test_difficulty_decay.py -v` tests auto-downgrade triggering and prompt adjustment. |
| TASK-147 | Challenge Escalation & Native Slang Intro Engine | TASK-141 | `adaptation/slang_escalator.py`: `ChallengeEscalator`. Fluency score > 90% across 5 turns ⇒ inject local colloquialisms and scenario curveballs (vendor out of stock, road closure). | `uv run pytest tests/adaptation/test_slang_escalator.py -v` verifies curveball injection on high fluency scores. |
| TASK-148 | Fluency & Conversational Smoothness Metric Calculator | None | `adaptation/fluency_scorer.py`: `FluencyScorer` computes response latency, lexical diversity (Type-Token Ratio), grammatical accuracy, communicative effectiveness → aggregate 0–100. | `uv run pytest tests/adaptation/test_fluency_scorer.py -v` validates scoring consistency across synthetic samples. |
| TASK-149 | Real-Time User Vocabulary Mastery Matrix | TASK-148 | `adaptation/mastery_matrix.py`: `MasteryMatrixTracker` records words/grammar structures successfully used, marks active/mastered in the user's persistent profile. | `uv run pytest tests/adaptation/test_mastery_matrix.py -v` verifies vocabulary extraction and mastery state updates. |
| TASK-150 | Adaptive Scenario Branch Re-Routing Engine | TASK-121, TASK-146, TASK-147 | `adaptation/branch_router.py`: `AdaptiveBranchRouter` dynamically modifies FSM destination paths based on user choices (different market stall, different dish). | `uv run pytest tests/adaptation/test_branch_router.py -v` validates dynamic FSM branch re-routing. |

## Related packages
- [[t06-scenario-fsm]] — TASK-150's branch router directly re-routes these FSMs' state transitions.
- [[t06-pedagogical-correction]] — error signals from that cluster feed TASK-146's auto-downgrade decision.
