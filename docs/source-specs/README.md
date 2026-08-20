# Source Specs — Provenance Notes

Raw material for this knowledge base: three `.docx` files dropped in
`~/Downloads` on 2026-08-20, describing a 1,000-micro-task engineering
backlog for the **Asian Language Learning Platform** (10 tracks × 100 tasks).

## Files and what they actually are

| File in this folder         | Original filename                                                                               | Status                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `complete-spec-nextjs16.md` | `Asian Language Learning Platform — Complete 1,000 Micro-Tasks Specification (Next.js 16).docx` | **Canonical.** Used as the extraction source.                                                                                                                                           |
| _(not copied — duplicate)_  | `...Master 1,000 Micro-Tasks Blueprint (Next.js 16).docx`                                       | Same content as the canonical file, reformatted (fewer paragraph breaks). Title-cased "(Next.js 16)". No unique information — not copied to avoid maintaining two copies of one source. |
| _(not copied — superseded)_ | `...Complete 1,000 Micro-Tasks Production Specification.docx`                                   | Earlier revision of the canonical file, targeting **Next.js 15** instead of 16. Superseded.                                                                                             |

All three were compared byte-for-byte after `.docx → .txt` conversion
(`textutil -convert txt`); the Master Blueprint and Production Specification
differ from the canonical file only in whitespace/heading text and the
Next.js 15 → 16 rename, respectively. If you find the original `.docx`
files again and want to re-verify, they were in `~/Downloads`.

## Important: the source document is truncated

The canonical spec is **not actually complete**. It stops mid-document.
Verified by task-ID census against the doc's own table of contents:

| Track                      | ID range        | Present in source?                     |
| -------------------------- | --------------- | -------------------------------------- |
| 1 — Kubernetes & Infra     | TASK-001–100    | ✅ Full (100/100)                      |
| 2 — Docker & CI/CD         | TASK-CI-001–100 | ✅ Full (100/100)                      |
| 3 — Python/FastAPI Backend | PY-001–100      | ✅ Full (100/100)                      |
| 4 — Moonshot TTS           | TTS-001–100     | ✅ Full (100/100)                      |
| 5 — STT / Pronunciation    | STT-001–100     | ✅ Full (100/100)                      |
| 6 — Edge LLM / Roleplay    | TASK-101–200    | ⚠️ Partial — cuts off around TASK-180  |
| 7 — SRS Engine             | SRS-001–100     | ❌ Overview table only, no task bodies |
| 8 — Convex DB              | TASK-801–900    | ❌ Overview table only, no task bodies |
| 9 — Next.js 16 Frontend    | TASK-FE-001–100 | ❌ Overview table only, no task bodies |
| 10 — Phrasebook PWA        | TASK-10-001–100 | ❌ Overview table only, no task bodies |

**Implication:** the knowledge base under `docs/knowledge/` faithfully
reflects this — Tracks 1–5 have full per-module packages, Track 6 has a
partial package, and Tracks 7–10 have stub pages carrying only the scope
description from the allocation table. If a more complete version of the
source document turns up, re-run the extraction for the missing tracks.

## Style pass

Writing conventions applied when extracting task packages (short sentences,
one instruction per step, approved-word discipline for instructional text)
are adapted from **ASD-STE100 (Simplified Technical English), Issue 9**.
See `docs/knowledge/style-guide.md` for the derived rules — that file
paraphrases the relevant principles rather than reproducing ASD-STE100's
copyrighted text, since ASD-STE100 usage rights are restricted to specific
aerospace/defense member organizations and this project is not one of them.
