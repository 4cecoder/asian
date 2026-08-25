"use client";

import { Button } from "@/components/ui/button";

import type { Grade } from "./ratings";
import { GRADES } from "./ratings";

type GradeButtonsProps = {
  disabled: boolean;
  onGrade: (rating: Grade["value"]) => void;
};

/** Again/Hard/Good/Easy grade buttons — only grades the deployed
 * `srs.recordReview` accepts are rendered (see ratings.ts). */
export function GradeButtons({ disabled, onGrade }: GradeButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {GRADES.map((grade, index) => (
        <Button
          key={grade.value}
          variant={grade.variant}
          size="lg"
          disabled={disabled}
          aria-keyshortcuts={String(index + 1)}
          title={`${grade.description} (${index + 1})`}
          onClick={() => onGrade(grade.value)}
        >
          <span className="text-muted-foreground" aria-hidden="true">
            {index + 1}
          </span>
          {grade.label}
        </Button>
      ))}
    </div>
  );
}
