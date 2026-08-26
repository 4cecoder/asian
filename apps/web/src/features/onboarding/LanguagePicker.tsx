import { Button } from "@/components/ui/button";

import { saveLanguageAction } from "./actions";
import { LANGUAGE_OPTIONS, type OnboardingLanguage } from "./preferences";

type LanguagePickerProps = {
  /** Previously saved choice, shown as the pre-selected radio (or none). */
  selected?: OnboardingLanguage | null;
};

/**
 * Step 1 — one decision per screen (ADR 0004): pick a target language.
 * Native radios inside a real form, so selection, keyboard use, and
 * required-validation all work without client JS; the card highlight is
 * pure CSS (`has-checked:`).
 */
export function LanguagePicker({ selected }: LanguagePickerProps) {
  return (
    <form action={saveLanguageAction}>
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="sr-only">Target language</legend>
        {LANGUAGE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="has-checked:border-ring has-checked:ring-ring/30 hover:bg-muted/50 flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors has-checked:ring-3"
          >
            <input
              type="radio"
              name="language"
              value={option.value}
              defaultChecked={selected === option.value}
              required
              className="sr-only"
            />
            {/* lang tags the native-script name so screen readers switch
                pronunciation (ko/ja/zh are valid BCP-47 codes). */}
            <span lang={option.value} className="font-heading text-xl font-semibold">
              {option.nativeLabel}
            </span>
            <span className="text-muted-foreground text-sm">{option.englishLabel}</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-6 flex justify-end">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
