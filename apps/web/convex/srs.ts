import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// The FSRS engine (Track 7) lives in src/lib/srs/fsrs.ts and is shared
// with client code. It is pure math, so the default Convex runtime can
// run it — no "use node" needed. If this file fails to resolve, that
// module is owned by a sibling task; do not stub it here.
import {
  initState,
  next,
  type CardState as FsrsCardState,
  type Rating as FsrsRating,
} from "../src/lib/srs/fsrs";

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

    // Oldest due first: the by_user_due index scan returns ascending
    // dueAt for a fixed userId, so the queue order is deterministic.
    return await ctx.db
      .query("srsCardState")
      .withIndex("by_user_due", (q) => q.eq("userId", userId).lte("dueAt", Date.now()))
      .order("asc")
      .collect();
  },
});

type UiRating = "again" | "hard" | "good" | "easy";

/** UI grade → FSRS numeric rating (1=again, 2=hard, 3=good, 4=easy). */
const RATING_TO_FSRS: Record<UiRating, FsrsRating> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

/**
 * Coarse learning-stage label kept for UI display. Derived from the grade
 * and whether the card had prior review history — it is cosmetic; the
 * actual scheduling lives in stability/difficulty/reps/lapses.
 */
function stageLabel(rating: UiRating, hadPriorRow: boolean): "learning" | "review" | "relearning" {
  if (rating === "again") return hadPriorRow ? "relearning" : "learning";
  if (!hadPriorRow && rating === "hard") return "learning";
  return "review";
}

/**
 * Rebuild the FSRS state from a stored row, or null when the row is a
 * placeholder-era document. Placeholder rows are detected by a missing
 * `reps`/`lapses` field (the placeholder scheduler never wrote them) —
 * their stability/difficulty are constants, not FSRS values, so they are
 * not worth salvaging.
 */
function fsrsStateFromRow(row: {
  stability: number;
  difficulty: number;
  dueAt: number;
  lastReviewedAt?: number;
  reps?: number;
  lapses?: number;
}): FsrsCardState | null {
  if (row.reps === undefined || row.lapses === undefined) return null;
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    due: row.dueAt,
    lastReview: row.lastReviewedAt ?? row.dueAt,
    reps: row.reps,
    lapses: row.lapses,
  };
}

/**
 * Record one graded review and persist the next FSRS state.
 *
 * State transitions:
 * - No row yet → initState(now, rating), as for a brand-new card.
 * - Row with reps+lapses (canonical) → next(state, rating, now).
 * - Row missing either field (placeholder-era) → lazy migration:
 *   initState(now, rating) as if first review. The placeholder
 *   scheduler's fixed 1-day bumps carried no real history to preserve.
 *
 * Product rule kept from the placeholder era: an "again" grade is
 * persisted with dueAt clamped to now, so the card stays inside the
 * due-today queue (dueAt <= now). The session UI dedupes graded cards
 * locally, so this does not loop mid-session. The clamp only touches the
 * stored due date — FSRS reads stability/difficulty/reps/lapses/
 * lastReview on the next pass, never the stored due.
 */
export const recordReview = mutation({
  args: {
    cardId: v.id("cards"),
    rating: v.union(v.literal("again"), v.literal("hard"), v.literal("good"), v.literal("easy")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Must be signed in to record a review.");
    const userId = requireUserId(userIdFromSubject(identity.subject), (id) =>
      ctx.db.normalizeId("users", id),
    );

    if (!(await ctx.db.get(args.cardId))) throw new Error("Card not found.");

    const existing = await ctx.db
      .query("srsCardState")
      .withIndex("by_user_card", (q) => q.eq("userId", userId).eq("cardId", args.cardId))
      .unique();

    const now = Date.now();
    const fsrsRating = RATING_TO_FSRS[args.rating];

    const priorState = existing ? fsrsStateFromRow(existing) : null;
    // A placeholder-era row gets re-initialised: its old numbers were
    // constants, so treating the card as first-touch is more honest than
    // feeding fake stability into next().
    const newState =
      priorState !== null ? next(priorState, fsrsRating, now) : initState(now, fsrsRating);

    const fields = {
      state: stageLabel(args.rating, existing !== null),
      stability: newState.stability,
      difficulty: newState.difficulty,
      dueAt: args.rating === "again" ? Math.min(newState.due, now) : newState.due,
      lastReviewedAt: now,
      reps: newState.reps,
      lapses: newState.lapses,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return existing._id;
    }

    return await ctx.db.insert("srsCardState", {
      userId,
      cardId: args.cardId,
      ...fields,
    });
  },
});
