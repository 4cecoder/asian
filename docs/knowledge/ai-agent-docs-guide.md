---
id: ai-agent-docs-guide
title: Writing Documentation for AI Agents
track: meta
status: complete
tags: [meta, conventions, ai-agents, writing]
related: [style-guide, package-format]
---

# Writing Documentation for AI Agents

[[style-guide]] covers general documentation writing, adapted from
ASD-STE100. This page sharpens those same principles for the case where
the reader is an AI coding agent executing a task spec, a `CLAUDE.md`, or
acceptance criteria — not a human skimming for context. An agent doesn't
infer intent from tone or fill gaps with judgment the way a person does;
it does exactly what the text says, so the text has to say exactly the
right thing.

## Why this needs its own rules

A human reader tolerates ambiguity — they pause, guess the likely intent,
maybe ask. An agent either has an unambiguous instruction to execute, or
it doesn't, and if it doesn't it will make something up that looks
plausible and is wrong. Every rule below exists to remove a place where
that can happen.

## Rules

**1. One verifiable action per step, in imperative mood.**
Same rule as the style guide, but stricter: "step" here means one thing
that either happened or didn't. "Set up the database" is not a step —
it's a whole project. "Run `bun install` in `apps/web`" is a step.

**2. Acceptance criteria are a command plus an expected result — never a feeling.**
This project's own source spec already does this well, consistently,
across hundreds of tasks. From `docs/source-specs/complete-spec-nextjs16.md`:

> **Good** (TASK-001): `kubectl apply --dry-run=client -f k8s/base/namespace.yaml` passes with code 0. Running `kubectl get ns lingo-prod --show-labels` outputs all PSA and environment metadata.
>
> **Good** (PY-001): `uv sync` builds virtualenv cleanly in < 5s. `uv run python -c "import fastapi, pydantic; print(fastapi.__version__)"` outputs valid version.
>
> **Bad** (hypothetical, the pattern to avoid): "Make sure the environment is set up correctly and the build works."

The bad version gives an agent nothing to run and nothing to check against
— it has to invent both the verification command and the definition of
"correctly." The good version leaves nothing to invent.

**3. Declare dependencies explicitly, by ID, every time.**
The source spec tags every task with `Dependencies: TASK-XXX` or
`Dependencies: None` — never left implicit, never "see above." An agent
picking up one task file in isolation (which is exactly how this
knowledge base is organized — see [[package-format]]) can't infer
"comes after the previous one" from document order, because it may not
see the previous one. If a dependency is real, name it by ID.

**4. Never let a pronoun's antecedent be ambiguous.**
"Update the config and restart it" — restart *what*, the config or the
service? Repeat the noun instead of using "it," "this," or "that" whenever
more than one candidate noun is in play, even though it reads slightly
more repetitive to a human.

**5. Use the same name for the same file, table, or concept everywhere it's referenced.**
If a package references `k8s/base/namespace.yaml` in one task and calls it
"the namespace manifest" in the next without repeating the path, an agent
executing tasks out of order (which autonomous agents will do) has to
guess whether they're the same file. Repeat the concrete identifier
(exact path, exact table name, exact env var) at every reference, not just
the first one.

**6. Prefer tables and lists to prose for anything mechanically parsed.**
A step sequence, a set of config keys, a set of file paths — put it in a
list or table, not a paragraph. This is the same rule as the style guide's
"use vertical lists," but for agent-facing docs it's not just readability:
a table row is a unit an agent can act on independently; a fact buried
mid-paragraph is easy to skip.

**7. Don't imply a step that isn't written down.**
If a task requires creating a directory before writing a file into it,
say so as its own step. An agent won't infer "well obviously I need
`mkdir -p` first" as reliably as a human will — write every step that
must actually happen, even ones that feel too obvious to state.

**8. State the blast radius of anything destructive or hard to reverse.**
"This overwrites the production ConfigMap" is a load-bearing fact for an
agent deciding whether to ask before running something — put it in the
task text itself, not just tribal knowledge in someone's head.

## Applying this to this repo's own task specs

Every module package under `docs/knowledge/modules/` inherits a task table
from the source spec, condensed per [[package-format]]. When condensing,
these agent-facing rules take priority over brevity: it's fine for a
condensed spec cell to be a little longer if that's what it takes to keep
the acceptance criterion literal (exact command, exact expected output)
rather than paraphrased into a vague "verify it works."
