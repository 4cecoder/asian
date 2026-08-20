# apps/android

Native Android surface for the platform, in Kotlin — not Java, not
Flutter, not React Native. See
`docs/knowledge/adr/0001-android-kotlin.md` for why that's a hard
requirement, not a default.

**Status: scaffold.** Builds, lints, and ktlint-checks clean (verified
locally, see below), but there's no real screen yet — `MainActivity.kt`
is a placeholder. The source spec (`docs/source-specs/`) never had a
dedicated Android track; this exists so the tech-stack decision is locked
in architecturally before real work starts, not left to whoever opens the
first PR.

## Stack

- Kotlin 2.1, Jetpack Compose, Material 3
- AGP 8.9.2, Gradle 8.11.1 (via `./gradlew`, don't rely on a global `gradle`)
- `compileSdk`/`targetSdk` 36, `minSdk` 26 (Android 8.0+)
- ktlint (`org.jlleitschuh.gradle.ktlint`) for formatting/style, Android
  Lint for the rest

## Requirements

- JDK 17 or 21. **Not JDK 26+** — Gradle 8.11.x doesn't run on it yet.
  Point `JAVA_HOME` at a supported JDK if your default is newer:
  ```bash
  export JAVA_HOME=$(/usr/libexec/java_home -v 21)
  ```
- Android SDK with `platform-android-36` and recent `build-tools`
  installed, `ANDROID_HOME` set (or an `apps/android/local.properties`
  with `sdk.dir=...` — that file is gitignored, machine-specific, create
  your own).

## Commands

Run from `apps/android/`:

```bash
./gradlew assembleDebug   # build the debug APK
./gradlew lint            # Android Lint
./gradlew ktlintCheck     # style check (matches pre-commit/CI)
./gradlew ktlintFormat    # auto-fix style
```

CI (`.github/workflows/android-ci.yml`) runs all three on any PR touching
this directory, using `actions/setup-java` (JDK 17) — it doesn't depend
on a local `JAVA_HOME` override.
