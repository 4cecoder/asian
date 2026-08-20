---
id: glossary
title: Glossary
track: meta
status: partial
tags: [meta, glossary]
---

# Glossary

Terms used across the knowledge base that aren't self-explanatory from
context alone. Add to this file as new packages introduce new terms —
don't let definitions drift out of sync across packages; this is the one
place they live.

| Term                            | Meaning                                                                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keigo                           | Japanese formal/honorific speech register, graded by politeness level.                                                                                                |
| Banmal / Jondaenmal             | Korean informal (banmal) vs. formal (jondaenmal) speech registers.                                                                                                    |
| FSRS                            | Free Spaced Repetition Scheduler — a 17-parameter memory model (v4.5 in this spec) used to schedule review intervals; successor to SM-2.                              |
| SM-2                            | SuperMemo 2 algorithm — the classic spaced-repetition scheduling formula, used here as a fallback when FSRS parameters are unavailable.                               |
| Leech                           | An SRS card the learner repeatedly fails; gets quarantined out of normal review rotation.                                                                             |
| DTW                             | Dynamic Time Warping — algorithm for aligning two audio/time-series sequences of different lengths, used here to align a learner's pronunciation against a reference. |
| G2P                             | Grapheme-to-Phoneme — converts written text to phoneme sequences, used for pronunciation scoring.                                                                     |
| VAD                             | Voice Activity Detection — detects speech vs. silence in an audio stream.                                                                                             |
| LUFS                            | Loudness Units Full Scale — perceptual loudness measurement; the spec normalizes generated speech to -16 LUFS.                                                        |
| FSM                             | Finite State Machine — used here to drive travel roleplay scenario dialogue state.                                                                                    |
| Barge-in                        | When a user starts speaking while the system's TTS output is still playing, interrupting it.                                                                          |
| Convex                          | The reactive database/backend platform used for schema, mutations, and live queries (Track 8).                                                                        |
| Volterra / F5 Distributed Cloud | Edge load-balancing / CDN mesh layer sitting in front of the Kubernetes cluster (Track 1).                                                                            |
| PSA                             | Pod Security Admission — Kubernetes-native pod security policy enforcement (Track 1).                                                                                 |

## Related

- [[INDEX]]
- [[style-guide]] — for how new terms should be written once defined here.
