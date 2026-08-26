/**
 * Typed references to the Convex functions the moderation feature uses.
 * The queue and review functions already exist on the backend
 * (convex/submissions.ts — reused, not wrapped); isModerator is the
 * role-gate query in convex/moderation.ts. Args and results typecheck
 * against the real generated validators end to end.
 *
 *   moderationQueue (query, reactive)
 *     args: { status: "pending" | "processing" | "needsReview", limit? }
 *     → open submissions for that tab, server-side role-checked.
 *   reviewSubmission (mutation)
 *     args: { submissionId, decision: "approved" | "rejected",
 *             reviewerNotes? } — only pending/needsReview rows qualify;
 *     a competing moderator's decision surfaces as an error message.
 *   isModerator (query, reactive)
 *     args: {} → boolean for the CALLER only (no userId arg by design —
 *     see convex/moderation.ts).
 *
 * Components never import from convex/_generated directly — only this
 * file and adapter.ts do (ADR 0004 feature-boundary rule).
 */

import { api } from "../../../convex/_generated/api";

export const moderationQueueRef = api.submissions.moderationQueue;
export const reviewSubmissionRef = api.submissions.reviewSubmission;
export const isModeratorRef = api.moderation.isModerator;
