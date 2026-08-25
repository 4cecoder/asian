"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  COMPLETED_COOKIE,
  GOAL_COOKIE,
  LANGUAGE_COOKIE,
  parseOnboardingGoal,
  parseOnboardingLanguage,
} from "./preferences";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year — these are account-level prefs.

/**
 * Onboarding persistence via Server Actions + cookies.
 *
 * GAP, deliberately: the right home for language/goal is fields on the
 * `users` table behind Convex mutations (ADR 0004: Convex-backed data uses
 * Convex hooks). No users/profile module exists in `convex/` yet and this
 * agent doesn't own that directory, so per ADR 0004's state table these
 * prefs land in cookies ("cookie-based prefs" is an approved Server Action
 * job) until `convex/users.ts` grows a profile mutation. Swapping later
 * means replacing only this file — components never touch cookies directly.
 */

async function setPrefCookie(name: string, value: string) {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function saveLanguageAction(formData: FormData): Promise<void> {
  const language = parseOnboardingLanguage(formData.get("language"));
  if (!language) {
    throw new Error("Invalid language choice submitted to onboarding.");
  }
  await setPrefCookie(LANGUAGE_COOKIE, language);
  redirect("/onboarding/goal");
}

export async function saveGoalAction(formData: FormData): Promise<void> {
  const goal = parseOnboardingGoal(formData.get("goal"));
  if (!goal) {
    throw new Error("Invalid goal choice submitted to onboarding.");
  }
  await setPrefCookie(GOAL_COOKIE, goal);
  redirect("/onboarding/placement");
}

/** Final step — mark onboarding done and hand off into the (app) group. */
export async function completeOnboardingAction(): Promise<void> {
  await setPrefCookie(COMPLETED_COOKIE, "1");
  redirect("/home");
}
