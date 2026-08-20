# Asian Language Learning Platform

Situational-fluency travel-language platform for English speakers visiting
Japan, Thailand, Vietnam, Taiwan/China, and South Korea. Voice roleplay,
pronunciation scoring, spaced repetition, and an offline travel phrasebook,
built from a 1,000-micro-task engineering specification (10 tracks × 100
tasks) spanning Kubernetes, a Python/FastAPI backend, TTS/STT audio
pipelines, an LLM roleplay engine, a Convex database, and this Next.js
frontend.

## Repo layout

```
asian/
  apps/
    web/                  Next.js 16 app (App Router, Bun, Tailwind) — Track 9
  docs/
    knowledge/            Wikillm-style knowledge base — START HERE
      INDEX.md              map of content
      PACKAGE-FORMAT.md     the note format every package follows
      style-guide.md        documentation writing rules (ASD-STE100-derived)
      ai-agent-docs-guide.md   writing rules for agent-consumed docs specifically
      glossary.md            project/domain terms
      tracks/                one page per engineering track (10)
      modules/                one page per module/domain within a track
    source-specs/          original spec doc + provenance/completeness notes
  netlify.toml            deploy config (base: apps/web)
  bunfig.toml             hoisted linker — single node_modules at root
  package.json            bun workspace root
```

## Getting started

```bash
bun install                 # from repo root — installs all workspaces
bun run dev                 # runs apps/web on :3000
bun run build                # production build of apps/web
```

Read `apps/web/AGENTS.md` before writing frontend code — Next.js 16 ships
its own agent-facing warning that its APIs differ from what's in most
models' training data, and points at `node_modules/next/dist/docs/`
(hoisted to the repo root — see `bunfig.toml`) as the authoritative
reference.

## Docs and knowledge base

Everything about *what to build* — the actual 1,000-task specification —
lives under `docs/knowledge/`, reorganized from the raw spec doc into
small, linkable packages (one per module/domain, not one per task or one
giant file per track). Start at `docs/knowledge/INDEX.md`.

The source specification is **not fully complete** — see
`docs/source-specs/README.md` for exactly which tracks have full task
detail (1–5), which are partial (6), and which are scope-only stubs (7–10).

## Deploy

Netlify project `asian-language-platform` is linked from `apps/web`
(`apps/web/.netlify/state.json`) — the repo-root `netlify.toml` points its
`base` there, so run deploys from inside that directory:

```bash
cd apps/web
bunx netlify-cli deploy --build          # preview deploy
bunx netlify-cli deploy --build --prod   # production deploy
```
