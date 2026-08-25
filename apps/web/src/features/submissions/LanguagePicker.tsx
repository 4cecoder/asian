"use client";

import { cn } from "@/lib/utils";

import { LANGUAGE_LABELS, SUBMISSION_LANGUAGES, type SubmissionLanguage } from "./types";

/**
 * Segmented language picker built on native radio inputs — keyboard
 * navigation (arrows/space) comes for free and screen readers announce
 * the group. Visually hidden inputs keep the accessible names.
 */
export function LanguagePicker({
  value,
  onChange,
  name = "submission-language",
}: {
  value: SubmissionLanguage;
  onChange: (language: SubmissionLanguage) => void;
  name?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">Language</legend>
      <div role="radiogroup" aria-label="Submission language" className="flex gap-2">
        {SUBMISSION_LANGUAGES.map((lang) => {
          const checked = value === lang;
          return (
            <label
              key={lang}
              className={cn(
                "flex h-8 cursor-pointer items-center rounded-lg border px-3 text-sm font-medium transition-colors select-none",
                checked
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={lang}
                checked={checked}
                onChange={() => onChange(lang)}
                className="sr-only"
              />
              {LANGUAGE_LABELS[lang]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
