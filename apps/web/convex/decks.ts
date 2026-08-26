import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser, userIdFromSubject } from "./authz";

export const list = query({
  args: {
    language: v.optional(
      v.union(v.literal("ja"), v.literal("ko"), v.literal("zh"), v.literal("th"), v.literal("vi")),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    // Public decks are visible to everyone; a signed-in user also sees
    // their own private decks. Two indexed queries, merged, rather than
    // one unindexed scan with a filter — this table can get large.
    const publicDecks = args.language
      ? await ctx.db
          .query("decks")
          .withIndex("by_language_visibility", (q) =>
            q.eq("language", args.language!).eq("visibility", "public"),
          )
          .collect()
      : await ctx.db
          .query("decks")
          .filter((q) => q.eq(q.field("visibility"), "public"))
          .collect();

    if (!identity) return publicDecks;

    const userId = ctx.db.normalizeId("users", userIdFromSubject(identity.subject));
    if (!userId) return publicDecks;

    const ownDecks = await ctx.db
      .query("decks")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const seen = new Set(publicDecks.map((d) => d._id));
    return [...publicDecks, ...ownDecks.filter((d) => !seen.has(d._id))];
  },
});

export const get = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.deckId);
    if (!deck) return null;

    if (deck.visibility === "public") return deck;

    const identity = await ctx.auth.getUserIdentity();
    // Don't leak private-deck existence to non-owners (or anonymous users).
    if (!identity || userIdFromSubject(identity.subject) !== deck.ownerId) return null;
    return deck;
  },
});

/**
 * Per-user review progress for one deck: { total, due, reviewed }.
 *
 * Semantics match the rest of the SRS surface: a card is "reviewed" once
 * the user has an srsCardState row for it (rows are created on first
 * review — see srs.recordReview), and "due" means such a row with
 * dueAt <= now (same definition as srs.dueToday). Never-reviewed cards
 * count toward total but not due; total - reviewed is the new-card count.
 *
 * Efficiency: two indexed scans, no N+1. The deck's cards come from the
 * by_deck index; the user's rows come from a by_user_card prefix match
 * (Convex index ranges allow eq on the leading userId field alone), then
 * both sets intersect in memory. Cost is O(deck cards + user's total SRS
 * rows) regardless of deck size; if that ever gets hot, denormalize a
 * per-user-per-deck counter rather than falling back to per-card queries.
 */
export const deckProgress = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    const deck = await ctx.db.get(args.deckId);
    // Same non-leaking behavior as decks.get: a private deck's existence
    // (and therefore its progress) is only visible to its owner.
    if (!deck || (deck.visibility !== "public" && deck.ownerId !== userId)) {
      throw new Error("Deck not found.");
    }

    // Count from the actual cards, not deck.cardCount — the counter is
    // maintained incrementally and can drift; this scan is free anyway.
    const inDeck = new Set(
      (
        await ctx.db
          .query("cards")
          .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
          .collect()
      ).map((card) => card._id),
    );

    const now = Date.now();
    let reviewed = 0;
    let due = 0;
    for (const srsState of await ctx.db
      .query("srsCardState")
      .withIndex("by_user_card", (q) => q.eq("userId", userId))
      .collect()) {
      if (!inDeck.has(srsState.cardId)) continue;
      reviewed += 1;
      // Count only definite numbers: dueAt may widen to v.optional as the
      // SRS schema evolves (sibling sprint owns srs.ts), so don't assume
      // the field stays required.
      if (typeof srsState.dueAt === "number" && srsState.dueAt <= now) {
        due += 1;
      }
    }

    return { total: inDeck.size, due, reviewed };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    language: v.union(
      v.literal("ja"),
      v.literal("ko"),
      v.literal("zh"),
      v.literal("th"),
      v.literal("vi"),
    ),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in to create a deck.");

    const ownerId = ctx.db.normalizeId(
      "users",
      userIdFromSubject(identity.subject),
    ) as Id<"users"> | null;
    if (!ownerId) throw new Error("Signed-in identity is not a valid user.");

    return await ctx.db.insert("decks", {
      title: args.title,
      language: args.language,
      visibility: args.visibility,
      ownerId,
      source: "community",
      cardCount: 0,
    });
  },
});
