# apps/ios

Native iOS surface for the platform, in Swift 6.2+ with strict
concurrency — not Objective-C, not a cross-platform framework. See
`docs/knowledge/adr/0002-ios-swift.md` for why.

**Status: scaffold.** `PlaceholderScreen` is a placeholder, same as
`apps/android`. The source spec never had a dedicated iOS track; this
locks in the tech-stack decision before real work starts.

## Stack

- Swift 6.2, strict concurrency (`SWIFT_STRICT_CONCURRENCY: complete`)
- SwiftUI, iOS 17.0+ deployment target
- [Swift Testing](https://developer.apple.com/documentation/testing)
  (`import Testing`, `@Test`), not XCTest
- **[XcodeGen](https://github.com/yonaskolb/XcodeGen)** — `project.yml` is
  the source of truth; `Asian.xcodeproj` is generated, not committed
  (gitignored, same reasoning as `apps/android/build/`: a generated
  binary-ish project file is merge-conflict-prone and shouldn't be
  hand-edited or diffed in review — `project.yml` is a plain, readable,
  mergeable text file instead)

## Requirements

- Xcode 16+ (for the iOS 17 SDK and Swift 6.2 toolchain) — **full Xcode,
  not just Command Line Tools**. `xcodebuild`/`xcrun simctl` need it.
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`

## Commands

Run from `apps/ios/`:

```bash
xcodegen generate                                    # writes Asian.xcodeproj from project.yml
open Asian.xcodeproj                                 # or build/test from Xcode directly

xcodebuild -scheme Asian -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' build # CLI build
xcodebuild -scheme Asian -destination \
  'platform=iOS Simulator,name=iPhone 16' test         # CLI test
```

## A note on local verification

This scaffold was built and committed from a machine with the Swift 6.2
compiler but **no full Xcode install** (Command Line Tools only — no iOS
SDK, no simulator). What was actually verified locally:

- `project.yml` → `xcodegen generate` produces a well-formed
  `Asian.xcodeproj` (confirmed by inspecting the generated `project.pbxproj`).
- The Swift source is syntactically Swift-6.2-clean by inspection.

What was **not** verified locally — and is CI's job instead
(`.github/workflows/ios-ci.yml`, which runs on a `macos-14` GitHub-hosted
runner with real Xcode preinstalled): that `xcodebuild build` and
`xcodebuild test` actually succeed. Check that workflow's status on the
PR that introduced this scaffold before trusting it beyond "the project
file is structurally valid."
