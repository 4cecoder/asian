---
id: adr-0004-frontend-architecture
title: "ADR 0004: Frontend route map, component conventions, and state strategy"
track: meta
status: complete
tags: [adr, nextjs, frontend, architecture, routing]
related: [track-09-nextjs-frontend, adr-0003-auth-architecture, track-08-convex-db]
---

# ADR 0004: Frontend route map, component conventions, and state strategy

## Status

Accepted (plan) — this is the design, not yet the build. Route group
folders exist as a minimal, build-verified scaffold; most pages inside
them don't have real content yet. Track this doc's "What's not built"
section as the honest state, not the route map itself.

## Context

Track 9 (`docs/knowledge/tracks/track-09-nextjs-frontend.md`) was, and
still is, a scope-only stub — the source spec never detailed its 100
tasks. Real product surface now exists to plan against (Convex schema:
decks, cards, SRS state, submissions, phrases, dictionary; Convex Auth
wired in), so this ADR is the actual frontend plan, superseding "wait
for a more complete source doc."

## Decision: route map

Next.js 16 App Router, four route groups so URL paths stay clean while
each section gets its own layout/chrome:

```
src/app/
  (marketing)/            public, unauthenticated, SEO-relevant
    layout.tsx              marketing nav/footer
    page.tsx                  landing page ("/")

  (auth)/                  sign-in/up + onboarding, minimal chrome (no app nav)
    layout.tsx
    sign-in/page.tsx
    sign-up/page.tsx
    onboarding/
      layout.tsx             step shell + progress indicator
      language/page.tsx        step 1 — target language(s): ja/ko/zh (th/vi lower priority)
      goal/page.tsx              step 2 — why (travel date, motivation)
      placement/page.tsx          step 3 — optional placement check
      complete/page.tsx            step 4 — redirect into (app)

  (app)/                   authenticated end-user product
    layout.tsx               auth-gated (proxy.ts + isAuthenticatedNextjs), app nav shell
    page.tsx                   home — due reviews today, streak, quick actions
    review/page.tsx              SRS review session (swipe deck)
    decks/
      page.tsx                    deck list
      new/page.tsx                  create/import (manual, Anki upload, Quizlet reimport)
      [deckId]/page.tsx              deck detail / card list
    phrasebook/
      page.tsx                    situational phrase browser
      [situation]/page.tsx          one situation's phrases
    dictionary/page.tsx          dictionary search (ja/ko/zh)
    roleplay/page.tsx            voice roleplay entry (blocked on Track 6/3 backend)
    submissions/page.tsx         "my submissions" status tracker
    profile/page.tsx             account + language prefs

  (admin)/                 developer/moderator only — see "End-user vs
                            developer separation" below for the gate
    layout.tsx                role-gated, utilitarian nav (not consumer chrome)
    page.tsx                    queue depth, deployment health at a glance
    submissions/
      page.tsx                    moderation queue
      [id]/page.tsx                  review one submission, approve/reject
    dictionary/page.tsx          curated corrections to imported entries
```

No `api/auth/*` route handler — `@convex-dev/auth`'s HTTP routes are
registered in `convex/http.ts` (already done) and reached through
`src/proxy.ts`'s `convexAuthNextjsMiddleware()`, not a Next.js route file.

## End-user vs. developer separation

Two mechanisms, not one:

1. **Route group** — `(app)` and `(admin)` are structurally separate
   subtrees with their own `layout.tsx`. An end user never sees admin
   nav chrome even by accident; there's no shared layout to leak from.
2. **Role gate** — `(admin)/layout.tsx` checks the signed-in user's role
   server-side and redirects non-admins before rendering anything.
   `authTables` (from `@convex-dev/auth`) doesn't carry a role field —
   add one (`role: v.optional(v.union(v.literal("admin"), v.literal("moderator")))`
   on the `users` table, or a separate `roles` table if per-resource
   permissions show up later) as a small, deliberate `schema.ts` change
   when `(admin)` gets real content, not spread implicitly across pages.

## Decision: component conventions ("reusable legos")

