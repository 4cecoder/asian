/**
 * Language values mirror the union in `convex/schema.ts` exactly — ja/ko/zh
 * are the priority languages; th/vi are valid but not equally built out.
 */
export const LANGUAGES = ["ja", "ko", "zh", "th", "vi"] as const;

export type DeckLanguage = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<DeckLanguage, string> = {
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin",
  th: "Thai",
  vi: "Vietnamese",
};

export function isDeckLanguage(value: string): value is DeckLanguage {
  return (LANGUAGES as readonly string[]).includes(value);
}
