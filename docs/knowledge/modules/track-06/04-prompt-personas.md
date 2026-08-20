---
id: t06-prompt-personas
title: "Cluster 4: System Prompt Matrix & Few-Shot Persona Templates"
track: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
task_range: "TASK-131–TASK-140"
status: complete
tags: [prompts, personas, few-shot, roleplay]
related: [t06-scenario-fsm, t06-formality-cultural-grading]
---

# Cluster 4: System Prompt Matrix & Few-Shot Persona Templates

The prompt-construction layer: a parameterized system-prompt builder, two
named personas per language (10 personas across Japanese, Mandarin, Thai,
Vietnamese, Korean), a few-shot dialogue exemplar retriever, a hidden
pedagogical "thought" block injector, a scenario-objective evaluator, and
a conversation-history compressor to stay within context limits.

## Tasks

| ID       | Title                                                          | Depends on | Spec (condensed)                                                                                                                                                                                                                               | Acceptance check                                                                                                                    |
| -------- | -------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| TASK-131 | Parameterized Multi-Persona System Prompt Builder              | None       | `prompts/builder.py`: `SystemPromptBuilder` generates structured prompts with sections `[IDENTITY & ROLE]`, `[CURRENT SCENARIO STATE]`, `[TARGET LANGUAGE & REGISTER]`, `[PEDAGOGICAL CONSTRAINTS]`, `[FEW-SHOT EXAMPLES]`, `[OUTPUT FORMAT]`. | `uv run pytest tests/prompts/test_builder.py -v` validates full prompt construction, all slots populated.                           |
| TASK-132 | Japanese Izakaya Master & Tokyo Taxi Driver Personas           | TASK-131   | `prompts/japanese_personas.py`: Izakaya Master (gruff, warm, colloquial da-tai/desu-masu, food vocab, nudges drink order first — "Toriaezu Nama"). Tokyo Taxi Driver (hyper-polite keigo/teineigo, confirms routes/landmarks).                 | `uv run pytest tests/prompts/test_japanese_personas.py -v` asserts persona vocabulary markers and tone accuracy.                    |
| TASK-133 | Mandarin Taipei Night Market Vendor & Beijing Barista Personas | TASK-131   | `prompts/mandarin_personas.py`: Taipei Vendor (energetic, Taiwanese particles Ah/La/O, playful price negotiation). Beijing Barista (modern, polite Nin vs Ni, guides drink prefs).                                                             | `uv run pytest tests/prompts/test_mandarin_personas.py -v` verifies dialect-appropriate particle injection.                         |
| TASK-134 | Thai Bangkok Tuk-Tuk Driver & Street Food Auntie Personas      | TASK-131   | `prompts/thai_personas.py`: Tuk-Tuk Driver (friendly negotiator, Khrap, humorous price countering). Food Auntie/Jay/Pee (maternal, checks spice tolerance "Phet mai?", encourages specials).                                                   | `uv run pytest tests/prompts/test_thai_personas.py -v` verifies polite particle consistency (Khrap/Kha).                            |
| TASK-135 | Vietnamese Saigon Grab Driver & Hanoi Pho Master Personas      | TASK-131   | `prompts/vietnamese_personas.py`: Grab Driver (fast-paced, Southern dialect terms — Quẹo not Rẽ). Pho Master (traditional, precise beef cuts Tái/Nạm/Gầu, Northern pronouns Bác/Em).                                                           | `uv run pytest tests/prompts/test_vietnamese_personas.py -v` verifies Northern and Southern vocabulary tags.                        |
| TASK-136 | Korean Hongdae Street Fashion Vendor & Pocha Owner Personas    | TASK-131   | `prompts/korean_personas.py`: Fashion Vendor (trendy, fast, compliments style, bundle discounts — "Service juseyo"). Pocha Owner/Imo (warm, informal-polite haeyoche, recommends soju pairings).                                               | `uv run pytest tests/prompts/test_korean_personas.py -v` verifies speech-level adherence.                                           |
| TASK-137 | Dynamic Few-Shot Dialogue Exemplar Retriever (RAG)             | TASK-131   | `prompts/few_shot_retriever.py`: `FewShotExemplarRetriever` selects top-3 relevant dialogue examples from a curated vector/metadata store matching scenario state, language, difficulty.                                                       | `uv run pytest tests/prompts/test_few_shot_retriever.py -v` verifies exemplar relevance and sub-10ms lookup.                        |
| TASK-138 | Pedagogical Hint & Hidden Thought Injector                     | TASK-131   | Prompt structuring instructs the model to output a hidden XML block (user intent, grammatical flaws, conversational goal status) before the visible dialogue response.                                                                         | `uv run pytest tests/prompts/test_thought_injector.py -v` verifies regex extraction/separation of thought tags from final dialogue. |
| TASK-139 | Scenario Objective Tracker & Completion Evaluator Prompt       | TASK-131   | Evaluation prompt checks mission success (e.g. got 20% discount, ordered food with no cilantro, arrived at destination). Returns objective score (0–100) and milestone checklist.                                                              | `uv run pytest tests/prompts/test_objective_evaluator.py -v` validates milestone score calc on completed dialogues.                 |
| TASK-140 | Multi-Turn Conversation History Compressor & Truncation Engine | TASK-131   | `prompts/context_compressor.py`: `ConversationCompressor` keeps last 6 turns verbatim, summarizes earlier turns into a 50-token scenario summary to preserve token budget.                                                                     | `uv run pytest tests/prompts/test_context_compressor.py -v` verifies context-window stability across a 30-turn session.             |

## Related packages

- [[t06-scenario-fsm]] — supplies `[CURRENT SCENARIO STATE]` prompt content from each FSM's `get_prompt_constraints()`.
- [[t06-formality-cultural-grading]] — personas' target speech register is graded by that cluster's classifiers.
