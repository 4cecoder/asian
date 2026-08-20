---
id: adr-0001-android-kotlin
title: "ADR 0001: Android app, if built, is Kotlin"
track: meta
status: complete
tags: [adr, android, kotlin, decision]
related: [track-09-nextjs-frontend]
---

# ADR 0001: Android app, if built, is Kotlin

## Status

Accepted.

## Context

The original 1,000-task specification has no dedicated Android track —
Track 9 is the Next.js web frontend, Track 10 is a web-based (Service
Worker) offline PWA phrasebook, not a native app. Native Android is not
currently scoped work.

But "not scoped yet" and "undecided if it ever happens" are different
things. If a native Android surface does get built later, the tech-stack
choice (Kotlin vs. Java, vs. a cross-platform framework like Flutter or
React Native) should be decided once, deliberately, now — not improvised
by whoever opens the first Android PR, which is how a codebase ends up
with two competing UI frameworks for one platform.

## Decision

**If an Android app is built for this platform, it is written in
Kotlin** (Jetpack Compose for UI), full stop. Not Java. Not Flutter. Not
React Native.

A minimal, verified-buildable scaffold already exists at `apps/android/`
(Kotlin 2.1, Compose, Material 3, ktlint, Android Lint, `./gradlew
assembleDebug` succeeds) — see `apps/android/README.md`. This isn't a
statement of intent to build native Android soon; it's removing the
"which language" decision from the table before there's any pressure to
answer it quickly.

## Why Kotlin, specifically

- It's Google's recommended/first-class language for Android — first-party
  tooling support (Android Studio, Compose, KTX libraries) targets Kotlin
  before Java.
- Every other backend/scripting surface in this repo (`apps/web` is
  TypeScript, the spec's Track 3 backend is Python) already leans on
  statically-typed, null-safety-conscious languages where relevant —
  Kotlin fits that pattern; Java's more verbose, more null-hazard-prone
  style doesn't.
- Ruling out Flutter/React Native specifically: this platform does
  real-time audio (STT/TTS pipelines, WebSocket duplex streaming per
  Track 5/6) — that class of work wants direct platform API access, not
  an abstraction layer mediating audio and native code. A cross-platform
  framework buys UI reuse at the cost of exactly the low-level control
  this product's core feature needs.

## Consequences

- Any future Android work starts from `apps/android/`, not a fresh
  `flutter create` or a new Java module.
- CI already has `.github/workflows/android-ci.yml` wired up
  (ktlint, lint, `assembleDebug`) scoped to `apps/android/**` changes —
  it won't fire on unrelated PRs, but it's ready the moment real Android
  work lands.
- No shared code between `apps/web` and `apps/android` is assumed or
  planned (different languages, different runtimes) — if state or logic
  needs to be shared, it's via the same backend APIs both clients call,
  not a shared client-side codebase.
