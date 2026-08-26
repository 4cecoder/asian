import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { submissionLanguage } from "./submissionTypes";

/**
 * Track 10 phrasebook queries — the Convex side of the swap point defined
 * in src/features/phrasebook/data.ts. Field names mirror that module's
 * `Phrase`/`SituationSummary` types one-to-one; the only mapping is
 * `phrases.slug` → `Phrase.id` (Convex `_id`s are opaque, URLs need slugs).
 *
 * Situations are not their own table yet — they are metadata below plus
 * the string value stored on each phrase row (the data.ts swap note
 * anticipated exactly this). Promote to a table when community situation
 * packs need titles/descriptions of their own.
 */

/** Canonical situation metadata. Slugs double as route params and the `phrases.situation` value. */
const SITUATIONS: ReadonlyArray<{
  slug: string;
  title: string;
  description: string;
}> = [
  {
    slug: "restaurant",
    title: "Restaurant & Café",
    description: "Ordering food, asking for the check, dietary needs.",
  },
  {
    slug: "transit",
    title: "Transit & Directions",
    description: "Trains and subways, tickets, finding your way.",
  },
  {
    slug: "shopping",
    title: "Shopping",
    description: "Prices, sizes, paying, haggling politely.",
  },
  {
    slug: "lodging",
    title: "Lodging",
    description: "Check-in, reservations, room problems.",
  },
  {
    slug: "emergencies",
    title: "Emergencies",
    description: "Getting help, lost items, medical needs.",
  },
  {
    slug: "smalltalk",
    title: "Small Talk",
    description: "Introductions, polite openers, breaking the ice.",
  },
];

/**
 * Display order within a situation. Matches the fixture source's ordering
 * so the swap does not change what users see. th/vi are valid schema
 * values but not built out; they are excluded here on purpose.
 */
const LANGUAGE_ORDER = ["ja", "ko", "zh"] as const;

type PhraseRow = {
  slug: string;
  language: string;
  situation: string;
  english: string;
  translation: string;
  romanization?: string;
};

/** Map a DB row onto the UI-facing shape (`slug` → `id`, no internal fields). */
function toPhrase(row: PhraseRow) {
  return {
    id: row.slug,
    language: row.language as (typeof LANGUAGE_ORDER)[number],
    situation: row.situation,
    english: row.english,
    translation: row.translation,
    ...(row.romanization !== undefined ? { romanization: row.romanization } : {}),
  };
}

function bySlugThenId(a: PhraseRow, b: PhraseRow): number {
  return a.slug.localeCompare(b.slug);
}

/** Phrases in one situation-language pair, via the covering index. */
async function listForLanguage(
  ctx: QueryCtx,
  situation: string,
  lang: (typeof LANGUAGE_ORDER)[number],
): Promise<PhraseRow[]> {
  return await ctx.db
    .query("phrases")
    .withIndex("by_language_situation", (q) => q.eq("language", lang).eq("situation", situation))
    .collect();
}

export const listSituations = query({
  args: {},
  handler: async (ctx) => {
    // Counted per (situation, language) over the index rather than one
    // full-table scan — this table grows with every published phrase pack.
    const results = [];
    for (const situation of SITUATIONS) {
      let phraseCount = 0;
      for (const lang of LANGUAGE_ORDER) {
        phraseCount += (await listForLanguage(ctx, situation.slug, lang)).length;
      }
      results.push({ ...situation, phraseCount });
    }

    // Same ordering contract as the fixture source: most phrases first,
    // ties broken alphabetically.
    return results.sort((a, b) => b.phraseCount - a.phraseCount || a.title.localeCompare(b.title));
  },
});

export const getSituation = query({
  args: { slug: v.string() },
  handler: async (_ctx, args) => {
    return SITUATIONS.find((situation) => situation.slug === args.slug) ?? null;
  },
});

export const listPhrases = query({
  args: {
    situation: v.string(),
    language: v.optional(submissionLanguage), // same ja/ko/zh union the submissions pipeline validates
  },
  handler: async (ctx, args) => {
    if (args.language !== undefined) {
      const rows = await listForLanguage(ctx, args.situation, args.language);
      return rows.sort(bySlugThenId).map(toPhrase);
    }

    const rows: PhraseRow[] = [];
    for (const lang of LANGUAGE_ORDER) {
      rows.push(...(await listForLanguage(ctx, args.situation, lang)));
    }
    // Rows already arrive grouped ja→ko→zh from the loop order; sort each
    // group by slug so ordering matches the fixture source exactly.
    return rows.sort(bySlugThenId).map(toPhrase);
  },
});

export const getPhrase = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("phrases")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (row === null) return null;
    return toPhrase(row);
  },
});
