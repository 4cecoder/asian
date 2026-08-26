import type { FunctionArgs } from "convex/server";

import { api } from "../../../convex/_generated/api";

/**
 * The rating values the *deployed* `srs.recordReview` mutation accepts,
 * derived from its args rather than hardcoded a second time. Widening the
 * mutation's rating union updates this type — and therefore every switch
 * on it — automatically.
 */
export type Rating = FunctionArgs<typeof api.srs.recordReview>["rating"];

export type Grade = {
  value: Rating;
  label: string;
  description: string;
  variant: "destructive" | "outline" | "default" | "secondary";
};

/**
 * Grades offered this session, in keyboard order (1–4): Again, Hard, Good,
 * Easy — matching the FSRS rating scale (1–4) in src/lib/srs/fsrs.ts.
 * Every entry here must be accepted by `recordReview`: listing a grade the
 * mutation rejects would error mid-session.
 */
export const GRADES: readonly Grade[] = [
  {
    value: "again",
    label: "Again",
    description: "Didn't know it — comes back soon",
    variant: "destructive",
  },
  {
    value: "hard",
    label: "Hard",
    description: "Recalled with effort",
    variant: "outline",
  },
  {
    value: "good",
    label: "Good",
    description: "Recalled correctly",
    variant: "default",
  },
  {
    value: "easy",
    label: "Easy",
    description: "Instant recall — long interval",
    variant: "secondary",
  },
];
