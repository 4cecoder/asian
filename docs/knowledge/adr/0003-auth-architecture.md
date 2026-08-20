---
id: adr-0003-auth-architecture
title: "ADR 0003: Auth — Convex Auth for the web app, separate from Track 3's FastAPI JWT"
track: meta
status: complete
tags: [adr, auth, convex, decision]
related: [track-08-convex-db, track-03-python-backend]
---

# ADR 0003: Auth architecture

## Status

Accepted.

## Context

Two auth-shaped things already exist in this repo's scope, and they
needed to be reconciled before any real feature (community content
ingestion, Anki import, per-user SRS state) could be built without
guessing:

1. **Track 3** (`docs/knowledge/modules/track-03/07-dependency-injection.md`)
   already fully specs JWT Bearer + API-key auth for the Python/FastAPI
   gateway — `OAuth2PasswordBearer`, `/api/v1/auth/token`, RBAC role
   scopes (PY-063–PY-065). This is real, detailed, in the source spec.
2. **Track 8** (Convex) was a scope-only stub with no auth story at all
   until this ADR — but Convex needs _some_ identity system the moment
   any table has a `userId` field, which `schema.ts` now does.

Building a second, independent, hand-rolled auth system for Convex
(competing with Track 3's) would mean two sources of truth for "who is
this user" — a predictable source of bugs and confused permission
checks.

## Decision

**Convex Auth** (`@convex-dev/auth`, Password provider) is the identity
system for the Next.js web app and everything that reads/writes Convex
directly (decks, cards, SRS state, community submissions). It is a
**separate concern** from Track 3's FastAPI auth, not a replacement for
it:

- Convex Auth owns: web app sign-up/login, sessions, and the `users`
  table (via `authTables`) that every other Convex table's `userId`
  field points at.
- Track 3's FastAPI JWT/API-key auth owns: the real-time audio/LLM
  gateway (TTS/STT/roleplay WebSocket + REST paths) — a different
  runtime, different latency profile, and per Track 3's own spec,
  already fully designed.

**If/when the two need to talk** (e.g. a logged-in web user opens a
roleplay session that hits the FastAPI gateway), the integration point
is: Convex Auth issues a JWT: configure Track 3's existing
`get_current_user` JWT validator (PY-063) to trust Convex's JWKS/issuer
instead of minting its own separate token. That's a Track 3
implementation detail for whenever that track is actually built — not
solved here, just not architecturally blocked either.

## Why Password provider, not OAuth, to start

Lowest friction to get a real deployment running end to end. Add
Google/GitHub/Apple sign-in providers later if the product needs them —
`@convex-dev/auth` supports adding providers without a schema migration
(`authTables` doesn't change shape based on which providers are
configured).

## Consequences

- `apps/web/convex/auth.ts`, `auth.config.ts`, `http.ts` are real,
  committed, and don't require a live deployment to be _valid_ — but
  they do nothing until someone runs `bunx convex dev` once (interactive
  team selection, can't be scripted/agent-driven — see
  `apps/web/convex/README.md`).
- Every table in `schema.ts` with a `userId: v.id("users")` field is
  implicitly depending on this decision.
- `docs/knowledge/tracks/track-08-convex-db.md` status moves from `stub`
  to `partial` — schema exists, but query/mutation functions and the
  actual frontend wiring (provider, middleware) don't yet.
