import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { userIdFromSubject } from "./authz";

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
