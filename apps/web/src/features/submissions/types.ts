/**
 * Domain types for community content submissions.
 *
 * These mirror `convex/submissionTypes.ts` (the backend contract) — the
 * kinds, statuses, languages, and payload shapes are fixed there. Do not
 * invent new values locally; if the backend changes, update both sides.
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

// ---------------------------------------------------------------------------
// Dynamic form field descriptors
// ---------------------------------------------------------------------------

export interface PayloadFieldDef {
  id: string;
  label: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  /** Renders a select instead of a text input when provided. */
  options?: readonly { value: string; label: string }[];
}

const CORRECTION_TARGETS = [
  { value: "dictionaryEntry", label: "Dictionary entry" },
  { value: "phrase", label: "Phrase" },
  { value: "card", label: "Deck card" },
] as const;

const CORRECTION_FIELDS = [
  { value: "reading", label: "Reading" },
  { value: "partOfSpeech", label: "Part of speech" },
  { value: "definition", label: "Definition" },
] as const;

export const PAYLOAD_FIELDS: Record<ComposableKind, readonly PayloadFieldDef[]> = {
  phrase: [
    { id: "text", label: "Phrase", required: true, multiline: true, placeholder: "안녕하세요" },
    { id: "english", label: "English meaning", required: true, placeholder: "Hello (polite)" },
    {
      id: "romanization",
      label: "Romanization / reading (optional)",
      placeholder: "annyeonghaseyo",
    },
    { id: "situation", label: "Situation (optional)", placeholder: "Greeting someone politely" },
  ],
  card: [
    { id: "front", label: "Front", required: true, placeholder: "ありがとう" },
    { id: "back", label: "Back", required: true, placeholder: "Thank you" },
    {
      id: "notes",
      label: "Notes (optional)",
      multiline: true,
      placeholder: "Usage hints, register…",
    },
  ],
  correction: [
    {
      id: "targetType",
      label: "What are you correcting?",
      required: true,
      options: CORRECTION_TARGETS,
    },
    { id: "targetId", label: "Headword or entry id", required: true, placeholder: "食べる" },
    { id: "field", label: "Which part is wrong?", required: true, options: CORRECTION_FIELDS },
    { id: "proposedValue", label: "Corrected value", required: true },
    { id: "reason", label: "Why (source or explanation, optional)", multiline: true },
  ],
  exampleSentence: [
    { id: "sentence", label: "Sentence", required: true, multiline: true },
    { id: "english", label: "English translation", required: true },
    { id: "targetHeadword", label: "Word this example teaches (optional)", placeholder: "勉強" },
  ],
};

export type PayloadFieldValue = string;

export type BuildPayloadResult =
  { ok: true; payload: SubmissionPayload } | { ok: false; error: string };

const CORRECTION_FIELD_VALUES: ReadonlySet<string> = new Set(CORRECTION_FIELDS.map((f) => f.value));

/**
 * Turn raw form values into a typed payload, validating required fields.
 * Returns a tagged result rather than throwing so the composer can show
 * inline validation messages.
 */
export function buildPayload(
  kind: ComposableKind,
  values: Readonly<Record<string, PayloadFieldValue>>,
): BuildPayloadResult {
  const missing = PAYLOAD_FIELDS[kind]
    .filter((f) => f.required && !values[f.id]?.trim())
    .map((f) => f.label);
  if (missing.length > 0) {
    return { ok: false, error: `Required: ${missing.join(", ")}` };
  }

  const val = (id: string): string => values[id]!.trim();
  const optional = (id: string): string | undefined => values[id]?.trim() || undefined;

  switch (kind) {
    case "phrase":
      return {
        ok: true,
        payload: {
          text: val("text"),
          english: val("english"),
          romanization: optional("romanization"),
          situation: optional("situation"),
        },
      };
    case "card":
      return {
        ok: true,
        payload: { front: val("front"), back: val("back"), notes: optional("notes") },
      };
    case "correction": {
      const rawTarget = val("targetType");
      const targetType = (
        CORRECTION_TARGETS.some((t) => t.value === rawTarget) ? rawTarget : "dictionaryEntry"
      ) as CorrectionPayload["targetType"];
      const rawField = val("field");
      return {
        ok: true,
        payload: {
          targetType,
          targetId: val("targetId"),
          // Backend stores this as a free string; normalize anything odd
          // to the human-readable selection rather than failing silently.
          field: CORRECTION_FIELD_VALUES.has(rawField) ? rawField : "definition",
          proposedValue: val("proposedValue"),
          reason: optional("reason"),
        },
      };
    }
    case "exampleSentence":
      return {
        ok: true,
        payload: {
          sentence: val("sentence"),
          english: val("english"),
          targetHeadword: optional("targetHeadword"),
        },
      };
  }
}
