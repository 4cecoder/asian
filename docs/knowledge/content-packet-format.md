---
okf_version: "0.2"
package_id: content-packet-format
title: Runtime Content Packet Format
track: meta
status: draft
stale_after: 2027-02-25
tags: [meta, conventions, okf, content-pipeline]
related: [okf-adoption, track-08-convex-db, track-10-phrasebook-pwa]
---

# Runtime Content Packet Format

This page defines the **content packet** — the runtime OKF distribution
format for community-refined learning content. Three kinds exist today:

1. **Phrase pack** — situational phrases for the phrasebook ([[track-10-phrasebook-pwa]]).
2. **Deck pack** — SRS decks and cards for the review engine ([[track-07-srs-engine]]).
3. **Dictionary correction batch** — corrections to existing dictionary entries.

The producers are the community `/submissions` pipeline (raw input lands
in the Convex `submissions` table) and the Python refinement worker (turns
raw submissions into packets). The consumer is the ingestion step that
writes approved packets back into Convex (`phrases`, `cards`,
`dictionaryEntries`). Both sides treat this page as the contract. If the
worker emits something this page does not allow, that is a bug in the
worker, not an extension.

Documentation-side OKF rules live in [[okf-adoption]]. This page reuses
the same manifest conventions and adds payload rules.

## Packet anatomy

A packet is a directory. It contains exactly one manifest named
`packet.json`, plus the payload files the manifest declares. One directory
holds exactly one packet.

```
packets/
  ko-phrase-pack-cafe-v1/
    packet.json          <- OKF manifest + payload descriptor (required)
    phrases.json         <- main_content payload
    review-notes.md      <- optional reference material
```

Rules:

1. `packet.json` must parse as JSON and carry every required field below.
2. Every path under `structure` is relative to the packet directory and
   must exist on disk.
3. Every declared payload file gets a SHA-256 checksum in the manifest.
   The consumer verifies it before applying anything.
4. Packet directories are immutable once `status` leaves `refined`.
   Fixing a mistake means emitting a new version, never editing an
   approved packet in place.

## Manifest schema (`packet.json`)

```json
{
  "okf_version": "0.2",
  "package_id": "ko-phrase-pack-cafe-ordering",
  "kind": "phrase-pack",
  "version": "1.0.0",
  "name": "Cafe Ordering Phrases (Korean)",
  "description": "One sentence.",
  "language": "ko",
  "license": "CC-BY-4.0",
  "status": "refined",
  "created": "2026-08-25T00:00:00Z",
  "last_updated": "2026-08-25T00:00:00Z",
  "categories": ["phrases"],
  "tags": ["ko", "cafe", "beginner"],
  "format": "okf-v0.2",
  "structure": {
    "type": "distribution",
    "main_content": "phrases.json",
    "reference": []
  },
  "payload": {
    "schema_version": "1",
    "count": 12,
    "checksums": {
      "phrases.json": "sha256:..."
    }
  },
  "provenance": {
    "source": "community-submissions",
    "submission_ids": ["sub_01J..."],
    "refined_by": "refinement-worker/1.2.0",
    "reviewed_by": null
  }
}
```

Field rules:

