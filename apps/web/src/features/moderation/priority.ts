/**
 * Pure queue-ordering helpers for the moderation view. Split from
 * ./adapter.ts so the ranking logic is unit-testable without Convex's
 * react bindings — the adapter just calls into this.
 */

import type { SubmissionRecord, SubmissionStatus } from "../submissions/types";

/**
 * Review-priority rank per status: items needing a human decision first
 * (AI flagged them), then fresh submissions, then in-flight processing.
 * Terminal statuses (approved/rejected) can appear only if a record is
 * reviewed while its tab is open — they sink below everything live.
 */
const PRIORITY_RANK: Record<SubmissionStatus, number> = {
  needsReview: 0,
  pending: 1,
  processing: 2,
  approved: 3,
  rejected: 4,
};

/**
 * Order a queue page for review: highest priority status first, oldest
 * submission first within a status (FIFO — matches the backend's
 * by_status_createdAt scan order). Stable and non-mutating; the input
 * array is never reordered in place. Generic so record subtypes (e.g. the
 * adapter's branded-id ModerationQueueRecord) pass through unchanged.
 */
export function sortQueueByPriority<T extends SubmissionRecord>(records: readonly T[]): T[] {
  return [...records].sort((a, b) => {
    const rankDelta =
      (PRIORITY_RANK[a.status] ?? Number.MAX_SAFE_INTEGER) -
      (PRIORITY_RANK[b.status] ?? Number.MAX_SAFE_INTEGER);
    if (rankDelta !== 0) return rankDelta;
    return a._creationTime - b._creationTime;
  });
}
