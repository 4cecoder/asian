---
id: track-07-srs-engine
title: "Track 7: Spaced Repetition System (SRS) Mathematical Engine"
track: "Track 7: Spaced Repetition System (SRS) Mathematical Engine"
task_range: "SRS-001–SRS-100"
status: stub
tags: [srs, fsrs, spaced-repetition, math]
related: []
---

# Track 7: Spaced Repetition System (SRS) Mathematical Engine

**Status: stub.** The source specification only carries this track's row
in the top-level allocation table. It has no per-task bodies to extract —
see `docs/source-specs/README.md` for the full completeness census. Do not
treat anything below as verified task detail; it is scope only.

## Scope (from the allocation table)

100 tasks, IDs `SRS-001`–`SRS-100`. Primary tech stack and scope as stated
in the source: **FSRS v4.5 17-parameter model, power forgetting curve,
SM-2 fallback engine, leech quarantine, simulation.**

## What's missing

Per-task specs, dependency graph, and acceptance criteria for all 100
tasks. If a more complete revision of the source spec is found, extraction
should follow the same process as Tracks 1–6 — see
`docs/knowledge/PACKAGE-FORMAT.md` and the completed track pages for the
pattern (group by module/domain, one package per group, full task table
per package).

## Related tracks

- [[track-08-convex-db]] — SRS review state is very likely persisted here (Convex tables for cards/reviews), based on the platform's overall architecture, though this is inference, not sourced from a Track 7 task.
- [[track-09-nextjs-frontend]] — swipe-deck SRS player UI is called out in Track 9's scope line.
