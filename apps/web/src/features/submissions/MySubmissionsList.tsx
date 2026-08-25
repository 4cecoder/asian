"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useMySubmissions, type StatusFilter } from "./adapter";
import { SubmissionListItem } from "./SubmissionListItem";
import { SUBMISSION_STATUSES } from "./types";

const FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...SUBMISSION_STATUSES.map((s) => ({
    value: s as StatusFilter,
    label: s === "needsReview" ? "Needs review" : s[0].toUpperCase() + s.slice(1),
  })),
];

/**
 * "My contributions" tracker with a status filter. Data comes from the
 * reactive Convex query via the adapter — no local cache.
 */
export function MySubmissionsList() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const { submissions, isLoading } = useMySubmissions(filter);

  return (
    <section aria-labelledby="my-contributions-heading" className="grid gap-4">
      <h2 id="my-contributions-heading" className="text-lg font-semibold">
        My contributions
      </h2>

      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <Button
              key={f.value}
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading your contributions…</p>
      ) : submissions !== null && submissions.length > 0 ? (
        <ul className={cn("grid gap-3")}>
          {submissions.map((submission) => (
            <SubmissionListItem key={submission._id} submission={submission} />
          ))}
        </ul>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nothing here yet</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {filter === "all"
              ? "Submit your first contribution above — phrases, deck cards, corrections, and examples are all welcome."
              : "No contributions with this status."}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
