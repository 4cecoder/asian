---
id: t06-guardrails-injection-defense
title: "Cluster 8: Prompt Injection Defense & Guardrails"
track: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
task_range: "TASK-171–TASK-180 (source ends mid-TASK-177)"
status: partial
tags: [guardrails, security, prompt-injection, llm]
related: [t06-llm-inference-core, t06-websocket-protocol]
---

# Cluster 8: Prompt Injection Defense & Guardrails

**This package is incomplete because the source specification is
truncated here.** The document ends mid-sentence inside TASK-177's
Technical Specification, with no Acceptance Criteria given for TASK-177,
and TASK-178, TASK-179, TASK-180 are entirely absent from the source (the
cluster header promises `TASK-171–TASK-180`, i.e. 10 tasks; only 6 are
fully specified and a 7th is a partial fragment). Do not invent content
for TASK-177's missing acceptance criteria or for TASK-178–180 — if a more
complete version of the source spec turns up, re-run this extraction.

Covers input-side and output-side LLM safety for the roleplay engine:
injection/jailbreak detection, prompt sandboxing, token-smuggling
detection, output exfiltration blocking, persona-break detection, and
structured-output schema enforcement.

## Tasks

| ID | Title | Depends on | Spec (condensed) | Acceptance check |
|---|---|---|---|---|
| TASK-171 | Adversarial Prompt Injection & Jailbreak Classifier | None | `guardrails/injection_classifier.py`: fast classifier (regex + lightweight ONNX DeBERTa) checks user input for injection signatures ("ignore previous instructions", "you are now DAN", "system prompt override", "pretend you have no rules"). | `uv run pytest tests/guardrails/test_injection_classifier.py -v` flags 100% of OWASP LLM Top 10 injection test prompts. |
| TASK-172 | Delimiter Escaping & System Prompt Sandboxing | TASK-171 | `guardrails/prompt_sandbox.py`: `PromptSanitizer` escapes XML/Markdown delimiters in raw user STT transcripts before interpolating into the LLM context. | `uv run pytest tests/guardrails/test_prompt_sandbox.py -v` verifies delimiter neutralization. |
| TASK-173 | Token Smuggling & Multi-Turn Instruction Override Filter | TASK-171 | `guardrails/token_smuggling.py`: `TokenSmugglingFilter` detects base64, rot13, unicode homoglyph substitution, and spaced-character evasions (e.g. "s y s t e m"). | `uv run pytest tests/guardrails/test_token_smuggling.py -v` decodes and sanitizes obfuscated injection attempts. |
| TASK-174 | System Prompt Exfiltration & Leakage Blocker | None | `guardrails/exfiltration_guard.py`: `ExfiltrationGuard` scans LLM output streams for verbatim leakage of internal instructions, API keys, or prompt template markers. Leakage similarity > 70% ⇒ drop stream, emit canned persona response. | `uv run pytest tests/guardrails/test_exfiltration_guard.py -v` prevents deliberate prompt extraction attacks. |
| TASK-175 | Out-of-Role & Persona Break Detector | None | `guardrails/persona_guard.py`: `PersonaGuard` monitors outputs for assistant self-identification ("As an AI language model...", "I cannot assist with that..."). Truncates turn, regenerates at higher persona-constraint temperature. | `uv run pytest tests/guardrails/test_persona_guard.py -v` catches and replaces out-of-character responses. |
| TASK-176 | Structured Output Regex & AST Validation Enforcement | TASK-106 | `guardrails/schema_guard.py`: `SchemaGuard` runs AST validation on extracted pedagogical JSON chunks before dispatching to client sockets. Discards invalid keys, fills missing fields with defaults. | `uv run pytest tests/guardrails/test_schema_guard.py -v` ensures zero client runtime JSON parse crashes. |
| TASK-177 | Unsafe Code & Script Execution Guard | None | **Fragment — source cuts off here.** `guardrails/code_guard.py`: `CodeExecutionGuard` strips executable scripts from LLM output. The rest of the spec (what exactly gets stripped, exact behavior) is not present in the source document. | **Not present in source.** No acceptance criteria given. |
| TASK-178 | *(not in source)* | — | Cluster header claims TASK-171–TASK-180 exist; TASK-178 has no content in the source document. | — |
| TASK-179 | *(not in source)* | — | Same as TASK-178 — absent from source. | — |
| TASK-180 | *(not in source)* | — | Same as TASK-178 — absent from source. | — |

## Related packages
- [[t06-llm-inference-core]] — TASK-176's structured-output guard is the output-side counterpart to TASK-106's structured-output *enforcement*.
- [[t06-websocket-protocol]] — guardrail rejections need a path to the client; likely surfaces via `SESSION_ERROR` (TASK-111) once TASK-178–180 are known.
