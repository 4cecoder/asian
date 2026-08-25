/**
 * Typed references to the Convex `submissions` functions this feature
 * uses. The backend module has landed (convex/submissions.ts), so these
 * come straight from the generated API — args and results typecheck
 * against the real validators end to end.
 *
 * Contract as consumed by the UI:
 *   submitContent (mutation)
 *     args: { kind, language, payload, sourceUrl? } → Id<"submissions">
 *     Rate-limited to 10 submissions / 24h server-side; errors surface
 *     through the adapter's `error` state.
 *   mySubmissions (query, reactive)
 *     args: { limit? } → caller's own rows, newest first.
 *     NOTE: the backend query does NOT take a status filter — status
 *     filtering happens client-side in ./adapter.ts. If the query gains
 *     a server-side filter arg later, move filtering there and drop it
 *     from the adapter.
 *
 * Components never import from convex/_generated directly — only this
 * file and adapter.ts do (ADR 0004 feature-boundary rule).
 */

import { api } from "../../../convex/_generated/api";

export const submitContentRef = api.submissions.submitContent;
export const mySubmissionsRef = api.submissions.mySubmissions;
