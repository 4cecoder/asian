/**
 * Domain types for the moderation queue.
 *
 * The queue tabs cover exactly the three pre-decision statuses the
 * backend's `submissions.moderationQueue` query accepts — do not widen
 * this set locally; approved/rejected rows leave the queue by definition.
 *
 * Queue records reuse the submission record shape from features/submissions
 * (same table, same backend contract) — see ./adapter.ts for how the
 * Convex documents flow in. Label maps also come from that module so the
 * contributor-facing and moderator-facing UIs can never drift apart.
 */

/** The three open statuses a moderator acts on, in tab display order. */
export const QUEUE_STATUSES = ["needsReview", "pending", "processing"] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  needsReview: "Needs review",
  pending: "Pending",
  processing: "Processing",
};

/** Tab shown first — AI-flagged items need human eyes before anything else. */
export const DEFAULT_QUEUE_STATUS: QueueStatus = "needsReview";

/** What a reviewer decision sends to `submissions.reviewSubmission`. */
export type ReviewDecision = "approved" | "rejected";
