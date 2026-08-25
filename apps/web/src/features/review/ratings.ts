import type { FunctionArgs } from "convex/server";

import { api } from "../../../convex/_generated/api";

/**
 * The rating values the *deployed* `srs.recordReview` mutation accepts,
 * derived from its args rather than hardcoded a second time. Today that is
 * only "again" | "good" (placeholder scheduler in convex/srs.ts); when
 * Track 7's FSRS engine widens the union, this type — and therefore every
 * switch on it — updates automatically.
 */
export type Rating = FunctionArgs<typeof api.srs.recordReview>["rating"];

export type Grade = {
  value: Rating;
  label: string;
  description: string;
  variant: "destructive" | "outline" | "default" | "secondary";
};

/**
 * Grades offered this session, in keyboard order (1–4). The backend
 * scheduler is a placeholder (see convex/srs.ts) and only accepts
 * "again"/"good", so hard/easy are commented out — uncomment each line as
 * `recordReview`'s rating union starts accepting it. Do not list a grade
 * here before the mutation accepts it: grading would error mid-session.
 */
export const GRADES: readonly Grade[] = [
  {
    value: "again",
    label: "Again",
    description: "Didn't know it — comes back soon",
    variant: "destructive",
  },
  // {
  //   value: "hard",
  //   label: "Hard",
  //   description: "Recalled with effort",
  //   variant: "outline",
  // },
  {
    value: "good",
    label: "Good",
    description: "Recalled correctly",
    variant: "default",
  },
  // {
  //   value: "easy",
  //   label: "Easy",
  //   description: "Instant recall — long interval",
  //   variant: "secondary",
  // },
];
