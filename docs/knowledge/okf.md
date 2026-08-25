---
okf_version: "0.2"
package_id: okf-adoption
id: okf-adoption
title: Open Knowledge Format (OKF) Adoption
track: meta
status: stable
stale_after: 2027-08-25
tags: [meta, conventions, okf, wikillm]
related: [package-format, content-packet-format, index]
---

# Open Knowledge Format (OKF) Adoption

This repo adopts **Open Knowledge Format (OKF) v0.2** for all of
`docs/knowledge/`. OKF is the machine-consumable packaging convention this
project calls "WikiLLM": strict YAML frontmatter, a JSON manifest per
distribution, and consistent cross-linking so an AI agent can enumerate,
load, and trust a knowledge package without human help.

The platform will also **publish** community-refined learning content as
OKF packets. Those runtime packets have their own contract in
[[content-packet-format]]. This page covers the documentation side only.

Reference implementations live in the easyCV repo:
`~/bytecats/easycv/knowledge/index.md` (frontmatter pattern) and
`~/bytecats/easycv/automation/okf-manifest.json` (distribution manifest
pattern).

## Required frontmatter

Every file in `docs/knowledge/` carries OKF v0.2 frontmatter when it is
created or edited. Existing files are grandfathered until someone touches
them — see [[package-format]] for the compatibility rules.

```yaml
---
okf_version: "0.2" # literal string, always "0.2"
package_id: t01-rbac-identity # kebab-case, unique across the whole base
title: "Module 2: ServiceAccounts & RBAC Identity"
status: stable # stable | draft | stub
stale_after: 2027-01-01 # date; readers treat past-due content skeptically
tags: [k8s, rbac] # lowercase kebab-case tokens
---
```

Field-by-field requirements:

| Field         | Required | Rule                                                                                                                                                                  |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `okf_version` | Yes      | Quoted string `"0.2"`. Bump only when this page says how.                                                                                                             |
| `package_id`  | Yes      | Kebab-case. Unique across all of `docs/knowledge/`. This is the value other files use in `[[wikilinks]]`.                                                             |
| `title`       | Yes      | Human-readable name.                                                                                                                                                  |
| `status`      | Yes      | OKF vocabulary: `stable`, `draft`, `stub`. See the mapping table below.                                                                                               |
| `stale_after` | Yes      | Plain date (`YYYY-MM-DD`). Set it roughly one year out for spec-derived content. When today is past this date, an agent treats claims as unverified until re-checked. |
| `tags`        | Yes      | List of lowercase tokens. Reuse tokens already in use; check sibling files before inventing one.                                                                      |

Repo-local extension fields (allowed because OKF tolerates extensions;
they carry information the base fields cannot):

| Field        | Where              | Meaning                                                                             |
| ------------ | ------------------ | ----------------------------------------------------------------------------------- |
| `track`      | All pages          | Which track or `meta` group owns the page.                                          |
| `task_range` | Track/module pages | Source-spec ID span covered, e.g. `"TASK-001–TASK-010"`.                            |
| `related`    | Any                | List of `package_id`s this page depends on or feeds. No `[[ ]]` inside frontmatter. |

### Status vocabulary mapping

Our old statuses were `complete | partial | stub`. OKF uses
`stable | draft | stub`. The mapping is fixed; apply it whenever you touch
a file:

| Legacy (grandfathered) | OKF v0.2 | Meaning                                                |
| ---------------------- | -------- | ------------------------------------------------------ |
| `complete`             | `stable` | Fully extracted from source; trustworthy end to end.   |
| `partial`              | `draft`  | Real content exists; gaps are stated explicitly.       |
| `stub`                 | `stub`   | Scope line only; do not trust beyond the stated scope. |

Do not mass-rewrite old files just to flip `complete` to `stable`. Change
the status only when you edit the file for another reason.

## Manifests

A **distribution** is any multi-file unit shipped or consumed as one thing.
Each distribution gets exactly one `okf-manifest.json` next to its main
content file. This repo currently has one: `docs/knowledge/okf-manifest.json`.

Manifest conventions:

1. **File name is always `okf-manifest.json`.** One per directory-level
   distribution. Do not nest two manifests in one directory.
2. **Paths are relative to the manifest's own directory.**
3. **`structure.main_content` is a single file** — the entry point a
   consumer reads first.
4. **`structure.reference` lists supporting files** — read after
   `main_content`, in listed order when order matters.
5. **`type` is `distribution`** for a multi-file unit. A single-file packet
   may omit `structure` entirely.
6. **`commands` is optional** — include it only when the package has real,
   runnable commands worth advertising (like easyCV's automation loop).
7. **Every path named in a manifest must exist on disk.** A manifest that
   points at a missing file fails verification (see below).

Minimal shape used by this repo:

```json
{
  "okf_version": "0.2",
  "package_id": "asian-knowledge-base",
  "name": "...",
  "version": "1.0.0",
  "description": "...",
  "language": "en",
  "license": "...",
  "categories": ["..."],
  "tags": ["..."],
  "format": "okf-v0.2",
  "structure": {
    "type": "distribution",
    "main_content": "INDEX.md",
    "reference": ["tracks/track-01-k8s-infra.md"]
  }
}
```

Runtime content packets use the same manifest shape plus payload fields.
See [[content-packet-format]] for that contract.

## Wikilink cross-referencing

`[[package-id]]` is not a live Markdown link. It is a grep-able pointer.
Rules:

1. **Target is always a `package_id`**, never a filename fragment or a
   title. Resolution rule for humans and agents: find the file under
   `docs/knowledge/` whose frontmatter `package_id` equals the link text.
2. **One canonical id per file.** If a rename happens, update the id and
   every `[[link]]` to it in the same commit.
3. **No `[[ ]]` inside frontmatter.** Use the `related` array there.
4. **Body prose may mix ids and annotations**: `- [[t01-rbac-identity]] —
ServiceAccounts layer` is the standard form.
5. **Link down and up.** A track page links to its modules; a module page
   links back to its track in Related. A page with zero inbound links is
   either new or mis-linked; fix it, do not leave orphans.
6. **Meta pages link through INDEX.** Every meta page (`style-guide`,
   `glossary`, this page, `content-packet-format`) appears in the INDEX
   Meta section.

## Verification

Before handing back edits to `docs/knowledge/`:

1. Frontmatter parses as YAML and contains every required field.
2. `okf-manifest.json` parses as JSON and every path in it resolves to a
   real file relative to its directory.
3. Every `[[id]]` resolves to exactly one file with that `package_id`.
4. Spot-check with PyYAML:

   ```bash
   python3 -c "import yaml; d=yaml.safe_load(open('docs/knowledge/INDEX.md').read().split('---')[1]); print(d['okf_version'])"
   ```

## Related

- [[package-format]] — package body shape; inherits this frontmatter.
- [[content-packet-format]] — runtime OKF packets for learning content.
- [[index]] — start here.
