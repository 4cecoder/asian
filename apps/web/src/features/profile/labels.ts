/**
 * Display labels for stored profile values. Deliberately derived from the
 * onboarding pickers' option data (features/onboarding/preferences.ts) so
 * the two surfaces can never disagree about what "ja" or "media" is called
 * — per the swap design, option data is shared, not the picker routes.
 *
 * Stored values may fall outside those lists (the schema-wide language
 * union also allows th/vi), so unknown values pass through raw rather
 * than lying with a guessed label.
 */

// Relative, not "@/": this module is imported by unit tests, and vitest
// here resolves plain Node paths only (no tsconfig-alias config).
import { GOAL_OPTIONS, LANGUAGE_OPTIONS } from "../onboarding/preferences";

/** English display label for a stored language value ("ja" → "Japanese"). */
export function languageLabel(language: string): string {
  return LANGUAGE_OPTIONS.find((option) => option.value === language)?.englishLabel ?? language;
}

/** Display label for a stored goal value ("travel" → "Travel"). */
export function goalLabel(goal: string): string {
  return GOAL_OPTIONS.find((option) => option.value === goal)?.label ?? goal;
}
