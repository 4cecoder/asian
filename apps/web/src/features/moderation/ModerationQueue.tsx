"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useModerationQueue, useReviewSubmission, type ModerationQueueRecord } from "./adapter";
import { ModerationQueueItem } from "./ModerationQueueItem";
import {
  DEFAULT_QUEUE_STATUS,
  QUEUE_STATUSES,
  QUEUE_STATUS_LABELS,
  type QueueStatus,
  type ReviewDecision,
} from "./types";

/**
 * The moderation queue: one tab per open status, review-priority ordered
 * cards, approve/reject with optional reviewer notes. Data comes from the
 * reactive Convex query via the adapter — no local cache, no optimistic
 * updates; decided rows disappear when the status change propagates.
 */
export function ModerationQueue() {
  const [status, setStatus] = useState<QueueStatus>(DEFAULT_QUEUE_STATUS);
  const [announcement, setAnnouncement] = useState("");
  const { submissions, isLoading } = useModerationQueue(status);
  const { state, review, clearError } = useReviewSubmission();

  const decide = async (
    submissionId: ModerationQueueRecord["_id"],
    decision: ReviewDecision,
    notes: string,
  ): Promise<boolean> => {
    const ok = await review(submissionId, decision, notes.trim() || undefined);
    if (ok) {
      // Announced via the live region below — it survives the reviewed
      // card unmounting as the query updates.
      setAnnouncement(decision === "approved" ? "Submission approved." : "Submission rejected.");
    }
    return ok;
  };

  return (
    <section aria-labelledby="moderation-queue-heading" className="grid gap-4">
      <h2 id="moderation-queue-heading" className="sr-only">
        Moderation queue
      </h2>

      {/* Screen-reader announcement for completed decisions. */}
      <p className="sr-only" role="status">
        {announcement}
      </p>

      <div role="group" aria-label="Filter queue by status" className="flex flex-wrap gap-2">
        {QUEUE_STATUSES.map((s) => {
          const active = status === s;
          return (
            <Button
              key={s}
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => setStatus(s)}
            >
              {QUEUE_STATUS_LABELS[s]}
            </Button>
          );
        })}
      </div>

      {state.error ? (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm"
        >
          <span>{state.error}</span>
          <Button variant="ghost" size="xs" onClick={clearError}>
            Dismiss
          </Button>
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading queue…</p>
      ) : submissions !== null && submissions.length > 0 ? (
        <ul className="grid gap-3">
          {submissions.map((submission) => (
            <ModerationQueueItem
              key={submission._id}
              submission={submission}
              onDecide={(decision, notes) => decide(submission._id, decision, notes)}
            />
          ))}
        </ul>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground py-6 text-center text-sm">
            No open submissions with this status.
          </CardContent>
        </Card>
      )}
    </section>
  );
}
