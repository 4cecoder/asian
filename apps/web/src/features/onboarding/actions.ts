"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { fetchMutation } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

import { api } from "../../../convex/_generated/api";
import {
  COMPLETED_COOKIE,
  GOAL_COOKIE,
  LANGUAGE_COOKIE,
  parseOnboardingGoal,
  parseOnboardingLanguage,
  type OnboardingGoal,
  type OnboardingLanguage,
} from "./preferences";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year — these are account-level prefs.

/**
 * Onboarding persistence: Convex first, httpOnly cookies as fallback.
 *
 * The gap this file used to document is closed: language/goal now land
 * in the `profiles` table via convex/profiles.ts (ADR 0004:
 * Convex-backed data uses Convex). The server-side call follows
 * @convex-dev/auth's own pattern for authenticated calls outside React —
 * fetchMutation + the session token from convexAuthNextjsToken().
 *
 * The cookie write stays as a progressive-enhancement fallback: the forms
 * here must keep working with no client JS, and a failed profile sync
 * must never block onboarding. This remains the only file that knows
 * about both stores — components still never touch cookies directly.
 */
async function syncProfileToConvex(patch: {
  language?: OnboardingLanguage;
  goal?: OnboardingGoal;
}): Promise<void> {
  const token = await convexAuthNextjsToken();
  if (!token) return; // No session — cookie-only flow.
  try {
    await fetchMutation(api.profiles.updateProfile, patch, { token });
  } catch (error) {
    // Deliberately swallowed: the cookie already holds the choice, so the
    // flow proceeds. The next successful save (or any /profile edit)
    // heals the profiles row.
    console.error("Syncing onboarding choice to the profiles table failed:", error);
  }
}

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
  await syncProfileToConvex({ language });
  redirect("/onboarding/goal");
}

export async function saveGoalAction(formData: FormData): Promise<void> {
  const goal = parseOnboardingGoal(formData.get("goal"));
  if (!goal) {
    throw new Error("Invalid goal choice submitted to onboarding.");
  }
  await setPrefCookie(GOAL_COOKIE, goal);
  await syncProfileToConvex({ goal });
  redirect("/onboarding/placement");
}

/** Final step — mark onboarding done and hand off into the (app) group. */
export async function completeOnboardingAction(): Promise<void> {
  await setPrefCookie(COMPLETED_COOKIE, "1");
  redirect("/home");
}
