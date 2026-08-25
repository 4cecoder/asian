/**
 * Shell for the onboarding steps. Each step page composes
 * OnboardingStepShell with its own step number — the layout only provides
 * the centered container, so step metadata stays next to the step.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-xl">{children}</div>;
}
