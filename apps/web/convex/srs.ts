import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

import { userIdFromSubject } from "./authz";

function requireUserId(
  subject: string,
  normalize: (id: string) => Id<"users"> | null,
): Id<"users"> {
  const userId = normalize(subject);
  if (!userId) throw new Error("Signed-in identity is not a valid user.");
  return userId;
}

export const dueToday = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const userId = ctx.db.normalizeId("users", userIdFromSubject(identity.subject));
    if (!userId) return [];

    return await ctx.db
      .query("srsCardState")
      .withIndex("by_user_due", (q) => q.eq("userId", userId).lte("dueAt", Date.now()))
      .collect();
  },
});

// Placeholder scheduling only — NOT the real FSRS v4.5 algorithm (Track 7,
// docs/knowledge/tracks/track-07-srs-engine.md, unimplemented). This exists
// so the table has a real write path to test against; a fixed 1-day bump
// on "good" and no bump on "again" is not a spaced-repetition algorithm,
// don't build UI copy that implies it is one.
const PLACEHOLDER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const recordReview = mutation({
  args: {
    cardId: v.id("cards"),
    rating: v.union(v.literal("again"), v.literal("good")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in to record a review.");
    const userId = requireUserId(userIdFromSubject(identity.subject), (id) =>
      ctx.db.normalizeId("users", id),
    );

    const existing = await ctx.db
      .query("srsCardState")
      .withIndex("by_user_card", (q) => q.eq("userId", userId).eq("cardId", args.cardId))
      .unique();

    const now = Date.now();
    const dueAt = args.rating === "good" ? now + PLACEHOLDER_INTERVAL_MS : now;
    const state = args.rating === "good" ? ("review" as const) : ("relearning" as const);

    if (existing) {
      await ctx.db.patch(existing._id, { state, dueAt, lastReviewedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("srsCardState", {
      userId,
      cardId: args.cardId,
      state,
      stability: 1,
      difficulty: 5,
      dueAt,
      lastReviewedAt: now,
    });
  },
});
