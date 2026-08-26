---
okf_version: "0.2"
package_id: adr-0007-srs-engine-fsrs
title: "ADR 0007: SRS engine — FSRS v4.5 primary, SM-2 fallback, pure library boundary"
track: meta
status: stable
stale_after: 2027-08-25
tags: [adr, srs, fsrs, sm-2, spaced-repetition, convex, decision]
related: [track-07-srs-engine, track-08-convex-db, adr-0003-auth-architecture, index]
---

# ADR 0007: SRS engine — FSRS v4.5 primary, SM-2 fallback

## Status

Accepted. Implementation is **in flight this sprint** (2026-08-25): the
scheduler library and the widened rating union exist as working-tree
changes and land through the Track 7 pull requests. Until they merge,
`convex/srs.ts` on `main` still runs the placeholder scheduler described
below. This page records the decision so parallel work does not fork it;
re-check the code before trusting any specific function name here.

## Context

[[track-07-srs-engine]] is a scope-only stub in the source specification.
Its one-line allocation-table scope fixes the algorithm choices anyway:
"FSRS v4.5 17-parameter model, power forgetting curve, SM-2 fallback
engine, leech quarantine, simulation." Those words decide the "which
algorithm" question; they do not decide four questions the implementation
actually hit:

1. Where does scheduling code live, and what can it depend on?
2. What ratings does the review flow accept?
3. What happens to `srsCardState` rows written by the placeholder
   scheduler already running in production development use?
4. When does SM-2 take over from FSRS?

Meanwhile the current code has a deliberately honest placeholder:
`recordReview` in `apps/web/convex/srs.ts` bumps `dueAt` by a fixed one
day on "good" and leaves it unchanged on "again". Its comment warns that
this is not a spaced-repetition algorithm. The storage shape in
`convex/schema.ts` (`state`, `stability`, `difficulty`, `dueAt`,
`lastReviewedAt`) already matches what both real engines need, so no
schema migration is required.

## Decision

### 1. FSRS v4.5 is the scheduler

The platform schedules reviews with **FSRS v4.5**: the 17-parameter model
(`w0`–`w16`), the power forgetting curve, and a requested retention of
0.9, per the open-spaced-repetition reference implementation. The shipped
parameters are the canonical FSRS-4.5 defaults. Per-user parameter
optimization from review history is future work inside Track 7's
simulation scope; it is not decided here and nothing may hard-code an
assumption that optimization exists.

### 2. Scheduling lives in a pure library at `src/lib/srs`

All scheduling math lives in `apps/web/src/lib/srs/` as pure TypeScript
functions. The library has zero runtime dependencies. It imports no React
and no Convex modules. It performs no I/O. Time enters and leaves as
integer Unix epoch milliseconds; stability is a float in days;
difficulty is a float in [1, 10].

The Convex layer consumes the library. Queries and mutations in
`apps/web/convex/srs.ts` own identity, authorization, reads, and writes
of `srsCardState`; the library owns every number that gets written. This
split keeps the math unit-testable without a database, keeps persistence
concerns out of the algorithms, and lets a future non-web consumer (for
example the Python worker running Track 7 simulations) reimplement or
call the same formulas without dragging in app framework code.

### 3. Rating union widens to again / hard / good / easy

`recordReview` accepts exactly `"again" | "hard" | "good" | "easy"` — the
FSRS grade scale (1–4). The previous union was `"again" | "good"`, which
cannot express the grades FSRS updates on. UI grade buttons derive their
type from the deployed mutation's args rather than declaring a second
rating type, so the interface and the mutation cannot drift apart.

### 4. SM-2 is the fallback engine

Classic SuperMemo SM-2 serves two roles:

- **Unusable-state recovery.** When stored state is corrupt or FSRS
  parameters are invalid (wrong length, non-finite weights), the reviewer
  falls back to SM-2 for that card instead of failing the review.
- **Cold start floor.** Until per-user optimized parameters exist, cards
  whose state cannot seed FSRS cleanly start on SM-2 intervals.

SM-2 stores its ease factor inside the same `difficulty` field through a
fixed linear bijection (difficulty 1–10 maps to ease factor 2.5–1.3), so
one table shape serves both engines and a card can switch between them
without data loss. Every SM-2 output is well-formed FSRS input state by
construction.

### 5. Placeholder rows migrate lazily, not in bulk

Rows written by the placeholder scheduler are **not** rewritten by a
migration. On each card's next review, the engine checks the stored
`stability` and `difficulty`. Values that are missing, non-finite, or
outside the valid range mark the row as cold-start: the engine re-seeds
state from scratch for that review instead of trusting the old numbers.

Rationale: the placeholder wrote only two possible outcomes (a fixed
one-day bump or none), so old rows carry almost no scheduling
information worth preserving. A bulk rewrite would add a one-time
failure mode for near-zero fidelity gain. Lazy repair converges within
days of normal reviewing and touches only rows a user actually revisits.

## Explicitly not decided here

- **Leech quarantine.** Named in Track 7's scope line but not implemented
  yet. It needs thresholds (lapse count) and quarantine semantics
  (hidden from rotation versus tagged) that deserve their own decision
  once lapse data accumulates. Do not treat silence here as approval of
  any specific leech design.
- **Parameter optimization and simulation.** Part of Track 7's stated
  scope; deferred until review history exists to optimize against.

## Implementation status (2026-08-25)

| Piece                                                   | State                                     |
| ------------------------------------------------------- | ----------------------------------------- |
| Decision on this page                                   | Accepted                                  |
| Pure library (`fsrs.ts`, `sm2.ts` under `src/lib/srs/`) | In flight — working tree, unmerged        |
| Widened rating union in `convex/srs.ts`                 | In flight — working tree, unmerged        |
| Review UI grades derived from mutation args             | In flight — working tree, unmerged        |
| Unit tests for the library                              | Required before merge per CONTRIBUTING.md |
| Leech quarantine                                        | Not designed                              |
| Per-user parameter optimization                         | Not designed                              |

## Consequences

- No schema change: `srsCardState` already stores the fields both
  engines read and write, and the existing `by_user_due` index keeps
  answering due-today queries unchanged.
- The placeholder comment in `convex/srs.ts` goes away when the real
  engine lands; until then the warning stays accurate on `main`.
- Review sessions gain two buttons. Any UI copy must not promise
  intelligent scheduling until this merges.
- Swapping or upgrading the algorithm later means editing one pure
  module, not a Convex function.
- Old rows self-heal on touch; there is no migration script to run and
  no deployment-order constraint between schema and code.

## Related

- [[track-07-srs-engine]] — the stub whose scope line fixes FSRS v4.5
  and SM-2 fallback.
- [[track-08-convex-db]] — owns the `srsCardState` table this engine
  reads and writes.
- [[adr-0003-auth-architecture]] — the identity behind per-user review
  state.
