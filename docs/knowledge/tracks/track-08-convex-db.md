---
id: track-08-convex-db
title: "Track 8: Convex DB Schema, Reactive Queries, Mutations & Crons"
track: "Track 8: Convex DB Schema, Reactive Queries, Mutations & Crons"
task_range: "TASK-801–TASK-900"
status: partial
tags: [convex, database, schema, auth]
related: [adr-0003-auth-architecture, track-07-srs-engine, track-09-nextjs-frontend]
---

# Track 8: Convex DB Schema, Reactive Queries, Mutations & Crons

**Status: partial.** The source specification never had per-task detail
for this track (see `docs/source-specs/README.md`) — but unlike Tracks
7/9/10, this one is no longer just a scope stub. A real Convex deployment
exists (`bytecats:asian:dev`, project `asian`), schema and auth are live,
and the Next.js app is actually wired to it. What's still missing:
query/mutation functions, crons, and the 100 individual tasks the
original spec never detailed.

## What actually exists (verified, not aspirational)

- **`apps/web/convex/schema.ts`** — `decks`, `cards`, `srsCardState`,
  `submissions` (community content ingestion queue), `phrases` (Track 10
  scope), `dictionaryEntries` (interlinear/dictionary data), plus
  `authTables` from `@convex-dev/auth`. Deployed — `bunx convex dev`
  pushed it and created all indexes for real.
- **Auth**: `@convex-dev/auth` with the Password provider, JWT signing
  keys generated and set on the deployment. See
  [[adr-0003-auth-architecture]] for why Convex Auth is separate from
  Track 3's FastAPI JWT auth, not a replacement for it.
- **Frontend wiring**: `apps/web/src/proxy.ts` (Next.js 16 renamed
  `middleware.ts` → `proxy.ts` — same `convexAuthNextjsMiddleware()`),
  `apps/web/src/components/ConvexClientProvider.tsx`, and
  `apps/web/src/app/layout.tsx` wrapped in
  `ConvexAuthNextjsServerProvider`. Build passes with and without
  `.env.local` present (pages are dynamic/proxy-gated, so the Convex
  client only actually needs its URL at runtime, not build time) —
  verified both ways before committing.
- **Netlify**: `NEXT_PUBLIC_CONVEX_URL` / `NEXT_PUBLIC_CONVEX_SITE_URL`
  set on the site (pointing at the **dev** deployment — see "What's not
  done" below).

## What's not done

- **No query or mutation functions yet.** The schema exists; nothing
  reads or writes it besides what `@convex-dev/auth` provides internally.
- **No production Convex deployment.** Netlify currently points at the
  `dev` deployment (`fearless-gull-12`) because that's what exists —
  fine for now, but swap to a real prod deployment
  (`bunx convex deploy`) before anything resembling real users show up.
  `CONVEX_DEPLOY_KEY` isn't set as a GitHub secret yet either (see
  `SECURITY.md`) — needed once CI should run `convex deploy` itself.
- **No crons.**
- The original 100 numbered tasks (`TASK-801`–`TASK-900`) still don't
  exist anywhere — this schema was built from the current product
  direction (community content ingestion, SRS, phrasebook, dictionary
  data), not from source-spec task bodies, because none exist to extract.

## Related

- [[adr-0003-auth-architecture]]
- [[track-07-srs-engine]] — `srsCardState` table is the storage shape for this; FSRS scheduling logic itself isn't implemented.
- [[track-03-python-backend]] — separate auth domain; see the ADR for the integration point if/when they need to talk.
- [[track-09-nextjs-frontend]] — the actual consumer; `apps/web` is wired to this deployment.
- `apps/web/convex/README.md` — setup and dictionary-seeding instructions.
