"use client";

import { cn } from "@/lib/utils";

import { KIND_LABELS, SUBMISSION_KINDS, type ComposableKind } from "./types";

/**
 * Submission-kind selector for the composer. Same native-radio pattern
 * as LanguagePicker: real inputs, sr-only styling, free keyboard support.
 */
export function SubmissionTypePicker({
  value,
  onChange,
  name = "submission-kind",
}: {
  value: ComposableKind;
  onChange: (kind: ComposableKind) => void;
  name?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">What are you contributing?</legend>
      <div
        role="radiogroup"
        aria-label="Submission type"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {SUBMISSION_KINDS.map((kind) => {
          const checked = value === kind;
          return (
            <label
              key={kind}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors",
                checked
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={kind}
                checked={checked}
                onChange={() => onChange(kind)}
                className="sr-only"
              />
              {KIND_LABELS[kind]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
