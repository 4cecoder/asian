"use client";

import { Button } from "@/components/ui/button";

import type { ReviewItem } from "./useCardCatalog";
import type { ReviewSession } from "./useReviewSession";
import { useReviewShortcuts } from "./useReviewShortcuts";
import { GRADES } from "./ratings";
import { GradeButtons } from "./GradeButtons";
import { ReviewCard } from "./ReviewCard";
import { ReviewProgress } from "./ReviewProgress";

const GRADE_COUNT = GRADES.length;

type ActiveReviewProps = {
  item: ReviewItem;
  completed: number;
  total: number;
  session: Pick<
    ReviewSession,
    "revealed" | "reveal" | "grade" | "pendingGrade" | "error" | "dismissError"
  >;
};

/** The in-session stage for one card: progress, face, controls, shortcuts. */
export function ActiveReview({ item, completed, total, session }: ActiveReviewProps) {
  const { revealed, reveal, grade, pendingGrade, error, dismissError } = session;

  useReviewShortcuts({
    enabled: true,
    revealed,
    onReveal: reveal,
    onGrade: (rating) => void grade(rating),
  });

  return (
    <div className="flex flex-col gap-4">
      <ReviewProgress completed={completed} total={total} />
      <ReviewCard item={item} revealed={revealed} />

      {error ? (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
        >
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={dismissError}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        {revealed ? (
          <GradeButtons disabled={pendingGrade} onGrade={(rating) => void grade(rating)} />
        ) : (
          <Button size="lg" onClick={reveal} aria-keyshortcuts="Space">
            Show answer
          </Button>
        )}
        <p className="text-muted-foreground text-xs">
          Space — show answer
          {revealed ? ` · 1–${GRADE_COUNT} — grade · ` : ""}
          grading schedules the next review
        </p>
      </div>
    </div>
  );
}
