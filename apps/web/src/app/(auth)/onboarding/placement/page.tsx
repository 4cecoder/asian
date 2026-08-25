import Link from "next/link";

import { OnboardingStepShell } from "@/components/layout/OnboardingStepShell";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Placement check — Asian" };

/**
 * Step 3 — functional pass-through. The real placement check (optional,
 * per ADR 0004's route map) lands later; for now both paths continue to
 * the complete step, which finishes onboarding.
 */
export default function OnboardingPlacementPage() {
  return (
    <OnboardingStepShell
      step={3}
      totalSteps={4}
      title="Optional: a quick placement check"
      description="Skip it and we'll start you from the beginning."
    >
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/onboarding/complete" data-testid="placement-skip">
          Skip for now
        </Link>
        <Button render={<Link href="/onboarding/complete" />}>Start the check</Button>
      </div>
    </OnboardingStepShell>
  );
}
