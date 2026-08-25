import type { Doc } from "../../../convex/_generated/dataModel";

/**
 * The big-3 product languages. th/vi are valid values in the Convex
 * schema but have no sourced dictionary data — the UI deliberately only
 * exposes ja/ko/zh (see convex/seed/README.md).
 */
export type DictionaryLanguage = "ja" | "ko" | "zh";

export const DICTIONARY_LANGUAGES: readonly DictionaryLanguage[] = ["ja", "ko", "zh"];

export const LANGUAGE_LABELS: Record<DictionaryLanguage, string> = {
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
};

/** Mirror of MAX_RESULTS in convex/dictionary.ts — read-only reference. */
export const MAX_QUERY_RESULTS = 25;

export type DictionaryEntry = Doc<"dictionaryEntries">;
