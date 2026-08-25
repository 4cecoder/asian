"use client";

/**
 * Thin adapter between the Convex `submissions` functions and this
 * feature's UI. Components consume only these hooks (and the plain data
 * types from ./types.ts) — they never import function references or
 * convex/react directly. See ./api.ts for the backend contract.
 */

import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";

import { mySubmissionsRef, submitContentRef } from "./api";
import type { SubmissionRecord, SubmissionStatus, SubmitSubmissionArgs } from "./types";

/** "all" is a UI-only filter value; it maps to no status predicate. */
export type StatusFilter = SubmissionStatus | "all";

/** Matches the backend's MAX_QUEUE_PAGE cap. */
const FETCH_LIMIT = 100;

/**
 * Reactive list of the signed-in user's submissions, newest first.
 * `submissions` is null while the query loads; empty array means
 * genuinely none. Status filtering is client-side because the backend
 * query doesn't accept a filter arg (see ./api.ts).
 */
export function useMySubmissions(filter: StatusFilter = "all"): {
  submissions: SubmissionRecord[] | null;
  isLoading: boolean;
} {
  const all = useQuery(mySubmissionsRef, { limit: FETCH_LIMIT });

  const submissions = useMemo(() => {
    if (!all) return null;
    return filter === "all" ? all : all.filter((s) => s.status === filter);
  }, [all, filter]);

  return {
    submissions,
    isLoading: all === undefined,
  };
}

export interface SubmitState {
  /** True while the mutation is in flight — drives button disabled state. */
  isSubmitting: boolean;
  /** Validation or transport error to show inline, if any. */
  error: string | null;
}

/**
 * Returns a submit callback plus transient state. The callback resolves
 * with the new submission id, or throws nothing — failures surface via
 * `error` (including the server's 10-per-day rate limit message).
 * The component resets its draft after a resolved id.
 */
export function useSubmitSubmission(): {
  state: SubmitState;
  submit: (args: SubmitSubmissionArgs) => Promise<string | null>;
  clearError: () => void;
} {
  const mutate = useMutation(submitContentRef);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (args: SubmitSubmissionArgs): Promise<string | null> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const id = await mutate(args);
        return id;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong submitting your contribution.",
        );
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [mutate],
  );

  const clearError = useCallback(() => setError(null), []);

  return { state: { isSubmitting, error }, submit, clearError };
}
