"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useIsModerator } from "./adapter";

/**
 * Private no-access screen for signed-in users without a moderation role.
 * Under 20 lines, used only here (ADR 0004 sub-component rule).
 */
function NoAccessCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderators only</CardTitle>
        <CardDescription role="status">
          You don&apos;t have access to the moderation queue. Ask an admin to grant you the
          moderator role if you need it.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Everything on this page is also enforced server-side — the queue and review actions reject
        non-moderators regardless of what renders here.
      </CardContent>
    </Card>
  );
}

/**
 * Access gate for the /moderation surface. Renders children only for
 * callers whose Convex-side `moderation.isModerator` check passes; shows
 * a neutral loading note while the check is in flight and a clear
 * no-access card otherwise. The server re-checks every role on each queue
 * read and review write, so this gate shapes UX — it does not carry the
 * security decision.
 */
export function ModerationBoard({ children }: { children: React.ReactNode }) {
  const { isModerator, isLoading } = useIsModerator();

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Checking access…</p>;
  }
  if (!isModerator) {
    return <NoAccessCard />;
  }
  return <>{children}</>;
}
