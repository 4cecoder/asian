---
okf_version: "0.2"
package_id: glossary
id: glossary # deprecated alias kept during OKF migration
title: Glossary
track: meta
status: draft
stale_after: 2027-08-25
tags: [meta, glossary]
related:
  [
    index,
    style-guide,
    content-packet-format,
    adr-0005-community-ingestion-pipeline,
    adr-0008-llm-refinement-provider,
  ]
---

# Glossary

Terms used across the knowledge base that aren't self-explanatory from
context alone. Add to this file as new packages introduce new terms —
don't let definitions drift out of sync across packages; this is the one
place they live.

| Term                            | Meaning                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keigo                           | Japanese formal/honorific speech register, graded by politeness level.                                                                                                                                                                                                                               |
| Banmal / Jondaenmal             | Korean informal (banmal) vs. formal (jondaenmal) speech registers.                                                                                                                                                                                                                                   |
| FSRS                            | Free Spaced Repetition Scheduler — a 17-parameter memory model (v4.5 in this spec) used to schedule review intervals; successor to SM-2.                                                                                                                                                             |
| SM-2                            | SuperMemo 2 algorithm — the classic spaced-repetition scheduling formula, used here as a fallback when FSRS parameters are unavailable.                                                                                                                                                              |
| Leech                           | An SRS card the learner repeatedly fails; gets quarantined out of normal review rotation.                                                                                                                                                                                                            |
| DTW                             | Dynamic Time Warping — algorithm for aligning two audio/time-series sequences of different lengths, used here to align a learner's pronunciation against a reference.                                                                                                                                |
| G2P                             | Grapheme-to-Phoneme — converts written text to phoneme sequences, used for pronunciation scoring.                                                                                                                                                                                                    |
| VAD                             | Voice Activity Detection — detects speech vs. silence in an audio stream.                                                                                                                                                                                                                            |
| LUFS                            | Loudness Units Full Scale — perceptual loudness measurement; the spec normalizes generated speech to -16 LUFS.                                                                                                                                                                                       |
| FSM                             | Finite State Machine — used here to drive travel roleplay scenario dialogue state.                                                                                                                                                                                                                   |
| Barge-in                        | When a user starts speaking while the system's TTS output is still playing, interrupting it.                                                                                                                                                                                                         |
| Convex                          | The reactive database/backend platform used for schema, mutations, and live queries (Track 8).                                                                                                                                                                                                       |
| Refinement pipeline             | The AI-refinement stage of community ingestion ([[adr-0005-community-ingestion-pipeline]]). Implemented as the Python worker's `RefinementPipeline`; the default pass is deterministic normalization, and an LLM pass behind the same interface is planned per [[adr-0008-llm-refinement-provider]]. |
| Content packet                  | A versioned OKF v0.2 bundle of published learning content (phrase packs, deck packs, dictionary corrections) produced by the ingestion pipeline. Contract in [[content-packet-format]].                                                                                                              |
| Moderator                       | A user holding the `moderator` role in the `userRoles` table; approves or rejects submissions and publishes content packets. Checks live in `convex/authz.ts`.                                                                                                                                       |
| Submission kind                 | The declared type of a community submission: `phrase`, `card`, `correction`, `exampleSentence`, or `situationPack`. Deck-import kinds (`anki_import`, `quizlet_reimport`, `manual_deck`) share the same `submissions` table. Shapes live in `convex/submissionTypes.ts`.                             |
| Volterra / F5 Distributed Cloud | Edge load-balancing / CDN mesh layer sitting in front of the Kubernetes cluster (Track 1).                                                                                                                                                                                                           |
| PSA                             | Pod Security Admission — Kubernetes-native pod security policy enforcement (Track 1).                                                                                                                                                                                                                |

## Related

- [[index]]
- [[style-guide]] — for how new terms should be written once defined here.
