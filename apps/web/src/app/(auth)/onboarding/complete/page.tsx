import { cookies } from "next/headers";

import { OnboardingStepShell } from "@/components/layout/OnboardingStepShell";
import { Button } from "@/components/ui/button";

import { completeOnboardingAction } from "@/features/onboarding/actions";
import {
  GOAL_COOKIE,
  LANGUAGE_COOKIE,
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  parseOnboardingGoal,
  parseOnboardingLanguage,
} from "@/features/onboarding/preferences";

export const metadata = { title: "You're set — Asian" };

/** Step 4 — summary + the action that marks onboarding complete. */
export default async function OnboardingCompletePage() {
  const cookieStore = await cookies();
  const language = parseOnboardingLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
  const goal = parseOnboardingGoal(cookieStore.get(GOAL_COOKIE)?.value);

  const languageLabel = LANGUAGE_OPTIONS.find((o) => o.value === language);
  const goalLabel = GOAL_OPTIONS.find((o) => o.value === goal);

  return (
    <OnboardingStepShell
      step={4}
      totalSteps={4}
      title="You're all set"
      description={
        languageLabel && goalLabel
          ? `Learning ${languageLabel.englishLabel} — ${goalLabel.label.toLowerCase()}. Ready when you are.`
          : "Your preferences are saved. Next stop: your daily reviews."
      }
    >
      <form action={completeOnboardingAction} className="flex justify-end">
        <Button type="submit" data-testid="complete-onboarding">
          Go to your home
        </Button>
      </form>
    </OnboardingStepShell>
  );
}
