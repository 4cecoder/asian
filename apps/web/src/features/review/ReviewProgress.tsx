"use client";

import { Progress } from "@/components/ui/progress";

type ReviewProgressProps = {
  completed: number;
  total: number;
};

/** Session progress bar plus a text count (the accessible source of truth). */
export function ReviewProgress({ completed, total }: ReviewProgressProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-xl">
      <Progress value={percent} aria-label="Session progress" />
      <p className="text-muted-foreground mt-1 text-right text-sm tabular-nums">
        {completed} / {total} reviewed
      </p>
    </div>
  );
}
