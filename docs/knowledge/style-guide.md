---
id: style-guide
title: Documentation Style Guide
track: meta
status: complete
tags: [meta, conventions, writing]
related: [ai-agent-docs-guide, package-format]
---

# Documentation Style Guide

Every doc in this repo — knowledge packages, READMEs, code comments that
must exist, PR descriptions — follows the rules below. They're adapted
from **ASD-STE100 (Simplified Technical English), Issue 9**, the aerospace
industry's controlled-language standard for maintenance and engineering
documentation. ASD-STE100 itself is not reproduced here (its usage rights
are restricted to specific aerospace/defense member organizations, and
this project isn't one); what follows is its underlying _principles_,
restated in plain language and re-aimed at software specs instead of
aircraft manuals. Where ASD-STE100 says "use only the ~2,500 words in the
approved dictionary," we say "prefer a small, consistent vocabulary" —
same idea, no literal word list to enforce.

The point of all of it: a reader — human or AI agent — should get the
correct meaning on the first pass, without re-reading.

## Word choice

- **Reuse the same word for the same thing, every time.** If a table is
  called `srs_cards` in one doc, don't call it "the cards table," "the
  SRS table," and "the card store" in three other docs. Pick one name and
  keep it.
- **Prefer short, common, unambiguous words** over long or clever ones.
  "Use" beats "utilize." "Start" beats "commence."
- **Don't invent synonyms to avoid repetition.** Repetition is fine in
  technical writing; varying the word for the same concept is confusing,
  not elegant.
- **Avoid slang, regional idiom, and jargon** that isn't already a
  standard term in this stack (Kubernetes, FastAPI, Next.js, etc. terms
  are fine — they're the domain vocabulary; "spin up," "gotcha," "footgun"
  are not).
- **Use one part of speech per word, consistently.** Don't use "gate" as
  a noun in one place ("the CI gate") and a verb in another ("gate the
  release") if it can be avoided — pick a construction that keeps the
  word's role stable.

## Sentence construction

- **Write short sentences.** Roughly 20 words for instructions, 25 for
  descriptive/explanatory text. If a sentence runs longer, it usually
  contains two ideas — split it into two sentences.
- **One instruction per sentence**, unless two actions genuinely happen
  at the same time ("Hold the panel open and install the fastener").
  Don't chain unrelated steps with "and" or "then."
- **Use active voice.** "The scheduler runs the job," not "the job is run
  by the scheduler." Passive voice is acceptable only when the actor is
  genuinely unknown or irrelevant ("the request was corrupted in
  transit").
- **Use imperative mood for instructions.** "Create the file," not "the
  file should be created" or "you will need to create the file."
- **Don't drop words to save space.** No contractions in written docs
  ("do not," not "don't"), and don't omit articles/subjects to shorten a
  sentence — it reads faster but parses worse.
- **Put the condition before the command.** "When the build fails, roll
  back the deployment" — not "roll back the deployment when the build
  fails" buried at the end where it can be missed.

## Instructions, procedures, and acceptance criteria

- **Say exactly what to run and exactly what should happen.** Not "make
  sure tests pass" — say `bun test` exits 0 and prints `0 failing`.
- **Number or letter multi-step procedures.** Don't bury a 5-step process
  in one paragraph.
- **Keep notes and instructions separate.** A note gives background
  information; it never contains a command. If a "note" contains an
  instruction, it's actually a step and belongs in the numbered list.
- **State the risk, not just the rule, for anything destructive.** "Do
  not run this against prod — it drops the namespace and there is no
  undo" beats a bare "don't run this in prod."

## Structure

- **One topic per paragraph.** If a paragraph covers two unrelated
  things, split it.
- **Keep paragraphs short** — roughly six sentences is the ceiling before
  it should split.
- **Use vertical lists for anything with three or more parallel items** —
  a list of files, a list of steps, a list of config keys. Prose forces
  the reader to parse structure that a list gives for free.
- **Give information gradually**, most-important-first, and connect
  sentences with plain connecting words (_and, but, then, thus, as a
  result_) so the logical flow is explicit rather than implied.

## Applying this in practice

See [[ai-agent-docs-guide]] for the sharper version of these rules aimed
specifically at documentation an AI coding agent will read and act on —
task specs, `CLAUDE.md`-style instructions, and acceptance criteria. See
[[package-format]] for how these rules apply to the knowledge packages in
this directory specifically.
