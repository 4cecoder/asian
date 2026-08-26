"use client";

import { useQuery } from "convex/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { myProfileRef } from "./api";
import { DisplayNameEditor } from "./DisplayNameEditor";
import { ProfilePreferences } from "./ProfilePreferences";
import { ProfileStats } from "./ProfileStats";

/**
 * Reactive profile view for the signed-in caller. The route is proxy-gated
 * (src/proxy.ts), so an unauthenticated query error is not an expected
 * state here — only the loading path is handled explicitly.
 */
export function ProfileView() {
  const me = useQuery(myProfileRef, {});

  if (me === undefined) {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        Loading your profile…
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in with this email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="text-sm">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{me.email}</dd>
          </dl>
          <DisplayNameEditor initial={me.displayName} />
        </CardContent>
      </Card>

      <ProfilePreferences language={me.language} goal={me.goal} />

      <ProfileStats deckCount={me.deckCount} />
    </div>
  );
}