```
src/components/
  ui/                 primitives — Button, Input, Card, Badge, ProgressBar.
                       Add via `bunx shadcn@latest add <name>` per-component,
                       don't hand-roll what shadcn already gives you correctly.
  layout/             AppShell, AdminShell, MarketingShell, OnboardingStepShell
  features/
    auth/               SignInForm, SignUpForm
    onboarding/          LanguagePicker, GoalPicker
    decks/                DeckCard, DeckList, CardEditor
    review/                ReviewCard, SwipeDeck, ReviewProgress
    phrasebook/             PhraseCard, SituationPicker
    dictionary/              DictionarySearchBar, DictionaryEntryCard
    submissions/              SubmissionStatusBadge, AnkiUploadDropzone
```

Rules, not guidelines — a PR that violates these should get a change
request, same bar as `bun run check` failing:

- **One exported component per file.** A tiny private sub-component used
  only by its parent can live in the same file if it's under ~20 lines;
  anything bigger gets its own file next to the parent.
- **~150 lines is the signal to split a component file**, not a hard
  limit — when you hit it, the usual fix is extracting a sub-component
  (`features/x/CardEditorToolbar.tsx`) or a hook
  (`features/x/useCardEditor.ts`), not shrinking variable names.
- **`ui/` never imports from `features/`.** Primitives don't know about
  product concepts; dependency direction is one-way
  (`features/` → `ui/` and `layout/`, never back).
- **A page (`app/**/page.tsx`) composes; it doesn't implement.** Real
  logic and markup live in `features/`, so a page file reads like a
  short list of components, not a wall of JSX.

## Decision: state and data — three tools, three different jobs

The request was "use context, TanStack Query, and Server Actions" — all
three are used, but not interchangeably or for the same kind of data.
Using TanStack Query to wrap Convex queries would add a second cache
layer fighting Convex's own reactive one for no benefit; that's a
concrete anti-pattern this section exists to rule out up front.

| Data / state                                                                                                                                                                 | Tool                                                                   | Why                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Convex-backed data (decks, cards, SRS state, submissions, phrases, dictionary, auth)                                                                                         | **Convex's own `useQuery`/`useMutation`/`useAction`** (`convex/react`) | Already reactive, already cached, already deduped — this _is_ the "TanStack Query" for this data. Wrapping it in TanStack Query duplicates the cache for nothing.            |
| Calls to the separate FastAPI gateway (TTS/STT/roleplay — Track 3, once built)                                                                                               | **TanStack Query**                                                     | A conventional REST/WebSocket backend that isn't reactive on its own — exactly what TanStack Query is for: caching, retries, request dedup.                                  |
| Simple server-side mutations that don't need reactive UI (initial multipart handling of an Anki file upload before handing to Convex storage, cookie-based prefs, redirects) | **Server Actions**                                                     | Runs server-side near secrets/cookies; no client cache needed because there's nothing to keep in sync reactively.                                                            |
| UI-only cross-cutting state (onboarding step transitions, theme, mobile nav open/closed)                                                                                     | **React Context**                                                      | Never server data — if it's persisted or shared across users, it belongs in Convex, not Context. Context-as-a-database-cache is the anti-pattern this row exists to prevent. |

## Multistep flows: content-per-screen

Onboarding and any future multistep flow (Anki import wizard, submission
review) follow one rule: **one decision per screen.** A step asks one
question, shows the minimum context needed to answer it, and has one
primary action. If a step page needs more than ~2 UI sections
(question + optional context), split it into two steps instead of
cramming — the step count is cheap, cognitive load per screen is not.

## What's not built yet

- Real page content for anything in `(app)`/`(admin)`/`(auth)` beyond
  what's needed to keep the build green — this ADR is the plan, not a
  claim of finished UI.
- The `role` field on `users` and the actual `(admin)` gate logic.
- TanStack Query isn't installed yet — add it when the Track 3 gateway
  exists and a client actually needs to call it; installing it earlier
  with nothing to use it for is dead weight.

## Related

- [[track-09-nextjs-frontend]]
- [[adr-0003-auth-architecture]]
- [[track-08-convex-db]]
