import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Error banner shared by the auth forms. Rendered inside role="alert" via
 * the Alert primitive so screen readers announce it when it appears.
 */
export function AuthFormError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" data-testid="auth-error">
      <CircleAlert />
      <AlertTitle>We couldn&apos;t do that</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
