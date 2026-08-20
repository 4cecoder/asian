# Contributing

## Setup

```bash
bun install    # installs everything, and wires up git hooks (lefthook)
bun run dev    # apps/web on :3000
```

That's it — one command, one dev server. If it's more than that for you,
that's a bug in this doc or the tooling; open an issue.

## Everyday commands

All run from the repo root, via [Turborepo](https://turborepo.com) — it
caches per-package, so re-running `lint`/`typecheck`/`build` after an
unrelated change is near-instant.

| Command                | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `bun run dev`          | Next.js dev server, `apps/web`                                    |
| `bun run build`        | production build, all workspaces                                  |
| `bun run lint`         | eslint, all workspaces                                            |
| `bun run typecheck`    | `tsc --noEmit`, all workspaces                                    |
| `bun run format`       | prettier, writes                                                  |
| `bun run format:check` | prettier, check-only (what CI runs)                               |
| `bun run check`        | lint + typecheck + build — what CI and the pre-push hook both run |

Android lives in `apps/android` with its own Gradle toolchain — see
`apps/android/README.md`.

## Git hooks

[lefthook](https://github.com/evilmartians/lefthook) installs automatically
via `bun install`'s postinstall. What it does:

- **pre-commit** — formats and lints only the files you staged (fast).
- **commit-msg** — enforces [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`, `build:`,
  `perf:`, `style:`, `revert:`, each with an optional `(scope)`).
- **pre-push** — runs `bun run check` (the same thing CI runs), so a
  broken push is rare and caught before it reaches GitHub, not after.

If a hook is ever wrong for a specific commit, `git commit --no-verify` /
`git push --no-verify` exist — but treat that as "something is wrong with
the hook, file an issue," not a routine escape hatch.

## Branching and PRs

- Branch off `main`: `type/short-description` (matches commit prefixes —
  `feat/`, `fix/`, `chore/`, `docs/`...).
- `main` is protected — no direct pushes, PRs required. See
  `.github/PULL_REQUEST_TEMPLATE.md` for what a PR description should cover.
- Open an issue first for anything non-trivial (see the issue templates)
  so there's a record of _why_, not just _what_, before code exists.

## Where things live

- **Building a spec'd task?** Find it in `docs/knowledge/modules/track-NN/`
  first (via `docs/knowledge/INDEX.md`) — that's the corrected,
  condensed version of the spec, not `docs/source-specs/`.
- **Writing docs, comments, issue/PR text, or task specs?** Read
  `docs/knowledge/style-guide.md` (general) and
  `docs/knowledge/ai-agent-docs-guide.md` (task specs / anything an AI
  agent will act on) first.
- **Full repo map:** the root `README.md`.

## Convex data

Convex **code** (schema, functions) is public once Track 8 lands. Convex
**data** — deploy keys, generated bindings, exports — is not, and is
already gitignored. See `SECURITY.md` before touching anything Convex-related.
