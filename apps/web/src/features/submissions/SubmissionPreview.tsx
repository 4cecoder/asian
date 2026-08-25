"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  KIND_LABELS,
  LANGUAGE_LABELS,
  type ComposableKind,
  type SubmissionLanguage,
} from "./types";

/** Human labels for payload keys, used by the preview. */
const FIELD_LABELS: Record<string, string> = {
  text: "Phrase",
  english: "English",
  romanization: "Romanization",
  situation: "Situation",
  front: "Front",
  back: "Back",
  notes: "Notes",
  targetType: "Correcting a",
  targetId: "Headword / entry id",
  field: "Which part",
  proposedValue: "Corrected value",
  reason: "Reason",
  sentence: "Sentence",
  targetHeadword: "Teaches",
};

const VALUE_LABELS: Record<string, string> = {
  dictionaryEntry: "Dictionary entry",
  phrase: "Phrase",
  card: "Deck card",
  reading: "Reading",
  partOfSpeech: "Part of speech",
  definition: "Definition",
};

/**
 * Read-only preview of what the member is about to submit — mirrors the
 * payload fields back with friendly labels so mistakes surface before
 * the AI pipeline sees them.
 */
export function SubmissionPreview({
  kind,
  language,
  values,
  sourceUrl,
}: {
  kind: ComposableKind;
  language: SubmissionLanguage;
  values: Readonly<Record<string, string>>;
  sourceUrl?: string;
}) {
  const rows = Object.entries(values).filter(([, v]) => v.trim() !== "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium">{KIND_LABELS[kind]}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Language</dt>
            <dd className="font-medium">{LANGUAGE_LABELS[language]}</dd>
          </div>
          {rows.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4">
              <dt className="text-muted-foreground shrink-0">{FIELD_LABELS[key] ?? key}</dt>
              <dd className="max-w-[60%] text-right font-medium break-words whitespace-pre-wrap">
                {VALUE_LABELS[value] ?? value}
              </dd>
            </div>
          ))}
          {sourceUrl?.trim() ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Source</dt>
              <dd className="max-w-[60%] truncate text-right font-medium">{sourceUrl.trim()}</dd>
            </div>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
}
