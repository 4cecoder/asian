"use client";

import { Card, CardContent } from "@/components/ui/card";

import { SubmissionStatusBadge } from "./SubmissionStatusBadge";
import { KIND_LABELS, LANGUAGE_LABELS, LEGACY_KIND_LABELS, type SubmissionRecord } from "./types";

/** Type guard: does this payload look like the correction shape? */
function isCorrectionPayload(
  payload: unknown,
): payload is { targetType: string; targetId: string; proposedValue: string } {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.targetType === "string" &&
    typeof p.targetId === "string" &&
    typeof p.proposedValue === "string"
  );
}

/**
 * One-line summary of the payload for list scanning. Payloads are
 * `unknown` on the record (refinement may reshape them), so every
 * branch narrows defensively and falls back to a generic summary.
 */
function payloadSummary(kind: string | undefined, payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";
  const p = payload as Record<string, unknown>;
  const str = (key: string): string => (typeof p[key] === "string" ? p[key] : "");

  switch (kind) {
    case "phrase":
      return `${str("text")} — ${str("english")}`;
    case "card":
      return `${str("front")} — ${str("back")}`;
    case "correction":
      return isCorrectionPayload(payload)
        ? `${payload.targetId}: ${payload.proposedValue}`
        : "Dictionary correction";
    case "exampleSentence":
      return `${str("sentence")} — ${str("english")}`;
    case "situationPack":
      return str("situation") ? `Situation pack: ${str("situation")}` : "Situation pack";
    default:
      return "";
  }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function NotesBlock({ label, notes }: { label: string; notes: string }) {
  return (
    <div className="bg-muted rounded-lg px-3 py-2">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-0.5 text-sm whitespace-pre-wrap">{notes}</p>
    </div>
  );
}

/** A single submission row: summary, badges, and any reviewer/AI notes. */
export function SubmissionListItem({ submission }: { submission: SubmissionRecord }) {
  const hasNotes = Boolean(submission.reviewerNotes ?? submission.aiNotes);
  const kindLabel: string = (() => {
    switch (submission.kind) {
      case undefined:
        return "Contribution";
      case "anki_import":
      case "quizlet_reimport":
      case "manual_deck":
        return LEGACY_KIND_LABELS[submission.kind];
      default:
        return KIND_LABELS[submission.kind];
    }
  })();
  const languageLabel = submission.language ? LANGUAGE_LABELS[submission.language] : null;

  return (
    <li>
      <Card>
        <CardContent className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {kindLabel}
              {languageLabel ? ` · ${languageLabel}` : ""}
            </span>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <time
              dateTime={new Date(submission._creationTime).toISOString()}
              className="text-muted-foreground text-sm"
            >
              {formatDate(submission._creationTime)}
            </time>
            <span className="ml-auto">
              <SubmissionStatusBadge status={submission.status} />
            </span>
          </div>

          {(() => {
            const summary = payloadSummary(submission.kind, submission.payload);
            return summary ? <p className="text-muted-foreground text-sm">{summary}</p> : null;
          })()}

          {submission.sourceUrl ? (
            <a
              href={submission.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary truncate text-sm underline-offset-4 hover:underline"
            >
              {submission.sourceUrl}
            </a>
          ) : null}

          {hasNotes ? (
            <div className="mt-1 grid gap-2 border-t pt-3">
              {submission.aiNotes ? (
                <NotesBlock label="AI pipeline notes" notes={submission.aiNotes} />
              ) : null}
              {submission.reviewerNotes ? (
                <NotesBlock label="Reviewer feedback" notes={submission.reviewerNotes} />
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}
