import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * First real cut of Track 8 (docs/knowledge/tracks/track-08-convex-db.md
 * was a scope-only stub — the source spec never detailed it). Priority
 * languages per current product direction: ja, ko, zh (native-English-
 * speaker audience). th/vi kept as valid values since the original spec's
 * scope covers all five, but nothing here should assume they're equally
 * built out yet.
 *
 * `...authTables` comes from @convex-dev/auth — user/session/account
 * tables are managed by that library, not redefined here.
 */

const language = v.union(
  v.literal("ja"),
  v.literal("ko"),
  v.literal("zh"),
  v.literal("th"),
  v.literal("vi"),
);

export default defineSchema({
  ...authTables,

  // A collection of cards — hand-authored, imported from Anki, or
  // reimplemented-scraper-sourced (see ADR 0003 and the community content
  // ingestion issues for provenance/ToS constraints per source).
  decks: defineTable({
    title: v.string(),
    language,
    ownerId: v.id("users"),
    source: v.union(
      v.literal("community"),
      v.literal("anki_import"),
      v.literal("quizlet_reimport"),
      v.literal("curated"),
    ),
    sourceUrl: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("private")),
    cardCount: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_language_visibility", ["language", "visibility"]),

  cards: defineTable({
    deckId: v.id("decks"),
    front: v.string(),
    back: v.string(),
    notes: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    language,
  }).index("by_deck", ["deckId"]),

  // Per-user SRS review state for a card. Scheduling algorithm itself
  // (FSRS v4.5 per Track 7) is not implemented yet — this is just the
  // storage shape so the rest of the schema has somewhere to point.
  srsCardState: defineTable({
    userId: v.id("users"),
    cardId: v.id("cards"),
    state: v.union(
      v.literal("new"),
      v.literal("learning"),
      v.literal("review"),
      v.literal("relearning"),
    ),
    stability: v.number(),
    difficulty: v.number(),
    dueAt: v.number(),
    lastReviewedAt: v.optional(v.number()),
  })
    .index("by_user_card", ["userId", "cardId"])
    .index("by_user_due", ["userId", "dueAt"]),

  // Queue for community-submitted content (Anki file upload, a Quizlet-set
  // link to reimport, a manually authored deck) awaiting processing/review
  // before it becomes a public deck. See the "community content ingestion"
  // feature issues for the actual processing pipeline design.
  submissions: defineTable({
    submitterId: v.id("users"),
    kind: v.union(
      v.literal("anki_import"),
      v.literal("quizlet_reimport"),
      v.literal("manual_deck"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    sourceFileStorageId: v.optional(v.id("_storage")),
    sourceUrl: v.optional(v.string()),
    resultDeckId: v.optional(v.id("decks")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_submitter", ["submitterId"])
    .index("by_status", ["status"]),

  // Track 10 (phrasebook) scope — situational travel phrases.
  phrases: defineTable({
    language,
    situation: v.string(),
    english: v.string(),
    translation: v.string(),
    romanization: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
  }).index("by_language_situation", ["language", "situation"]),

  // Dictionary / interlinear data ingested from professional sources
  // (e.g. the Refold Mandarin resources research) rather than
  // community-submitted decks. `sourceName` records provenance —
  // never blend licensed dictionary content with unattributed scrapes.
  dictionaryEntries: defineTable({
    language,
    headword: v.string(),
    reading: v.optional(v.string()),
    partOfSpeech: v.optional(v.string()),
    definitions: v.array(v.string()),
    frequencyRank: v.optional(v.number()),
    sourceName: v.string(),
  })
    .index("by_language_headword", ["language", "headword"])
    .index("by_language_frequency", ["language", "frequencyRank"]),
});
