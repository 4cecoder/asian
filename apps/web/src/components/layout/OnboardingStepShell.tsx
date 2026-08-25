import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type OnboardingStepShellProps = {
  /** 1-based index of the current step. */
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  children: React.ReactNode;
};

/**
 * Shell for one screen of a multistep onboarding flow. One decision per
 * screen (ADR 0004): the shell shows progress plus the single question,
 * and `children` holds that question's controls.
 */
export function OnboardingStepShell({
  step,
  totalSteps,
  title,
  description,
  children,
}: OnboardingStepShellProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Step {step} of {totalSteps}: {title}
        </CardTitle>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
        <Progress value={(step / totalSteps) * 100} aria-label={`Onboarding progress`} />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
