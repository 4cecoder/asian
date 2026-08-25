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

/**
 * Email + password sign-in against Convex Auth's Password provider.
 *
 * Redirect timing: `signIn()` resolving is not the same as being signed in
 * — the client still has to finish the token handshake with the server
 * (which is also what sets the cookie `proxy.ts` gates on). So we flip to
 * "waiting for handshake" and only navigate once `useConvexAuth()` reports
 * `isAuthenticated`, otherwise the middleware bounce beats the cookie.
 */
export function SignInForm() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [awaitingHandshake, setAwaitingHandshake] = useState(false);

  useEffect(() => {
    if (awaitingHandshake && isAuthenticated) {
      router.replace("/home");
      // Refresh so server components (and the proxy gate) see the new
      // auth state instead of a stale RSC payload.
      router.refresh();
    }
  }, [awaitingHandshake, isAuthenticated, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startSubmit(async () => {
      try {
        await signIn("password", {
          flow: "signIn",
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

  return (
    <form onSubmit={handleSubmit} data-testid="sign-in-form" className="flex flex-col gap-4">
      {error !== null && <AuthFormError message={error} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-in-email">Email</Label>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          data-testid="sign-in-email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-in-password">Password</Label>
        <Input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          data-testid="sign-in-password"
        />
      </div>

      <Button type="submit" disabled={busy} data-testid="sign-in-submit">
        {busy ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" /> Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