| Field                       | Required   | Rule                                                                                                                                                                                           |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `okf_version`               | Yes        | Always `"0.2"`.                                                                                                                                                                                |
| `package_id`                | Yes        | `<language>-<kind>-<slug>`, kebab-case. Example: `ko-deck-pack-topik1-core`, `ja-dictionary-correction-keigo-2026w34`. Unique per logical packet; versions refine it, renames create a new id. |
| `kind`                      | Yes        | One of `phrase-pack`, `deck-pack`, `dictionary-correction`.                                                                                                                                    |
| `version`                   | Yes        | SemVer of this packet's contents. Start at `1.0.0`.                                                                                                                                            |
| `language`                  | Yes        | BCP-47 tag of the learning language, e.g. `ko`, `ja`, `zh-Hans`. Not the UI language.                                                                                                          |
| `license`                   | Yes        | SPDX identifier. Community content publishes, so public licenses only (`CC0`, `CC-BY-4.0`). Reject packets without one.                                                                        |
| `status`                    | Yes        | Lifecycle: `submitted` → `refined` → `approved` or `rejected`. The worker sets `refined`; a human reviewer sets `approved` or `rejected`. Only `approved` packets get ingested.                |
| `created`, `last_updated`   | Yes        | ISO-8601 UTC timestamps.                                                                                                                                                                       |
| `structure.main_content`    | Yes        | Exactly one payload file. Name it after the kind: `phrases.json`, `deck.json`, `corrections.json`.                                                                                             |
| `structure.reference`       | No         | Optional supporting files.                                                                                                                                                                     |
| `payload.schema_version`    | Yes        | `"1"` today. Bump on breaking payload changes, never silently.                                                                                                                                 |
| `payload.count`             | Yes        | Number of entries in the main payload. Consumer verifies it.                                                                                                                                   |
| `payload.checksums`         | Yes        | Map of filename → `sha256:<hex>`. Must cover `main_content` and every file in `reference`.                                                                                                     |
| `provenance.submission_ids` | Yes        | Convex `submissions` table ids this packet was built from. May be empty only when `provenance.source` is not `community-submissions`.                                                          |
| `provenance.refined_by`     | Yes        | Worker identifier plus version, e.g. `refinement-worker/1.2.0`.                                                                                                                                |
| `provenance.reviewed_by`    | On approve | Reviewer identity. Null until then.                                                                                                                                                            |

## Payload schemas

### Phrase pack — `phrases.json`

Top level is a single object with one key, `entries`.

Each entry:

