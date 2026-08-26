---
okf_version: "0.2"
package_id: adr-0008-llm-refinement-provider
title: "ADR 0008: LLM refinement — provider-agnostic OpenAI-compatible endpoint behind RefinementPipeline"
track: meta
status: stable
stale_after: 2027-08-25
tags: [adr, llm, moderation, content-pipeline, decision]
related:
  [
    adr-0005-community-ingestion-pipeline,
    content-packet-format,
    okf-adoption,
    track-06-llm-roleplay,
  ]
---

# ADR 0008: LLM refinement provider

## Status

Accepted. The decision is direction, not a build report: the
`RefinementPipeline` seam and the deterministic default implementation
exist in `apps/worker/app/services/refinement.py`, and the OpenAI-compatible
LLM pass described here is **not implemented yet** (in flight this
sprint). Until it lands, every submission is refined by deterministic
normalization only.

## Context

[[adr-0005-community-ingestion-pipeline]] fixed the ingestion pipeline's
shape: submit, refine, moderate, publish. Its refinement stage currently
runs `DeterministicNormalizationPipeline`, which trims whitespace and
validates payload shape. It cannot judge whether a phrase's English gloss
matches its Korean text, whether a correction improves an entry, or
whether an example sentence is grammatical. That semantic work needs a
real LLM pass (Tracks 4–6 territory).

Three constraints shaped this decision:

1. **No vendor lock-in for a self-hostable product.** The platform's own
   direction favors edge and local inference (Track 6 runs Ollama-style
   local models). Refinement must run against a laptop with no API key
   during development and against a hosted model in production without
   code changes.
2. **The pipeline already has the right seam.** `RefinementPipeline` is a
   Python protocol returning `(outcome, ai_notes, refined_payload)`. An
   LLM pass is just another implementation of that protocol.
3. **Failure modes must fail safe.** The queue feeds public learning
   content ([[content-packet-format]]). A hallucinated "approval" or a
   discarded contributor submission are both real harms with different
   costs; the policy below prices them deliberately.

## Decision

### 1. One wire format: OpenAI-compatible chat completions

The refinement client speaks the **OpenAI-compatible chat-completions
API** (`POST {base_url}/chat/completions`) and nothing else. Three
provider classes work through configuration alone:

| Provider  | Example base URL            | API key      |
| --------- | --------------------------- | ------------ |
| Ollama    | `http://localhost:11434/v1` | not required |
| LM Studio | `http://localhost:1234/v1`  | not required |
| OpenAI    | `https://api.openai.com/v1` | required     |

Configuration is three settings: base URL, model name, optional API key.
The worker uses its existing HTTP stack (httpx); there is no vendor SDK
dependency. Switching providers or models is a settings change, never a
code change.

### 2. The LLM sits behind `RefinementPipeline`, composed with the deterministic pass

The LLM pass implements the existing `RefinementPipeline` protocol.
Composition order inside the LLM-enabled pipeline:

1. Deterministic shape validation runs first. Malformed payloads never
   reach the model; they take the existing `needsReview` path unchanged.
2. The model refines the validated payload and returns structured
   output plus notes.
3. The refined output passes deterministic validation again before any
   approval.

`DeterministicNormalizationPipeline` remains the default implementation
and the fallback whenever the LLM pipeline raises or is disabled.

### 3. Conservative approval policy: parse failure means needsReview, never auto-reject

Every failure mode of the LLM step — unparseable output, schema mismatch
in the refined payload, validation failure after refinement, timeout,
provider error — routes to **`needsReview`** with the failure recorded in
`aiNotes`. Two outcomes are forbidden:

- **Never auto-reject on parse or validation failure.** Rejection ends a
  contribution. That decision belongs to a human moderator, who sees the
  failed row in the moderation queue with the model's notes attached.
- **Never auto-approve anything the model produced without the post-refinement
  validation pass passing.** The model does not hold approval authority;
  validated structure plus the human gate do.

Exceptions that raise (network errors mid-processing) keep their existing
behavior from the protocol contract: the caller treats them as processing
failures, and the hourly sweep releases the row back to `pending`. The
distinction: an exception leaves the state machine untouched; a parsed-but-unusable
result becomes a reviewable artifact.

### 4. LLM refinement is disabled by default

A settings flag disables the LLM path unless explicitly enabled. Default
configuration runs deterministic-only refinement, so fresh checkouts and
CI need no model, no key, and no network. Enabling it requires setting
the endpoint settings; missing settings fail loudly at startup per the
existing `ConfigurationException` pattern, not silently at first use.

### 5. No keys in the repository

Model endpoints and keys live only in environment variables, read as
`SecretStr` by pydantic-settings alongside the existing `CONVEX__*`
settings. Per SECURITY.md's "Where secrets actually live":

- Local development: shell environment or an uncommitted `.env`.
- Convex-side runtime values: `bunx convex env` (already the pattern for
  `WORKER_SECRET`).
- CI/CD: `gh secret set`.
- Production cluster: Kubernetes secrets injected as environment
  variables.

No committed file ever contains a base URL with credentials or an API
key. A committed `.env` is a review-blocking mistake, matching the
existing repo rule.

## Implementation status (2026-08-25)

| Piece                                                 | State                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `RefinementPipeline` protocol + deterministic default | Merged (`c37ae8b`)                                                            |
| Claim/complete loop end to end                        | Merged (`c37ae8b`)                                                            |
| OpenAI-compatible client                              | Not started — this sprint's target                                            |
| Settings flag + key handling                          | Not started                                                                   |
| Conservative failure routing (`needsReview`)          | Partially exists (deterministic path); LLM-path routing lands with the client |

## Consequences

- Development and CI stay hermetic: zero keys, zero network, deterministic
  behavior unless someone opts in.
- Model quality problems surface as moderator workload (needsReview), never
  as silent content loss or silent bad publishes.
- Adding a fourth provider class (or a future protocol revision) is a base-URL
  entry, not an integration project.
- The moderation queue is the blast-radius boundary for model mistakes;
  staffing it matters more once the LLM path enables anywhere.
- Track 6 roleplay inference remains a separate concern; this decision covers
  batch refinement only, not real-time conversation serving.

## Related

- [[adr-0005-community-ingestion-pipeline]] — the pipeline this refines
  into; statuses and moderation roles live there.
- [[content-packet-format]] — the published artifact refined content
  must satisfy.
- [[track-06-llm-roleplay]] — separate LLM scope: real-time roleplay,
  not batch refinement.
