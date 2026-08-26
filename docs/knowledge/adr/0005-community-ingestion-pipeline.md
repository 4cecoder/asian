---
okf_version: "0.2"
package_id: adr-0005-community-ingestion-pipeline
title: "ADR 0005: Community content ingestion — submit, AI-refine, human moderation, versioned packets"
track: meta
status: stable
stale_after: 2027-08-25
tags: [adr, convex, moderation, content-pipeline, decision]
related:
  [
    adr-0006-okf-knowledge-format,
    adr-0003-auth-architecture,
    content-packet-format,
    track-08-convex-db,
  ]
---

# ADR 0005: Community content ingestion pipeline

## Status

Accepted and implemented. This ADR records the shape that is already built
in `apps/web/convex/submissions.ts`, `apps/web/convex/schema.ts`, and
`apps/web/convex/cron.ts`. The open decisions at the bottom are the parts
that are deliberately not settled.

## Context

Community members contribute learning content (phrases, cards, dictionary
corrections, example sentences, situation packs). Raw community input must
never reach other learners directly: it needs machine refinement for
consistency and a human check for quality. The pieces that make this
possible now exist:

- Convex Auth identities ([[adr-0003-auth-architecture]]) give every
  submission a real `submitterId`.
- `@convex-dev/auth`'s `authTables` does not carry a role field, so
  moderator identity needed a home of its own.
- [[content-packet-format]] defines the OKF v0.2 packet contract the
  refined output should end up in; [[adr-0006-okf-knowledge-format]]
  makes that format project-wide.

## Decision

The pipeline has four stages:

```
submit → AI refine (Python worker) → human moderation → publish as
                                              a versioned content packet
```

### Tables (`convex/schema.ts`)

| Table            | Role                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submissions`    | The queue. One row per contribution. Status field drives the whole flow. Indexes: `by_submitter`, `by_status`, `by_status_createdAt` (FIFO scans), `by_submitter_createdAt` (rate limiting + my-submissions). |
| `userRoles`      | Side table keyed by user: `role: "moderator"                                                                                                                                                                  | "admin"`. Lives outside `authTables`because that library owns and manages the`users`table shape. Checks live in`convex/authz.ts` (`requireUser`, `requireModerator`). |
| `contentPackets` | Published output: `packetId`, `language`, numeric `version`, `entries[]`, status `draft                                                                                                                       | published`, `publishedAt`. Each entry carries its `sourceSubmissionId`, so contributor provenance survives into the artifact.                                         |

Submission statuses are exactly:
`pending | processing | needsReview | approved | rejected`.

### Functions (`convex/submissions.ts`)

| Function                | Kind             | Access             | What it does                                                                                                                                                                                                                                 |
| ----------------------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `submitContent`         | mutation         | any signed-in user | Validates the payload against the declared kind, enforces the rate limit, inserts with status `pending`.                                                                                                                                     |
| `mySubmissions`         | query            | submitter          | Newest-first list of the caller's own submissions (default 50, capped at 100).                                                                                                                                                               |
| `moderationQueue`       | query            | moderator/admin    | Lists submissions by status `pending`, `processing`, or `needsReview`.                                                                                                                                                                       |
| `reviewSubmission`      | mutation         | moderator/admin    | Sets `approved` or `rejected` with optional reviewer notes. Only `pending`/`needsReview` rows can be reviewed.                                                                                                                               |
| `beginProcessing`       | internalMutation | worker path        | Claims a `pending` row by flipping it to `processing`. Fails if not pending, so two workers cannot claim the same row.                                                                                                                       |
| `finishProcessing`      | internalMutation | worker path        | Ends refinement: outcome is `needsReview` (hand to a human) or `approved` (auto-approve). Stores `aiNotes` and the refined payload. Requires current status `processing`.                                                                    |
| `sweepStaleSubmissions` | internalMutation | cron               | Flags `pending` rows older than 24h as `needsReview`; releases rows stuck in `processing` for more than 6h back to `pending`. Returns `{flagged, released}` counts.                                                                          |
| `publishContentPacket`  | mutation         | moderator/admin    | Bundles approved submissions into one row in `contentPackets`. Rejects empty lists, unapproved submissions, and language mismatches. Stamps each consumed submission's `publishedPacketId` so it cannot be republished into a second packet. |

### Rate limit

`submitContent` allows **10 submissions per user per rolling 24h window**.
There is no separate quota table; the limit is computed from existing
`submissions` rows via the `by_submitter_createdAt` index.

### Cron sweep

`convex/cron.ts` schedules `sweepStaleSubmissions` **hourly**. It keeps the
queue honest while the real refinement pass lives elsewhere: nothing rots
in `pending` past 24h, and a crashed worker cannot deadlock a row in
`processing` past 6h.

### Where the Python worker fits

The actual LLM refinement runs in the separate Python service
(`apps/worker/`, Track 3 scaffold). The Convex side exposes
`beginProcessing` / `finishProcessing` as `internalMutation`s — callable
only through an authenticated internal path, not from client code. That
path is the bearer-secret httpActions described in the decisions below.

## Open decisions

These are recorded so nobody mistakes silence for agreement:

1. **Worker authentication path — DECIDED (2026-08-25).** The worker calls
   two httpActions in `convex/http.ts`: `POST /api/worker/claim` and
   `POST /api/worker/complete`, authenticated by
   `Authorization: Bearer <WORKER_SECRET>`. The secret lives as a Convex
   env var (`bunx convex env set WORKER_SECRET ...`) per SECURITY.md, and
   the worker holds its copy as `CONVEX__WORKER_SECRET`
   (`apps/worker/app/settings.py`). Function access tokens and a service
   identity were rejected: both couple the worker to Convex Auth machinery
   it doesn't otherwise use. The internal mutations keep their status
   guards, so a leaked secret alone still cannot corrupt a row's state
   machine.
2. **Anonymous submissions.** `submitContent` currently requires a signed-in
   user (`requireUser`). Whether anonymous contributions should ever be
   accepted (and under what abuse controls) is undecided.
3. **Packet storage location.** `publishContentPacket` writes packet rows
   into the `contentPackets` table. Whether full OKF v0.2 packet payloads
   ([[content-packet-format]] anatomy) also live in Convex storage, object
   storage, or the repo is undecided; today only the normalized entries are
   stored.
4. **License default.** Packets need a public license per
   [[content-packet-format]]. **CC-BY-4.0 is proposed** as the default
   applied to community submissions at publish time; not yet ratified, and
   the submitter-facing license grant flow does not exist yet.

## Consequences

- Moderation is a real gate: no code path publishes without a moderator
  role check.
- Every published entry keeps its source submission id, so attribution and
  audit survive into the packet.
- The rate limit costs one indexed query per submit and no extra table;
  raising the cap is a constant change.
- With the worker auth path decided, the Python worker
  (`apps/worker/app/routers/internal.py`) drives the loop end to end:
  claim -> refine -> complete. Until real LLM refinement lands (Tracks
  4-6), the worker's deterministic pass approves only payloads that are
  already shape-clean; everything else goes to `needsReview`. The hourly
  sweep remains the backstop for rows the worker never reaches.

## Related

- [[adr-0006-okf-knowledge-format]] — why the output format is OKF v0.2.
- [[content-packet-format]] — the packet contract itself.
- [[adr-0003-auth-architecture]] — the identity system underneath.
- [[track-08-convex-db]] — the tables this pipeline reads and writes.
