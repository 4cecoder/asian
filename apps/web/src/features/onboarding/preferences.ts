/**
 * Onboarding step 1/2 domain data: target language and learning goal.
 *
 * Language values are a subset of the `language` union in
 * `convex/schema.ts` — ja/ko/zh only, per ADR 0004's route map ("th/vi
 * lower priority"). When onboarding persistence moves from cookies to the
 * users table (see actions.ts), these literals must remain valid schema
 * values.
 */

export const ONBOARDING_LANGUAGES = ["ja", "ko", "zh"] as const;

export type OnboardingLanguage = (typeof ONBOARDING_LANGUAGES)[number];

export type LanguageOption = {
  value: OnboardingLanguage;
  /** Native-script name shown first on the picker card. */
  nativeLabel: string;
  englishLabel: string;
};

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { value: "ko", nativeLabel: "한국어", englishLabel: "Korean" },
  { value: "ja", nativeLabel: "日本語", englishLabel: "Japanese" },
  { value: "zh", nativeLabel: "中文", englishLabel: "Chinese" },
];

export const ONBOARDING_GOALS = ["travel", "work", "family", "media"] as const;

export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number];

export type GoalOption = {
  value: OnboardingGoal;
  label: string;
  description: string;
};

export const GOAL_OPTIONS: readonly GoalOption[] = [
  {
    value: "travel",
    label: "Travel",
    description: "An upcoming trip — survival phrases first.",
  },
  {
    value: "work",
    label: "Work",
    description: "Meetings, email, and workplace small talk.",
  },
  {
    value: "family",
    label: "Family & friends",
    description: "Everyday conversation with people you care about.",
  },
  {
    value: "media",
    label: "Media & hobbies",
    description: "Shows, music, games — comprehension-first.",
  },
];

/**
 * Cookie names for onboarding persistence. Server Actions writing cookies
 * is ADR 0004's sanctioned stopgap for prefs that have no Convex home yet
 * — see actions.ts for why this is a gap, not a destination.
 */
export const LANGUAGE_COOKIE = "onboarding.language";
export const GOAL_COOKIE = "onboarding.goal";
export const COMPLETED_COOKIE = "onboarding.completed";

/** Parse an untrusted form/cookie string into a language, or null. */
export function parseOnboardingLanguage(value: unknown): OnboardingLanguage | null {
  return (ONBOARDING_LANGUAGES as readonly unknown[]).includes(value)
    ? (value as OnboardingLanguage)
    : null;
}

/** Parse an untrusted form/cookie string into a goal, or null. */
export function parseOnboardingGoal(value: unknown): OnboardingGoal | null {
  return (ONBOARDING_GOALS as readonly unknown[]).includes(value)
    ? (value as OnboardingGoal)
    : null;
}
