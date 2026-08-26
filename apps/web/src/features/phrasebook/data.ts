import { fetchQuery } from "convex/nextjs";

import { api } from "../../../convex/_generated/api";
import { FIXTURE_PHRASES, FIXTURE_SITUATIONS } from "./fixtures";
import type { Phrase, PhrasebookLanguage, Situation, SituationSummary } from "./types";

/**
 * ── THE SWAP POINT ─────────────────────────────────────────────────────
 *
 * Everything the phrasebook UI renders flows through this interface — no
 * page or component imports `fixtures.ts` directly.
 *
 * Backed by live Convex queries (`convex/phrases.ts`) as of Track 10.
 * Pages are Server Components, so each method is a one-shot
 * `fetchQuery`; if a client component ever needs live reactivity, export
 * a `useQuery`-based hook alongside this object rather than re-plumbing
 * pages.
 *
 * The fixture implementation is kept below as a fallback/test double —
 * see `createFixtureSource`. Field names match the schema's `phrases`
 * table one-to-one; the only mapping is `slug` → `id` (Convex document
 * ids are opaque, URLs use slugs).
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
  /** One phrase by slug id, or null when unknown → detail page calls `notFound()`. */
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

/**
 * Live Convex-backed source. Uses `convex/nextjs`'s fetchQuery, which
 * reads NEXT_PUBLIC_CONVEX_URL (set in .env.local by `bunx convex dev`).
 */
function createConvexSource(): PhrasebookDataSource {
  return {
    async listSituations() {
      return await fetchQuery(api.phrases.listSituations, {});
    },

    async getSituation(slug: string) {
      return await fetchQuery(api.phrases.getSituation, { slug });
    },

    async listPhrases(situationSlug: string, language?: PhrasebookLanguage) {
      return await fetchQuery(api.phrases.listPhrases, {
        situation: situationSlug,
        ...(language !== undefined ? { language } : {}),
      });
    },

    async getPhrase(id: string) {
      return await fetchQuery(api.phrases.getPhrase, { slug: id });
    },
  };
}

/** The single instance every phrasebook page/component consumes. */
export const phrasebookData = createConvexSource();

/**
 * Fixture-backed fallback for tests or local runs without a Convex
 * deployment. Not used by pages.
 */
export const fixturePhrasebookData = createFixtureSource();
