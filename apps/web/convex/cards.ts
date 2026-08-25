import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

import { userIdFromSubject } from "./authz";

export const listByDeck = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, args) => {
    // Mirrors decks.get's visibility check — a card list shouldn't leak
    // through a direct deckId call that the deck query itself would deny.
    const deck = await ctx.db.get(args.deckId);
    if (!deck) return [];
    if (deck.visibility !== "public") {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity || userIdFromSubject(identity.subject) !== deck.ownerId) return [];
    }

    return await ctx.db
      .query("cards")
      .withIndex("by_deck", (q) => q.eq("deckId", args.deckId))
      .collect();
  },
});

export const create = mutation({
  args: {
    deckId: v.id("decks"),
    front: v.string(),
    back: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in to add a card.");

    const deck = await ctx.db.get(args.deckId);
    if (!deck) throw new Error("Deck not found.");
    if (userIdFromSubject(identity.subject) !== deck.ownerId) {
      throw new Error("Only the deck owner can add cards.");
    }

    const cardId = await ctx.db.insert("cards", {
      deckId: args.deckId,
      front: args.front,
      back: args.back,
      notes: args.notes,
      language: deck.language,
    });

    await ctx.db.patch(args.deckId, { cardCount: deck.cardCount + 1 });

    return cardId;
  },
});
