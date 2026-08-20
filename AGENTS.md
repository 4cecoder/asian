# Agent instructions — repo root

This is a monorepo. Read the scoped instructions for whatever you're
touching before writing code or docs:

- **Working in `apps/web`?** Read `apps/web/AGENTS.md` first — Next.js 16
  ships its own warning there that its APIs differ from most models'
  training data (Next 15 and earlier), and points at
  `node_modules/next/dist/docs/` (hoisted to repo root — see
  `bunfig.toml`) as the authoritative reference. That file is regenerated
  by `next dev`; committing it is expected.
- **Working in `apps/android`?** Read `apps/android/README.md` and
  `docs/knowledge/adr/0001-android-kotlin.md` first. Kotlin + Jetpack
  Compose only — that decision is settled, not open for reconsideration
  per-PR. Different toolchain than the rest of the repo (Gradle/JDK, not
  bun) — `bun run check` does not touch it; use `./gradlew` inside
  `apps/android/`.
- **Working in `apps/ios`?** Read `apps/ios/README.md` and
  `docs/knowledge/adr/0002-ios-swift.md` first. Swift 6.2+, strict
  concurrency, SwiftUI only — settled, not open for reconsideration.
  `project.yml` (XcodeGen) is the source of truth; `Asian.xcodeproj` is
  generated and gitignored — never hand-edit it, never commit it. This
  scaffold was built without full Xcode available — treat its "verified"
  claims as weaker than Android's until CI (`ios-ci.yml`, `macos-14`
  runner) has actually run green on it.
- **Adding a new feature with real data flowing through it?** It needs:
  a test (see `CONTRIBUTING.md`'s Testing section), synthetic seed/fixture
  data (see that doc's Seed and fixture data section), and if it touches
  Convex, secrets follow `SECURITY.md`'s "Where secrets actually live" —
  `bunx convex env` for Convex-side runtime secrets, `gh secret set` for
  CI/CD secrets, never a committed `.env`.
- **Writing or editing anything under `docs/knowledge/`?** Follow
  `docs/knowledge/PACKAGE-FORMAT.md` for structure and
  `docs/knowledge/ai-agent-docs-guide.md` for how to write it —
  unambiguous imperative instructions, one verifiable action per step,
  literal command+expected-result acceptance criteria, no implied steps.
- **Writing any other documentation, README, or comment?** Follow
  `docs/knowledge/style-guide.md` — short sentences, one idea per
  sentence, active voice, consistent terminology (check
  `docs/knowledge/glossary.md` before introducing a new term for
  something that already has a name).
- **Implementing a task from the specification?** Find it in
  `docs/knowledge/modules/track-NN/` (via `docs/knowledge/INDEX.md`), not
  in `docs/source-specs/` — the knowledge base is the condensed,
  corrected, cross-linked version. Check the package's `status` field:
  `complete` packages are trustworthy end to end; `partial` and `stub`
  packages say explicitly what's missing — don't invent task detail to
  fill a gap.

## Before you commit or push

`bun run check` (lint + typecheck + build, via Turborepo) is what CI runs
and what the pre-push git hook (lefthook) runs automatically — run it
yourself before handing work back, don't rely on the hook to catch it
after the fact. Commit messages must match Conventional Commits
(`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `ci:`,
`build:`, `perf:`, `style:`, `revert:`, optional `(scope)`) — the
commit-msg hook enforces this. Don't use `--no-verify` to route around a
hook failure; fix what it's flagging.

## Source of truth precedence

1. Actual code and config in this repo (what's built, not what's specced).
2. `docs/knowledge/` (the organized, corrected spec).
3. `docs/source-specs/` (raw material — read only for provenance or to
   re-run an extraction, never as the primary reference for building).
