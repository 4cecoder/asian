/**
 * Domain types for community content submissions.
 *
 * These mirror `convex/submissionTypes.ts` (the backend contract) — the
 * kinds, statuses, languages, and payload shapes are fixed there. Do not
 * invent new values locally; if the backend changes, update both sides.
 *
 * Composer-specific form logic (field descriptors + the values→payload
 * builder) lives in ./payloadForm.ts; record filtering for the list view
 * lives in ./filtering.ts.
 */

/** Languages open for community submission (priority set). */
export const SUBMISSION_LANGUAGES = ["ko", "ja", "zh"] as const;
export type SubmissionLanguage = (typeof SUBMISSION_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SubmissionLanguage, string> = {
  ko: "Korean",
  ja: "Japanese",
  zh: "Chinese",
};

/**
 * Submission kinds. All five exist on the backend (`submissionKind`
 * validator); the composer offers the four member-facing ones —
 * situationPack is authored by moderators/pipeline, not composed here,
 * but the list UI can still render records of that kind.
 */
export const SUBMISSION_KINDS = ["phrase", "card", "correction", "exampleSentence"] as const;
export type ComposableKind = (typeof SUBMISSION_KINDS)[number];
export type SubmissionKind = ComposableKind | "situationPack";

export const KIND_LABELS: Record<SubmissionKind, string> = {
  phrase: "Phrase",
  card: "Deck card",
  correction: "Dictionary correction",
  exampleSentence: "Example sentence",
  situationPack: "Situation pack",
};

/** Legacy deck-import kinds that share the submissions table (see schema). */
export type LegacyDeckImportKind = "anki_import" | "quizlet_reimport" | "manual_deck";
export type SubmissionRecordKind = SubmissionKind | LegacyDeckImportKind;

export const LEGACY_KIND_LABELS: Record<LegacyDeckImportKind, string> = {
  anki_import: "Anki import",
  quizlet_reimport: "Quizlet reimport",
  manual_deck: "Manual deck",
};

/** Lifecycle statuses — exactly the five the backend uses. */
export const SUBMISSION_STATUSES = [
  "pending",
  "processing",
  "approved",
  "rejected",
  "needsReview",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Per-kind payload shapes — mirror convex/submissionTypes.ts validators. */
export type PhrasePayload = {
  text: string;
  english: string;
  romanization?: string;
  situation?: string;
};
export type CardPayload = {
  front: string;
  back: string;
  notes?: string;
};
export type CorrectionPayload = {
  targetType: "dictionaryEntry" | "phrase" | "card";
  targetId: string;
  field: string;
  proposedValue: string;
  reason?: string;
};
export type ExampleSentencePayload = {
  sentence: string;
  english: string;
  targetHeadword?: string;
};

export type SubmissionPayload =
  PhrasePayload | CardPayload | CorrectionPayload | ExampleSentencePayload;

/** What the composer hands to the API layer before an id exists. */
export interface SubmitSubmissionArgs {
  kind: ComposableKind;
  language: SubmissionLanguage;
  payload: SubmissionPayload;
  sourceUrl?: string;
}

/** One row of the submissions table as the client sees it. */
export interface SubmissionRecord {
  _id: string;
  _creationTime: number;
  status: SubmissionStatus;
  /** Legacy deck-import rows carry these instead of a community kind. */
  kind?: SubmissionRecordKind;
  language?: SubmissionLanguage;
  payload?: unknown;
  sourceUrl?: string;
  /** Human moderator feedback, present after review decisions. */
  reviewerNotes?: string;
  /** AI refinement pipeline notes (what was normalized, flagged, etc.). */
  aiNotes?: string;
  createdAt?: number;
}
