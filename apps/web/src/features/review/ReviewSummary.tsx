"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Grade } from "./ratings";
import { GRADES } from "./ratings";
import type { ReviewSession } from "./useReviewSession";

type ReviewSummaryProps = {
  session: Pick<ReviewSession, "counts" | "totalGraded">;
};

/** Shown when the queue is drained: per-grade tally and ways onward. */
export function ReviewSummary({ session }: ReviewSummaryProps) {
  const { counts, totalGraded } = session;

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>Session complete</CardTitle>
        <CardDescription>
          {totalGraded === 1 ? "You reviewed 1 card." : `You reviewed ${totalGraded} cards.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1 text-sm">
          {GRADES.map((grade: Grade) => (
            <li key={grade.value} className="flex justify-between">
              <span>{grade.label}</span>
              <span className="text-muted-foreground tabular-nums">{counts[grade.value]}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="gap-2">
        <Button render={<Link href="/home" />}>Back to home</Button>
        <Button variant="outline" render={<Link href="/decks" />}>
          Browse decks
        </Button>
      </CardFooter>
    </Card>
  );
}
