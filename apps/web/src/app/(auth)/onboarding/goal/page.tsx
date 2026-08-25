import { cookies } from "next/headers";
import Link from "next/link";

import { OnboardingStepShell } from "@/components/layout/OnboardingStepShell";

import { GoalPicker } from "@/features/onboarding/GoalPicker";
import { GOAL_COOKIE, parseOnboardingGoal } from "@/features/onboarding/preferences";

export const metadata = { title: "Set your goal — Asian" };

/** Step 2 — persist the single-select goal, then advance to placement. */
export default async function OnboardingGoalPage() {
  const cookieStore = await cookies();
  const selected = parseOnboardingGoal(cookieStore.get(GOAL_COOKIE)?.value);

  return (
    <OnboardingStepShell
      step={2}
      totalSteps={4}
      title="What brings you here?"
      description="A travel date and motivation shape what you review first."
    >
      <GoalPicker selected={selected} />
      <p className="text-muted-foreground mt-4 text-sm">
        Changed your mind?{" "}
        <Link href="/onboarding/language" className="font-medium underline underline-offset-4">
          Go back to language
        </Link>
      </p>
    </OnboardingStepShell>
  );
}
