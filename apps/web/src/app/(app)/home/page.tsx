import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Home — Asian" };

/** Placeholder — real home lands this sprint (due reviews, streak, quick actions). */
export default function AppHomePage() {
  return (
    <div>
      <PageHeader
        title="Home"
        description="Due reviews today, your streak, and quick actions — coming in this sprint."
        actions={<Button render={<Link href="/review" />}>Start reviewing</Button>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Nothing here yet</CardTitle>
          <CardDescription>
            This placeholder is replaced by the real dashboard as Phase 4 pages land.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
