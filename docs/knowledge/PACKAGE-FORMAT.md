---
id: package-format
title: Knowledge Package Format
track: meta
status: complete
tags: [meta, conventions]
---

# Knowledge Package Format

This knowledge base packages the 1,000-micro-task specification as small,
linkable, agent-readable notes — one package per **module / domain /
sub-track** (the source document's own grouping unit, ~10–20 tasks), not
one file per task and not one giant file per track. The goal: an AI agent
picking up a single task should be able to open one package, get full
context (spec + acceptance criteria + dependencies + neighbors), and know
where to look next.

## Directory layout

```
docs/knowledge/
  INDEX.md                        <- top-level map of content, start here
  style-guide.md                  <- writing rules (derived from ASD-STE100)
  glossary.md                     <- domain terms used across tracks
  tracks/
    track-01-k8s-infra.md         <- one page per track: scope + links down
    track-02-docker-cicd.md
    ...
  modules/
    track-01/
      01-namespaces-governance.md <- one page per module: full task table
      02-rbac-identity.md
      ...
    track-02/...
```

## Frontmatter (every package)

```yaml
---
id: t01-namespaces-governance      # kebab-case, prefixed with track number
title: "Module 1: Multi-Tenant Namespaces & Resource Governance"
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-001–TASK-010"
status: complete                   # complete | partial | stub
tags: [k8s, namespaces, rbac, ...]
related: [t01-rbac-identity, t01-networkpolicies]   # other package ids, no [[ ]] needed in frontmatter
---
```

## Body shape

1. **One-paragraph scope summary** — what this module covers and why it
   exists in the platform, in the reader's own words (not copied verbatim
   from the source doc).
2. **Task table** — every task in the module/domain/sub-track, condensed:

   | ID | Title | Depends on | Spec (condensed) | Acceptance check |
   |---|---|---|---|---|

   - "Spec (condensed)" and "Acceptance check": short-sentence style per
     `style-guide.md` — one instruction per sentence, active voice, no
     stacked subordinate clauses. Keep every concrete fact (file paths,
     exact thresholds, commands, config keys) — condensing means cutting
     wordiness, never cutting specifics.
3. **Related packages** — `[[wikilink]]`-style list of other package ids
   this module depends on or feeds into, e.g. `- [[t01-rbac-identity]]`.

## Linking convention

Use `[[package-id]]` inline or in a Related list. These aren't live links
(this is plain Markdown, not a wiki engine) — they're a consistent
grep-able/agent-parseable pointer format so a reader (human or AI agent)
can jump straight to the referenced file by id.

## Status field

- `complete` — full task table extracted from source, nothing missing.
- `partial` — source spec cuts off mid-track; table covers what exists,
  note the gap explicitly in the scope summary.
- `stub` — source spec has no task-level detail for this track, only the
  track-allocation-table's one-line scope description. Say so plainly;
  don't pad or invent task content.
