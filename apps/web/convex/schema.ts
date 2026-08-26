import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  packetEntry,
  submissionKind,
  submissionLanguage,
  submissionPayload,
} from "./submissionTypes";

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

  // Queue for community-submitted content awaiting AI refinement and/or
  // human review before it becomes public. Two producer paths share this
  // table: file-import flows (anki_import / quizlet_reimport / manual_deck,
  // the original deck-ingestion queue) and the newer granular community
  // contributions (phrase / card / correction / exampleSentence /
  // situationPack) that feed the AI-refinement pipeline and get published
  // as contentPackets. See convex/submissionTypes.ts for the per-kind
  // payload shapes — they are validated at the mutation boundary.
  submissions: defineTable({
    submitterId: v.id("users"),
    kind: v.union(
      v.literal("anki_import"),
      v.literal("quizlet_reimport"),
      v.literal("manual_deck"),
      submissionKind,
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("needsReview"),
    ),
    language: v.optional(submissionLanguage),
    payload: v.optional(v.any()), // validated by submissionPayload at submit time; refinement may reshape it
    sourceFileStorageId: v.optional(v.id("_storage")),
    sourceUrl: v.optional(v.string()),
    resultDeckId: v.optional(v.id("decks")),
    errorMessage: v.optional(v.string()),
    reviewerNotes: v.optional(v.string()),
    aiNotes: v.optional(v.string()),
    publishedPacketId: v.optional(v.id("contentPackets")), // set when the approved submission ships in a packet
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_submitter", ["submitterId"])
    .index("by_status", ["status"])
    .index("by_status_createdAt", ["status", "createdAt"]) // FIFO scan of the pending/refinement queues
    .index("by_submitter_createdAt", ["submitterId", "createdAt"]), // rate limiting + my-submissions, newest first

  // Moderation roles. The users table comes from @convex-dev/auth's
  // authTables (all-optional fields, library-managed indexes), so roles
  // live in a side table keyed by user instead of overriding the
  // library's users definition — see convex/authz.ts for the checks.
  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("moderator"), v.literal("admin")),
  }).index("by_user", ["userId"]),

  // Published OKF-style knowledge packets: refined community content,
  // versioned per language. draft = assembled but not live; published =
  // shipped to all clients. Entries carry their source submission id so
  // contributor provenance survives into the artifact.
  contentPackets: defineTable({
    packetId: v.string(),
    language: submissionLanguage,
    version: v.number(),
    entries: v.array(packetEntry),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_packet", ["packetId"])
    .index("by_language_status", ["language", "status"]),

  // Track 10 (phrasebook) scope — situational travel phrases.
  //
  // `slug` is the URL-safe public identifier (`{situation}-{lang}-{nn}`,
  // e.g. "restaurant-ja-01") used by /phrasebook/[situation]/[phraseId]
  // routes. It exists because Convex document ids are opaque and not
  // route-safe, and the URL format must stay stable across seeds and
  // future community-pipeline publishes. Writers must generate slugs —
  // see convex/seed/phrases.ts for the convention.
  phrases: defineTable({
    slug: v.string(),
    language,
    situation: v.string(),
    english: v.string(),
    translation: v.string(),
    romanization: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
  })
    .index("by_slug", ["slug"])
    .index("by_language_situation", ["language", "situation"]),

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
