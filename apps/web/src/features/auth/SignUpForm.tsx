"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { Loader2 } from "lucide-react";

import { AuthFormError } from "@/features/auth/AuthFormError";
import { friendlyAuthError } from "@/features/auth/friendlyAuthError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PASSWORD_MIN_LENGTH = 8;

/**
 * Email + password sign-up against Convex Auth's Password provider.
 * New users land in onboarding (/onboarding/language), not /home — the
 * whole point of onboarding is picking a target language before any
 * product surface makes assumptions about one.
 *
 * The Password provider's default profile stores only `email`; we don't
 * ask for a name because the provider would drop it (adding a `profile`
 * callback in convex/auth.ts is the way to change that).
 */
export function SignUpForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [awaitingHandshake, setAwaitingHandshake] = useState(false);

  useEffect(() => {
    if (awaitingHandshake && isAuthenticated) {
      router.replace("/onboarding/language");
      // Refresh so server components (and the proxy gate) see the new
      // auth state instead of a stale RSC payload.
      router.refresh();
    }
  }, [awaitingHandshake, isAuthenticated, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    startSubmit(async () => {
      try {
        await signIn("password", {
          flow: "signUp",
          email,
          password,
        });
        setAwaitingHandshake(true);
      } catch (cause) {
        setError(friendlyAuthError(cause));
      }
    });
  }

  const busy = isSubmitting || awaitingHandshake;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form onSubmit={handleSubmit} data-testid="sign-up-form" className="flex flex-col gap-4">
      {error !== null && <AuthFormError message={error} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-up-email">Email</Label>
        <Input
          id="sign-up-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          data-testid="sign-up-email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-up-password">Password</Label>
        <Input
          id="sign-up-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="sign-up-password-hint"
          data-testid="sign-up-password"
        />
        <p id="sign-up-password-hint" className="text-muted-foreground text-xs">
          At least {PASSWORD_MIN_LENGTH} characters.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-up-confirm-password">Confirm password</Label>
        <Input
          id="sign-up-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={mismatch || undefined}
          aria-describedby={mismatch ? "sign-up-confirm-password-error" : undefined}
          data-testid="sign-up-confirm-password"
        />
        {mismatch && (
          <p
            id="sign-up-confirm-password-error"
            role="alert"
            className="text-destructive text-xs"
            data-testid="sign-up-confirm-error"
          >
            Passwords don&apos;t match yet.
          </p>
        )}
      </div>

      <Button type="submit" disabled={busy} data-testid="sign-up-submit">
        {busy ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
