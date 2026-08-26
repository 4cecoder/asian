"use client";

/**
 * Thin adapter between the Convex moderation functions and this feature's
 * UI. Components consume only these hooks (and the plain data types from
 * ./types.ts) — they never import function references or convex/react
 * directly. See ./api.ts for the backend contract.
 */

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";

import type { Id } from "../../../convex/_generated/dataModel";

import { isModeratorRef, moderationQueueRef, reviewSubmissionRef } from "./api";
import { sortQueueByPriority } from "./priority";
import type { QueueStatus, ReviewDecision } from "./types";
import type { SubmissionRecord } from "../submissions/types";

/** Matches the backend's MAX_QUEUE_PAGE cap. */
const QUEUE_FETCH_LIMIT = 100;

/**
 * One row of the moderation queue. Same contract as the contributor-side
 * SubmissionRecord, except `_id` keeps its Convex branding so it can flow
 * straight into `reviewSubmission`'s args without a cast.
 */
export type ModerationQueueRecord = Omit<SubmissionRecord, "_id"> & {
  _id: Id<"submissions">;
};

/**
 * Reactive role check for the signed-in viewer. `isModerator` is null
 * while the query loads — callers must not render an access verdict off
 * null, or non-moderators would see the queue flash on every visit.
 */
export function useIsModerator(): {
  isModerator: boolean | null;
  isLoading: boolean;
} {
  const result = useQuery(isModeratorRef, {});
  return {
    isModerator: result === undefined ? null : result,
    isLoading: result === undefined,
  };
}

/**
 * Reactive page of open submissions for one queue tab, review-priority
 * ordered (see ./priority.ts). `submissions` is null while the query
 * loads; empty array means the tab is genuinely drained.
 */
export function useModerationQueue(status: QueueStatus): {
  submissions: ModerationQueueRecord[] | null;
  isLoading: boolean;
} {
  const page = useQuery(moderationQueueRef, { status, limit: QUEUE_FETCH_LIMIT });

  const submissions = useMemo(() => {
    if (!page) return null;
    return sortQueueByPriority(page);
  }, [page]);

  return {
    submissions,
    isLoading: page === undefined,
  };
}

export interface ReviewState {
  /** True while a decision mutation is in flight — disables both buttons. */
  isReviewing: boolean;
  /** Transport or server-side rejection to show inline, if any. */
  error: string | null;
}

/**
 * Returns a decision callback plus transient state. The callback resolves
 * true when the decision landed; failures surface via `error` (e.g.
 * another moderator already reviewed the row). No optimistic updates —
 * Convex reactivity removes the card once the status change propagates.
 */
export function useReviewSubmission(): {
  state: ReviewState;
  review: (
    submissionId: ModerationQueueRecord["_id"],
    decision: ReviewDecision,
    reviewerNotes?: string,
  ) => Promise<boolean>;
  clearError: () => void;
} {
  const mutate = useMutation(reviewSubmissionRef);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const review = useCallback(
    async (
      submissionId: ModerationQueueRecord["_id"],
      decision: ReviewDecision,
      reviewerNotes?: string,
    ): Promise<boolean> => {
      setIsReviewing(true);
      setError(null);
      try {
        await mutate({ submissionId, decision, reviewerNotes });
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong recording that decision.",
        );
        return false;
      } finally {
        setIsReviewing(false);
      }
    },
    [mutate],
  );

  const clearError = useCallback(() => setError(null), []);

  return { state: { isReviewing, error }, review, clearError };
}
