---
id: adr-0002-ios-swift
title: "ADR 0002: iOS app, if built, is Swift 6.2+"
track: meta
status: complete
tags: [adr, ios, swift, decision]
related: [adr-0001-android-kotlin, track-09-nextjs-frontend]
---

# ADR 0002: iOS app, if built, is Swift 6.2+

## Status

Accepted.

## Context

Same situation as [[adr-0001-android-kotlin]]: no dedicated iOS track in
the source spec, no immediate plan to build native iOS, but the
tech-stack decision is worth settling once, deliberately, rather than
leaving it for whoever opens the first iOS PR.

## Decision

**If an iOS app is built for this platform, it is Swift 6.2 or later**,
with strict concurrency checking on, using SwiftUI. Not Objective-C, not
a cross-platform framework (same reasoning as ADR 0001's Flutter/RN
rejection — this platform's real-time audio work wants direct platform
API access).

A scaffold exists at `apps/ios/` — `project.yml` (XcodeGen) defines the
target with `SWIFT_VERSION: "6.2"` and `SWIFT_STRICT_CONCURRENCY:
complete` set at the project level, so nothing can quietly build against
an older language mode. See `apps/ios/README.md` for what's actually
been verified locally versus what's CI-only (this machine has the Swift
6.2 compiler but not full Xcode/iOS SDK — be less confident about this
scaffold than about `apps/android/`, which was fully build-verified on
the machine that wrote it).

## Why Swift 6.2 specifically, not just "Swift"

Swift 6's strict concurrency checking (data race safety enforced at
compile time) is the actual reason to pin a floor version here, not
just "use the platform's native language." Letting the floor drift
means someone eventually ships code that compiles under a looser
concurrency mode and only breaks when the project's minimum is finally
raised — pinning it now avoids that.

## Why XcodeGen instead of a committed `.xcodeproj`

`project.pbxproj` is a large, order-sensitive, semi-structured file that
Xcode itself churns on trivial changes (a build setting toggle can
rewrite most of the file). Committing it means every PR touching project
config becomes an unreviewable diff and a merge-conflict magnet — the
exact opposite of "easy to develop and change anything." `project.yml`
is a small, readable, mergeable text file that generates a correct
`.xcodeproj` deterministically; the generated file itself is gitignored,
same pattern as `apps/android/build/` or `apps/web/.next/`.

## Consequences

- Any future iOS work starts from `apps/ios/`, edits `project.yml` (not
  the generated project) for anything project-config-level, and runs
  `xcodegen generate` locally before opening in Xcode.
- `.github/workflows/ios-ci.yml` builds and tests on a `macos-14`
  GitHub-hosted runner (real Xcode + iOS Simulator), scoped to
  `apps/ios/**` changes only.
- No shared code assumed between `apps/web`, `apps/android`, and
  `apps/ios` — same reasoning as ADR 0001: different languages, same
  backend APIs.
