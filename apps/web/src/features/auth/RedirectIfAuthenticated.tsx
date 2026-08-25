import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

/**
 * Server-side counterpart to proxy.ts's gating: the middleware keeps
 * signed-out users out of protected routes, this keeps signed-in users
 * out of the auth pages they no longer need. The auth-state check lives
 * here rather than in page.tsx or layout.tsx — @convex-dev/auth warns
 * that layout-level checks don't stop nested pages from rendering, and
 * pages compose instead of implementing.
 */
export async function RedirectIfAuthenticated({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  let authenticated = false;
  try {
    authenticated = await isAuthenticatedNextjs();
  } catch {
    // An unreachable Convex deployment shouldn't brick the auth pages —
    // treat as signed out and let the form surface its own error.
  }
  // Outside the try/catch on purpose: redirect() signals via throw, and
  // the catch above must never swallow it.
  if (authenticated) {
    redirect(to);
  }
  return <>{children}</>;
}
