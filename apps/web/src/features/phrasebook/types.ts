/**
 * Phrasebook domain types.
 *
 * Field names deliberately mirror the `phrases` table in
 * `convex/schema.ts` (Track 10 scope) so that swapping the fixture-backed
 * data source in `data.ts` for real Convex queries is a mechanical change,
 * not a type-mapping exercise. See data.ts for the swap point.
 */

/** Priority languages per schema.ts and ADR 0004. th/vi exist in the schema but are not built out yet. */
export type PhrasebookLanguage = "ja" | "ko" | "zh";

export type Situation = {
  /** URL-safe identifier — doubles as the `[situation]` route param and the `phrases.situation` field value. */
  slug: string;
  title: string;
  description: string;
};

/** A situation plus aggregate info for browse cards (computed by the data source, not stored). */
export type SituationSummary = Situation & { phraseCount: number };

/**
 * One situational phrase in one language.
 *
 * `audioStorageId` is intentionally absent here: fixtures have no audio,
 * and when Convex lands the field flows through unchanged alongside
 * `translation`/`romanization`.
 */
export type Phrase = {
  /** Stable unique id. Fixture ids use the `{slug}-{lang}-{nn}` convention so they read well in URLs/tests. */
  id: string;
  language: PhrasebookLanguage;
  situation: string;
  english: string;
  /** Native-script translation of `english`. */
  translation: string;
  romanization?: string;
};

/** Human-readable name for the romanization scheme of each supported language. */
export const ROMANIZATION_SCHEME: Record<PhrasebookLanguage, string> = {
  ja: "Rōmaji",
  ko: "Revised Romanization",
  zh: "Pinyin",
};
