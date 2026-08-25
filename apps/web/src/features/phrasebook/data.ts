import { FIXTURE_PHRASES, FIXTURE_SITUATIONS } from "./fixtures";
import type { Phrase, PhrasebookLanguage, Situation, SituationSummary } from "./types";

/**
 * ── THE SWAP POINT ─────────────────────────────────────────────────────
 *
 * Everything the phrasebook UI renders flows through this interface — no
 * page or component imports `fixtures.ts` directly. Today it is backed by
 * local fixtures because the Track 10 Convex side does not exist yet (the
 * `phrases` table is defined in `convex/schema.ts`, but no queries and no
 * seed data ship in this wave).
 *
 * When the Convex functions land, swap implementations WITHOUT touching
 * any caller:
 *
 *   1. Add query functions to a new `convex/phrases.ts` matching these
 *      four operations (`listSituations` can be an aggregate over the
 *      existing `by_language_situation` index, or its own table later).
 *   2. Replace the body of each method below. From Server Components use
 *      `await fetchQuery(api.phrases.listPhrases, {...})`; if a client
 *      component ever needs live reactivity, export a `useQuery`-based
 *      hook alongside this object rather than re-plumbing pages.
 *   3. Delete the fixture import. Field names already match the schema
 *      one-to-one (`language`/`situation`/`english`/`translation`/
 *      `romanization`), so no type mapping is needed.
 *
 * Methods are async so callers never know (or care) which backend runs.
 */

export interface PhrasebookDataSource {
  /** All situations with phrase counts, for browse cards. */
  listSituations(): Promise<SituationSummary[]>;
  /** One situation by slug, or null when unknown → pages call `notFound()`. */
  getSituation(slug: string): Promise<Situation | null>;
  /** Phrases in one situation, optionally narrowed to a language. */
  listPhrases(situationSlug: string, language?: PhrasebookLanguage): Promise<Phrase[]>;
  /** One phrase by id, or null when unknown → detail page calls `notFound()`. */
  getPhrase(id: string): Promise<Phrase | null>;
}

function createFixtureSource(): PhrasebookDataSource {
  return {
    async listSituations() {
      return FIXTURE_SITUATIONS.map((situation) => ({
        ...situation,
        phraseCount: FIXTURE_PHRASES.filter((phrase) => phrase.situation === situation.slug).length,
      })).sort((a, b) => b.phraseCount - a.phraseCount || a.title.localeCompare(b.title));
    },

    async getSituation(slug: string) {
      return FIXTURE_SITUATIONS.find((situation) => situation.slug === slug) ?? null;
    },

    async listPhrases(situationSlug: string, language?: PhrasebookLanguage) {
      const matches = FIXTURE_PHRASES.filter(
        (phrase) =>
          phrase.situation === situationSlug &&
          (language === undefined || phrase.language === language),
      );
      const order = ["ja", "ko", "zh"];
      return [...matches].sort(
        (a, b) => order.indexOf(a.language) - order.indexOf(b.language) || a.id.localeCompare(b.id),
      );
    },

    async getPhrase(id: string) {
      return FIXTURE_PHRASES.find((phrase) => phrase.id === id) ?? null;
    },
  };
}

/** The single instance every phrasebook page/component consumes. */
export const phrasebookData = createFixtureSource();
