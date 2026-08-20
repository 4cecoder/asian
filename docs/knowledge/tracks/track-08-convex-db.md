---
id: track-08-convex-db
title: "Track 8: Convex DB Schema, Reactive Queries, Mutations & Crons"
track: "Track 8: Convex DB Schema, Reactive Queries, Mutations & Crons"
task_range: "TASK-801–TASK-900"
status: stub
tags: [convex, database, schema, crons]
related: []
---

# Track 8: Convex DB Schema, Reactive Queries, Mutations & Crons

**Status: stub.** The source specification only carries this track's row
in the top-level allocation table, plus a single stray reference to
`TASK-801` in the table. It has no per-task bodies to extract — see
`docs/source-specs/README.md` for the full completeness census. Do not
treat anything below as verified task detail; it is scope only.

## Scope (from the allocation table)

100 tasks, IDs `TASK-801`–`TASK-900`. Primary tech stack and scope as
stated in the source: **Convex DB TypeScript schema, 15+ tables, ACID
mutations, optimistic updates, hourly maintenance crons.**

## What's missing

Per-task specs, the actual table schema (which 15+ tables, their fields
and relations), dependency graph, and acceptance criteria for all 100
tasks. If a more complete revision of the source spec is found, extraction
should follow the same process as Tracks 1–6 — see
`docs/knowledge/PACKAGE-FORMAT.md` and the completed track pages for the
pattern.

## Related tracks

- [[track-07-srs-engine]] — SRS card/review state is the most likely consumer of this schema, based on the platform's overall architecture (inference, not sourced from a Track 8 task).
- [[track-03-python-backend]] — the FastAPI backend's `/api/v1/*` routes almost certainly read/write through this DB layer, per Track 3's architecture diagram.
- [[track-09-nextjs-frontend]] — Convex's reactive-query model is designed for direct frontend consumption; the Next.js app is the likely primary client.
