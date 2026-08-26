"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmissionStatusBadge } from "@/features/submissions/SubmissionStatusBadge";
import { KIND_LABELS, LANGUAGE_LABELS, LEGACY_KIND_LABELS } from "@/features/submissions/types";

import type { ModerationQueueRecord } from "./adapter";
import { formatPayloadLines } from "./payloadFormat";
import type { ReviewDecision } from "./types";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Private notes block, styled like the contributor list's (ADR 0004). */
function NotesBlock({ label, notes }: { label: string; notes: string }) {
  return (
    <div className="bg-muted rounded-lg px-3 py-2">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-0.5 text-sm whitespace-pre-wrap">{notes}</p>
    </div>
  );
}

interface ModerationQueueItemProps {
  submission: ModerationQueueRecord;
  /** Resolves true when the decision was recorded server-side. */
  onDecide: (decision: ReviewDecision, reviewerNotes: string) => Promise<boolean>;
}

/**
 * One reviewable queue card: kind/language/date summary, full payload
 * detail lines, source link, AI notes for context, and the decision
 * controls. Busy and outcome state are per-card; transport/server errors
 * surface through the queue section's shared alert.
 */
export function ModerationQueueItem({ submission, onDecide }: ModerationQueueItemProps) {
  const [notes, setNotes] = useState("");
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);

  const decide = async (decision: ReviewDecision) => {
    setOutcome(null);
    setPendingDecision(decision);
    const ok = await onDecide(decision, notes);
    setPendingDecision(null);
    if (ok) setOutcome(decision === "approved" ? "Approved." : "Rejected.");
  };

  const isBusy = pendingDecision !== null;
  const languageLabel = submission.language ? LANGUAGE_LABELS[submission.language] : null;
  // Legacy deck-import rows share the submissions table and can surface
  // in the queue — label them like the contributor list does.
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
  const payloadLines = formatPayloadLines(submission.kind, submission.payload);

  return (
    <li>
      <Card>
        <CardContent className="grid gap-3">
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

          {payloadLines.length > 0 ? (
            <dl className="grid gap-1.5 text-sm">
              {payloadLines.map((line) => (
                <div key={line.term} className="grid grid-cols-[9rem_1fr] gap-2">
                  <dt className="text-muted-foreground">{line.term}</dt>
                  <dd className="whitespace-pre-wrap">{line.detail}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <pre className="bg-muted overflow-x-auto rounded-lg px-3 py-2 text-xs">
              {JSON.stringify(submission.payload ?? null, null, 2)}
            </pre>
          )}

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

          {submission.aiNotes ? (
            <NotesBlock label="AI pipeline notes" notes={submission.aiNotes} />
          ) : null}

          <div className="mt-1 grid gap-3 border-t pt-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="grid gap-1.5">
              <label htmlFor={`reviewer-notes-${submission._id}`} className="text-sm font-medium">
                Reviewer notes <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                id={`reviewer-notes-${submission._id}`}
                value={notes}
                disabled={isBusy}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setOutcome(null);
                }}
                placeholder="Context recorded with your decision"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                disabled={isBusy}
                onClick={() => void decide("rejected")}
              >
                {pendingDecision === "rejected" ? "Rejecting…" : "Reject"}
              </Button>
              <Button disabled={isBusy} onClick={() => void decide("approved")}>
                {pendingDecision === "approved" ? "Approving…" : "Approve"}
              </Button>
            </div>
          </div>

          {outcome ? (
            <p role="status" className="text-sm">
              {outcome} This submission has left the queue.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}
