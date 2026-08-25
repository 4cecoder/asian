import { Button } from "@/components/ui/button";

import { saveGoalAction } from "./actions";
import { GOAL_OPTIONS, type OnboardingGoal } from "./preferences";

type GoalPickerProps = {
  /** Previously saved choice, shown as the pre-selected radio (or none). */
  selected?: OnboardingGoal | null;
};

/**
 * Step 2 — one decision per screen (ADR 0004): single-select goal. Same
 * no-client-JS radio pattern as LanguagePicker.
 */
export function GoalPicker({ selected }: GoalPickerProps) {
  return (
    <form action={saveGoalAction}>
      <fieldset className="grid gap-3">
        <legend className="sr-only">Learning goal</legend>
        {GOAL_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="has-checked:border-ring has-checked:ring-ring/30 hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-checked:ring-3"
          >
            <input
              type="radio"
              name="goal"
              value={option.value}
              defaultChecked={selected === option.value}
              required
              className="mt-1"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{option.label}</span>
              <span className="text-muted-foreground text-sm">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="mt-6 flex justify-end">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
