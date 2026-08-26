/**
 * Dynamic per-kind submission form: field descriptors and the pure
 * values→payload builder behind SubmissionComposer's validation. Split
 * from ./types.ts so the backend-contract types stay separate from this
 * composer-only logic (and so buildPayload is unit-testable without any
 * React or Convex imports).
 */

import type {
  CardPayload,
  ComposableKind,
  CorrectionPayload,
  ExampleSentencePayload,
  PhrasePayload,
  SubmissionPayload,
} from "./types";

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
        } satisfies PhrasePayload,
      };
    case "card":
      return {
        ok: true,
        payload: {
          front: val("front"),
          back: val("back"),
          notes: optional("notes"),
        } satisfies CardPayload,
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
        } satisfies CorrectionPayload,
      };
    }
    case "exampleSentence":
      return {
        ok: true,
        payload: {
          sentence: val("sentence"),
          english: val("english"),
          targetHeadword: optional("targetHeadword"),
        } satisfies ExampleSentencePayload,
      };
  }
}
