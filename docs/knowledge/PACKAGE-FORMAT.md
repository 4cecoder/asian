---
okf_version: "0.2"
package_id: package-format
id: package-format
title: Knowledge Package Format
track: meta
status: stable
stale_after: 2027-08-25
tags: [meta, conventions, okf]
related: [okf-adoption, ai-agent-docs-guide, style-guide, index]
---

# Knowledge Package Format

This knowledge base packages the 1,000-micro-task specification as small,
linkable, agent-readable notes — one package per **module / domain /
sub-track** (the source document's own grouping unit, ~10–20 tasks), not
one file per task and not one giant file per track. The goal: an AI agent
picking up a single task should be able to open one package, get full
context (spec + acceptance criteria + dependencies + neighbors), and know
where to look next.

Frontmatter now follows **Open Knowledge Format (OKF) v0.2** project-wide.
See [[okf-adoption]] for the full field rules, the manifest conventions,
and the wikilink resolution rules. This page keeps the body-shape rules
and documents the backward-compatible frontmatter migration.

## Directory layout

```
docs/knowledge/
  INDEX.md                        <- top-level map of content, start here
  PACKAGE-FORMAT.md               <- this file: frontmatter + body shape
  okf.md                          <- OKF v0.2 adoption rules (fields, manifests, wikilinks)
  content-packet-format.md        <- runtime packet contract for learning content
  okf-manifest.json               <- OKF distribution manifest for this knowledge base
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

New and edited packages use OKF v0.2 frontmatter. The required fields are
`okf_version`, `package_id`, `title`, `status`, `stale_after`, and `tags`.
Repo-local extensions (`track`, `task_range`, `related`) ride on top.

```yaml
---
okf_version: "0.2"
package_id: t01-namespaces-governance # kebab-case, prefixed with track number
title: "Module 1: Multi-Tenant Namespaces & Resource Governance"
status: stable # stable | draft | stub
stale_after: 2027-01-01 # date; readers treat past-due content skeptically
track: "Track 1: Kubernetes, Cloud Infrastructure & Volterra Edge Mesh"
task_range: "TASK-001–TASK-010"
tags: [k8s, namespaces, rbac, ...]
related: [t01-rbac-identity-sibling-ids] # other package ids, no [[ ]] in frontmatter
---
```

### Backward compatibility

Existing packages keep their old frontmatter until someone edits the file
for another reason. Do not mass-rewrite files just to migrate frontmatter.
The legacy schema maps onto OKF like this:

| Legacy field | Legacy value | OKF v0.2 replacement                                                                                   |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------ |
| `id`         | any          | `package_id` — same value. Keep `id` as a deprecated alias during migration if tooling still reads it. |
| `title`      | any          | `title` — unchanged.                                                                                   |
| `status`     | `complete`   | `stable`                                                                                               |
| `status`     | `partial`    | `draft`                                                                                                |
| `status`     | `stub`       | `stub`                                                                                                 |
| `tags`       | any          | `tags` — unchanged.                                                                                    |
| _(none)_     | —            | `okf_version: "0.2"` and `stale_after` are new requirements with no legacy equivalent.                 |

A grandfathered file is valid as long as its legacy frontmatter parses
and carries `id`, `title`, `status`, and `tags`. Any edit to the body is
the trigger to upgrade the frontmatter block to the OKF form above.

## Body shape

1. **One-paragraph scope summary** — what this module covers and why it
   exists in the platform, in the reader's own words (not copied verbatim
   from the source doc).
2. **Task table** — every task in the module/domain/sub-track, condensed:

   | ID  | Title | Depends on | Spec (condensed) | Acceptance check |
   | --- | ----- | ---------- | ---------------- | ---------------- |
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
can jump straight to the referenced file by id. Full rules — id-based
resolution, no `[[ ]]` inside frontmatter, orphan policy — live in
[[okf-adoption]].

## Status field

OKF v0.2 vocabulary (`stable | draft | stub`) replaces the legacy
`complete | partial | stub` on edited files; the meanings carry over:

- `stable` (was `complete`) — full task table extracted from source,
  nothing missing.
- `draft` (was `partial`) — source spec cuts off mid-track; table covers
  what exists, note the gap explicitly in the scope summary.
- `stub` — source spec has no task-level detail for this track, only the
  track-allocation-table's one-line scope description. Say so plainly;
  don't pad or invent task content.
