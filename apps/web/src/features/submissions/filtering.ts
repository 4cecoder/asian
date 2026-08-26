/**
 * Pure client-side status filtering for the submissions list. Split from
 * ./adapter.ts so the predicate is unit-testable without Convex's react
 * bindings — the adapter just calls into this.
 */

import type { SubmissionRecord, SubmissionStatus } from "./types";

/** "all" is a UI-only filter value; it maps to no status predicate. */
export type StatusFilter = SubmissionStatus | "all";

/**
 * Filter records by lifecycle status, preserving input order (the query
 * already returns newest-first). Client-side because the backend
 * `submissions.mySubmissions` query doesn't accept a filter arg.
 */
export function applyStatusFilter(
  records: readonly SubmissionRecord[],
  filter: StatusFilter,
): SubmissionRecord[] {
  return filter === "all" ? [...records] : records.filter((r) => r.status === filter);
}