| Field          | Type           | Rule                                                                                                               |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`           | string         | `<language>-phrase-<zero-padded ordinal>-<short slug>`, unique within the packet.                                  |
| `text`         | string         | The phrase in the learning language. Non-empty.                                                                    |
| `romanization` | string \| null | Revised Romanization for Korean, Hepburn for Japanese, pinyin for Mandarin. Null when not applicable.              |
| `gloss`        | object         | One or more glosses keyed by UI language code, e.g. `{"en": "..."}`. At least one entry required.                  |
| `register`     | string         | `formal`, `informal`, or `neutral`. Korean packs should not use `neutral` unless the phrase truly has no register. |
| `level`        | string         | Learner level tag such as `TOPIK-1`, `JLPT-N5`, `HSK-3`. Free-form but consistent within a packet.                 |
| `scenario`     | string         | Situational bucket, e.g. `cafe`, `transit`, `emergency`.                                                           |
| `tags`         | array          | Lowercase tokens; may be empty.                                                                                    |
| `notes`        | string \| null | Usage note a learner benefits from, e.g. politeness caveats.                                                       |
| `sources`      | array          | Submission ids backing this entry. Subset of `provenance.submission_ids`.                                          |

### Deck pack — `deck.json`

Top level: `deck` (metadata) and `cards` (array).

- `deck`: `name`, `language`, `description`, `srs_hint` (`fsrs` or `sm-2`),
  `card_count` (must equal the length of `cards`).
- Each card: `id` (unique), `front`, `back`, `reading` (string or null),
  `tags`, `source_phrase_id` (nullable — links to a phrase entry when the
  deck derives from a phrase pack).

### Dictionary correction batch — `corrections.json`

Top level: `operations` (array). Each operation:

| Field                    | Rule                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `op`                     | `correct`, `merge`, or `flag`.                                                                                                                                           |
| `target_id`              | Existing `dictionaryEntries` id. The consumer rejects the whole batch if any target does not exist.                                                                      |
| `field`                  | Field being corrected (for `correct`).                                                                                                                                   |
| `old_value`, `new_value` | For `correct`; both required so the consumer can detect drift since refinement. If `old_value` no longer matches, skip the operation and report it — do not force-write. |
| `into_id`                | For `merge`; the surviving entry id.                                                                                                                                     |
| `reason`                 | For `flag`; human-readable, required.                                                                                                                                    |
| `confidence`             | Number between 0 and 1, required for all ops. Consumer may threshold on it.                                                                                              |

## Filled-in example: Korean cafe phrase pack

Directory `packets/ko-phrase-pack-cafe-ordering/`, two files.

`packet.json`:

```json
{
  "okf_version": "0.2",
  "package_id": "ko-phrase-pack-cafe-ordering",
  "kind": "phrase-pack",
  "version": "1.0.0",
  "name": "Cafe Ordering Phrases (Korean)",
  "description": "Beginner-level ordering phrases for Korean cafes, refined from community submissions. Trimmed to three entries for this example.",
  "language": "ko",
  "license": "CC-BY-4.0",
  "status": "refined",
  "created": "2026-08-25T09:00:00Z",
  "last_updated": "2026-08-25T09:00:00Z",
  "categories": ["phrases"],
  "tags": ["ko", "cafe", "beginner"],
  "format": "okf-v0.2",
  "structure": {
    "type": "distribution",
    "main_content": "phrases.json",
    "reference": []
  },
  "payload": {
    "schema_version": "1",
    "count": 3,
    "checksums": {
      "phrases.json": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  },
  "provenance": {
    "source": "community-submissions",
    "submission_ids": ["sub_01J8ZKQ5WEXAMPLE00000001", "sub_01J8ZKQ5WEXAMPLE00000002"],
    "refined_by": "refinement-worker/1.2.0",
    "reviewed_by": null
  }
}
```

(The checksum above is the empty-file placeholder; the real value is
computed over the final `phrases.json` bytes.)

`phrases.json`:

```json
{
  "entries": [
    {
      "id": "ko-phrase-001-iced-americano",
      "text": "아이스 아메리카노 한 잔 주세요.",
      "romanization": "aiseu amerikano han jan juseyo.",
      "gloss": { "en": "One iced americano, please." },
      "register": "formal",
      "level": "TOPIK-1",
      "scenario": "cafe",
      "tags": ["ordering", "drinks"],
      "notes": "주세요 (juseyo) makes any noun into a polite request.",
      "sources": ["sub_01J8ZKQ5WEXAMPLE00000001"]
    },
    {
      "id": "ko-phrase-002-here-or-to-go",
      "text": "여기서 마실 거예요? 가져갈 거예요?",
      "romanization": "yeogiseo sil geoyeyo? gajyeogal geoyeyo?",
      "gloss": { "en": "Will you drink here, or take it to go?" },
      "register": "formal",
      "level": "TOPIK-1",
      "scenario": "cafe",
      "tags": ["question", "takeout"],
      "notes": "Staff ask this; learners mostly need to understand it, not say it.",
      "sources": ["sub_01J8ZKQ5WEXAMPLE00000001"]
    },
    {
      "id": "ko-phrase-003-reusable-cup",
      "text": "텀블러 가져왔어요.",
      "romanization": "teombeolleo gajyeowasseoyo.",
      "gloss": { "en": "I brought my own tumbler." },
      "register": "formal",
      "level": "TOPIK-2",
      "scenario": "cafe",
      "tags": ["sustainability"],
      "notes": "Many cafes give a discount for a personal cup.",
      "sources": ["sub_01J8ZKQ5WEXAMPLE00000002"]
    }
  ]
}
```

Note what makes this packet valid: `register` values come from the fixed
set, `payload.count` matches the entry count in real packets (the manifest
above shows `3` to match this trimmed example), and every `sources` value
appears in `provenance.submission_ids`.

## Consumer contract

The ingestion step must do all of the following, in order:

1. Parse `packet.json`. Reject the packet on any missing required field.
2. Verify every checksum in `payload.checksums`. Reject on mismatch.
3. Verify `payload.count` equals the actual entry count. Reject on mismatch.
4. Verify every entry `id` is unique within the packet.
5. For `dictionary-correction`, verify every `target_id` exists before
   applying anything; apply operations atomically or not at all.
6. Ingest only when `status` is `approved`. Log and skip otherwise.
7. Treat `(package_id, version)` as the idempotency key. Re-ingesting the
   same pair is a no-op, not a duplicate write.

## Related

- [[okf-adoption]] — documentation-side OKF rules this format builds on.
- [[track-10-phrasebook-pwa]] — where phrase packs surface in the product.
- [[track-08-convex-db]] — the `submissions` and `phrases` tables this
  pipeline reads from and writes to.
