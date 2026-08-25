"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";

import type { Grade, Rating } from "./ratings";
import { GRADES } from "./ratings";
import type { ReviewItem } from "./useCardCatalog";

function initialCounts(): Record<Rating, number> {
  return Object.fromEntries(GRADES.map((grade: Grade) => [grade.value, 0])) as Record<
    Rating,
    number
  >;
}

/**
 * Client-side session state for one review run (ADR 0004: pure UI state
 * stays local; only the grading write goes through Convex). A graded card
 * leaves the queue for the rest of the session — necessary because an
 * "again" grade keeps the card due, so reactivity alone would serve it
 * back forever.
 */
export function useReviewSession(queue: readonly ReviewItem[]) {
  const recordReview = useMutation(api.srs.recordReview);

  const [gradedIds, setGradedIds] = useState<ReadonlySet<string>>(new Set());
  const [counts, setCounts] = useState<Record<Rating, number>>(initialCounts);
  const [revealed, setRevealed] = useState(false);
  const [pendingGrade, setPendingGrade] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = useMemo(
    () => queue.filter((item) => !gradedIds.has(item.cardId)),
    [queue, gradedIds],
  );
  const current = remaining[0] ?? null;

  const reveal = useCallback(() => {
    setError(null);
    if (current) setRevealed(true);
  }, [current]);

  const dismissError = useCallback(() => setError(null), []);

  const grade = useCallback(
    async (rating: Rating) => {
      if (!current || pendingGrade) return;
      if (!revealed) return; // can't grade a card whose answer isn't showing
      setPendingGrade(true);
      setError(null);
      try {
        await recordReview({ cardId: current.cardId, rating });
        setGradedIds((prev) => new Set(prev).add(current.cardId));
        setCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
        setRevealed(false);
      } catch (err) {
        // Mid-session failure: keep the card up so the user can retry.
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Recording the review failed — try again.",
        );
      } finally {
        setPendingGrade(false);
      }
    },
    [current, pendingGrade, revealed, recordReview],
  );

  return {
    current,
    remainingCount: remaining.length,
    totalCount: queue.length,
    revealed,
    reveal,
    grade,
    pendingGrade,
    error,
    dismissError,
    counts,
    totalGraded: gradedIds.size,
  };
}

export type ReviewSession = ReturnType<typeof useReviewSession>;
