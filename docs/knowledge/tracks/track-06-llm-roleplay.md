---
id: track-06-llm-roleplay
title: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
track: meta
task_range: "TASK-101–TASK-200 (source only covers TASK-101–TASK-177, ~80/100 tasks)"
status: partial
tags: [track-moc, llm, roleplay, prompt-engineering, guardrails]
related: [track-05-stt-pronunciation, track-04-tts-audio, track-09-nextjs-frontend]
---

# Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering

The conversational core of the platform: a local vLLM/Ollama-backed LLM
serving travel-scenario roleplay over WebSockets, with live pedagogical
correction, formality/cultural grading, and difficulty adaptation layered
on top. Architecture flow: client audio → WebSocket multiplexer → input
guardrails + scenario FSM + VAD/interruption handling (parallel) → edge
LLM orchestrator → dialogue stream to TTS _and_ pedagogical correction
engine (parallel).

**Source truncation:** the specification document
(`docs/source-specs/complete-spec-nextjs16.md`) cuts off mid-TASK-177,
inside Cluster 8. Clusters 1–7 (TASK-101–170, 70 tasks) are fully
specified; Cluster 8 (TASK-171–180) has only 6 complete tasks plus one
fragment (TASK-177) — TASK-178, 179, 180 don't exist in the source at all.
See [[t06-guardrails-injection-defense]] for the exact gap. If a fuller
version of the source doc turns up, re-run extraction for that cluster
only — everything else here is complete.

## Modules

1. [[t06-llm-inference-core]] (TASK-101–110) — async vLLM/Ollama client, model registry, circuit breaker, KV-cache optimization.
2. [[t06-websocket-protocol]] (TASK-111–120) — frame schemas, connection management, barge-in, heartbeat, rate limiting.
3. [[t06-scenario-fsm]] (TASK-121–130) — base FSM engine + 8 concrete travel scenarios (bargaining, food, taxi, hotel, social, emergency, transit, scooter).
4. [[t06-prompt-personas]] (TASK-131–140) — system prompt builder, 10 named personas across 5 languages, few-shot retrieval.
5. [[t06-difficulty-adaptation]] (TASK-141–150) — CEFR/JLPT/HSK tiering, vocabulary/syntax/pacing regulation, auto-downgrade/escalation.
6. [[t06-pedagogical-correction]] (TASK-151–160) — grammar correction schema + 5 language-specific particle/pronoun validators.
7. [[t06-formality-cultural-grading]] (TASK-161–170) — speech-register classifiers, cultural taboo detector, formality goal tracking.
8. [[t06-guardrails-injection-defense]] (TASK-171–180, **partial**) — prompt injection defense, exfiltration/persona-break guards.

## Related tracks

- [[track-05-stt-pronunciation]] — supplies the transcripts and pronunciation scores this track's roleplay sessions consume.
- [[track-04-tts-audio]] — receives this track's dialogue stream for speech synthesis.
- [[track-09-nextjs-frontend]] — client-side counterpart (stub — source has no detailed task list for this track yet).
