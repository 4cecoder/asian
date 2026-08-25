import { cookies } from "next/headers";

import { OnboardingStepShell } from "@/components/layout/OnboardingStepShell";

import { LanguagePicker } from "@/features/onboarding/LanguagePicker";
import { LANGUAGE_COOKIE, parseOnboardingLanguage } from "@/features/onboarding/preferences";

export const metadata = { title: "Choose your language — Asian" };

/** Step 1 — persist the target-language choice, then advance to the goal. */
export default async function OnboardingLanguagePage() {
  const cookieStore = await cookies();
  const selected = parseOnboardingLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);

  return (
    <OnboardingStepShell
      step={1}
      totalSteps={4}
      title="Which language are you learning?"
      description="Japanese, Korean, and Mandarin launch first; Thai and Vietnamese follow."
    >
      <LanguagePicker selected={selected} />
    </OnboardingStepShell>
  );
}
