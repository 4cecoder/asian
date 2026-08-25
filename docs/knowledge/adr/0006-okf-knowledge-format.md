---
okf_version: "0.2"
package_id: adr-0006-okf-knowledge-format
title: "ADR 0006: Adopt OKF v0.2 / WikiLLM as the project-wide knowledge format"
track: meta
status: stable
stale_after: 2027-08-25
tags: [adr, okf, wikillm, conventions, decision]
related:
  [okf-adoption, content-packet-format, adr-0005-community-ingestion-pipeline, package-format]
---

# ADR 0006: OKF v0.2 / WikiLLM as the project-wide knowledge format

## Status

Accepted and in force.

## Context

This project produces machine-consumed knowledge in two distinct places:

1. **The documentation knowledge base** (`docs/knowledge/`) — the
   condensed, cross-linked spec packages an AI agent reads before touching
   code. Its conventions live in [[package-format]] and [[okf-adoption]].
2. **Runtime learning content** — community-refined phrase packs, deck
   packs, and dictionary corrections that ship to learners through the
   ingestion pipeline ([[adr-0005-community-ingestion-pipeline]]). Their
   contract lives in [[content-packet-format]].

Before OKF, these two had different shapes and no shared rules for
frontmatter, manifests, or linking. Any tool that wanted to enumerate,
load, verify, or trust content had to learn two formats. The easyCV repo
already proved the single-format approach works end to end:
`~/bytecats/easycv/knowledge/index.md` (frontmatter pattern) and
`~/bytecats/easycv/automation/okf-manifest.json` (distribution manifest
pattern).

## Decision

**Open Knowledge Format (OKF) v0.2 — this project's "WikiLLM" convention —
is the one format family for all knowledge content, documentation-side and
runtime-side.**

What that means concretely:

1. **One frontmatter schema family.** Required fields `okf_version`,
   `package_id`, `title`, `status`, `stale_after`, `tags`, with
   repo-local extension fields (`track`, `task_range`, `related`). Full
   field rules: [[okf-adoption]].
2. **Two packet profiles, one contract.**
   - Documentation packages: Markdown bodies under `docs/knowledge/`, the
     body-shape rules in [[package-format]], distributed via
     `docs/knowledge/okf-manifest.json`.
   - Runtime content packets: JSON payloads (`phrases.json`, `deck.json`,
     `corrections.json`) wrapped in a `packet.json` manifest with
     checksums and provenance, per [[content-packet-format]].
3. **One id-and-wikilink discipline.** Every file has exactly one
   kebab-case `package_id`; double-bracket pointers keyed on `package_id`
   are the grep-able cross-reference everywhere; resolution means "find
   the file whose `package_id` equals the link text."
4. **One verification bar.** Frontmatter parses as YAML; every manifest
   path resolves on disk; every wikilink resolves to exactly one
   `package_id`. This check runs before any docs hand-back (see the
   Verification section of [[okf-adoption]]).

New files MUST carry full OKF v0.2 frontmatter. Existing files are
grandfathered until edited for another reason — do not mass-rewrite; the
migration table in [[package-format]] maps legacy fields onto OKF ones.

The easyCV implementation stays the reference precedent. If this repo's
rules ever diverge from what easyCV does, this ADR and the pages it cites
are authoritative here.

## Why one family instead of two formats

- A consumer that can load the docs base can also load runtime packets;
  the manifest shape is shared, only payload schemas differ.
- Agents get one set of trust rules (`status` vocabulary, `stale_after`
  skepticism) instead of per-context guesses.
- The pipeline in [[adr-0005-community-ingestion-pipeline]] publishes into
  the same family it was specced from — provenance flows without
  translation.

## Consequences

- Every new doc under `docs/knowledge/` carries the six required
  frontmatter fields from birth.
- Runtime packets must satisfy both the manifest conventions and the
  stricter checksum/provenance rules in [[content-packet-format]]; the
  worker cannot invent fields outside that page.
- Verification (YAML parse, manifest paths, wikilink resolution) becomes a
  standard step in docs review, not an occasional cleanup.

## Related

- [[okf-adoption]] — the normative field, manifest, and wikilink rules.
- [[package-format]] — body shape for documentation packages.
- [[content-packet-format]] — the runtime packet profile.
- [[adr-0005-community-ingestion-pipeline]] — the pipeline that emits
  runtime packets.
