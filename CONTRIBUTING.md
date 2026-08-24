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

| Command                | What it does                                                               |
| ---------------------- | -------------------------------------------------------------------------- |
| `bun run dev`          | Next.js dev server, `apps/web`                                             |
| `bun run build`        | production build, all workspaces                                           |
| `bun run lint`         | eslint, all workspaces                                                     |
| `bun run typecheck`    | `tsc --noEmit`, all workspaces                                             |
| `bun run format`       | prettier, writes                                                           |
| `bun run format:check` | prettier, check-only (what CI runs)                                        |
| `bun run test:unit`    | Convex function tests (`convex-test` + vitest, in-memory backend)          |
| `bun run check`        | lint + typecheck + test:unit + build — what CI and the pre-push hook run   |
| `bun run test`         | Playwright E2E (`apps/web/e2e/`) — not part of `check`/pre-push, see below |

Android lives in `apps/android` with its own Gradle toolchain — see
`apps/android/README.md`. iOS lives in `apps/ios` with Xcode/XcodeGen —
see `apps/ios/README.md`.

## Testing

- **E2E**: Playwright, `apps/web/e2e/`. Deliberately **not** wired into
  `bun run check` or the pre-push hook — it builds and boots a real
  server plus a real browser, which is too slow for "every push" and
  would train people to reach for `--no-verify`. It runs in CI
  (`e2e (Playwright)` job) on every PR and **is** a required check before
  merge — same rigor, different trigger point.
- **Unit/regression**: as each workspace grows real logic, add
  workspace-local unit tests next to the code they cover (`*.test.ts` for
  `apps/web`, `XCTest`/Swift Testing for `apps/ios`, JUnit/Kotlin test for
  `apps/android`) and wire a `test` script into that workspace's
  `package.json` (or Gradle/Xcode scheme) — Turborepo's `test` task
  already picks up any workspace that defines one.
- **New feature, no tests → not done.** A PR adding behavior without a
  test covering it doesn't meet this repo's bar, full stop.

## Seed and fixture data

Any feature that reads real data (a parser, an import pipeline, a UI
that renders a list) needs synthetic seed/fixture data to test against —
don't hand-wave "works on my machine with data I made up once and threw
away." Convention:

- Put it in a `seed/` or `fixtures/` directory next to the code that
  consumes it (e.g. `apps/web/e2e/fixtures/`, or once Convex lands,
  `convex/seed/`).
- **Synthetic only.** No real user data, no scraped-and-kept third-party
  content beyond what's needed as a small representative test sample —
  see `SECURITY.md`.
- Reference it from the feature's issue/PR acceptance criteria
  explicitly — "seed data covering the empty/typical/malformed cases"
  is a testable claim, "seed data" alone is not.

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
- `main` is protected — no direct pushes, PRs required, 5 required
  status checks (web, format, e2e, Android, iOS — the last two skip
  cleanly on PRs that don't touch those directories, see
  `.github/workflows/android-ci.yml`/`ios-ci.yml`'s own comments for why
  they can't just be path-filtered at the trigger level).
- **Required checks are not `strict`** — a PR doesn't have to be rebased
  onto the latest `main` to merge, only pass its own checks. Turned off
  deliberately: Dependabot auto-merges frequently (small version bumps,
  several times a week), and `strict` mode was forcing an unrelated
  rebase on every longer-lived branch just to catch up to those bumps.
  If this ever causes a real conflict, that surfaces as a normal merge
  conflict on the PR — `strict` isn't what prevents that.
- Open an issue first for anything non-trivial (see the issue templates)
  so there's a record of _why_, not just _what_, before code exists.

## Maintainability bar

Same spirit as "no tests, not done" — these are checkable, not aspirational:

- **A file over ~150–200 lines is a signal, not a limit.** Look for the
  natural split (a sub-component, a hook, a module) before adding more to
  one file. See ADR 0004's component rules for the frontend-specific
  version of this.
- **One responsibility per file.** A component file exports one
  component; a Convex function file groups genuinely related
  queries/mutations, not "everything about the app."
- **No dead code, no commented-out blocks, no `TODO` without an issue
  number.** A `TODO` that isn't linked to something trackable rots
  silently — either it's worth an issue or it isn't worth the comment.
- **A PR that adds a workaround explains why in the commit message**,
  not just what — see this repo's own commit history for the standard
  (e.g. the CI fixes under `.github/workflows/`, which each explain the
  actual failure they were responding to, not just "fix CI").
- **If you had to figure something out the hard way** (a footgun, a
  non-obvious API behavior, a tool that hangs in some mode), write it
  down — in a code comment if it's file-local, in `SECURITY.md`/
  `CONTRIBUTING.md`/an ADR if it's project-wide, or as a skill/knowledge
  package if it's the kind of thing an agent should know before
  attempting the same task. The alternative is someone (human or agent)
  re-discovering it the same slow way.

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
