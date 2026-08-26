import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./authz";

/**
 * Profile and learning preferences for the signed-in user, stored in the
 * `profiles` side table (schema.ts explains why it is not on `users`).
 *
 * Access is identity-derived only: every function resolves the caller via
 * requireUser and keys all reads/writes by that id. No function accepts a
 * userId or profileId argument, so a client cannot even name another
 * user's row — that is the ownership boundary, asserted in profiles.test.ts.
 */

const MAX_DISPLAY_NAME_LENGTH = 80;

/** Get the caller's profile row, creating an empty one if none exists. */
async function getOrCreateProfile(ctx: MutationCtx, userId: Id<"users">): Promise<Doc<"profiles">> {
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (existing) return existing;

  const now = Date.now();
  const profileId = await ctx.db.insert("profiles", {
    userId,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(profileId);
  if (!created) throw new Error("Profile row missing immediately after insert.");
  return created;
}

/**
 * The caller's profile view: preferences joined with their account email
 * and deck count (own decks only — public decks owned by others are
 * deliberately excluded, unlike decks.list which merges them for browsing).
 * Every preference field is null until first saved; email/deckCount always
 * reflect current account state.
 */
export const myProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);

    // Reads only — safe to run concurrently.
    const [profile, user, ownDecks] = await Promise.all([
      ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
      ctx.db.get(userId),
      ctx.db
        .query("decks")
        .withIndex("by_owner", (q) => q.eq("ownerId", userId))
        .collect(),
    ]);

    return {
      email: user?.email ?? null,
      displayName: profile?.displayName ?? null,
      language: profile?.language ?? null,
      goal: profile?.goal ?? null,
      updatedAt: profile?.updatedAt ?? null,
      deckCount: ownDecks.length,
    };
  },
});

/**
 * Create-or-patch the caller's profile. Omitted args leave stored values
 * untouched; an empty (or whitespace) displayName clears the field.
 */
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    // Literal unions mirror the profiles table in schema.ts — keep the
    // two in sync (goal must stay a superset of onboarding's
    // ONBOARDING_GOALS; language reuses the schema-wide union).
    language: v.optional(
      v.union(v.literal("ja"), v.literal("ko"), v.literal("zh"), v.literal("th"), v.literal("vi")),
    ),
    goal: v.optional(
      v.union(v.literal("travel"), v.literal("work"), v.literal("family"), v.literal("media")),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    if (
      args.displayName !== undefined &&
      args.displayName.trim().length > MAX_DISPLAY_NAME_LENGTH
    ) {
      throw new Error(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
    }

    const patch: Partial<Doc<"profiles">> = { updatedAt: Date.now() };
    if (args.language !== undefined) patch.language = args.language;
    if (args.goal !== undefined) patch.goal = args.goal;
    if (args.displayName !== undefined) {
      const displayName = args.displayName.trim();
      // Patching undefined removes the optional field.
      patch.displayName = displayName.length > 0 ? displayName : undefined;
    }

    const profile = await getOrCreateProfile(ctx, userId);
    await ctx.db.patch(profile._id, patch);
    return await ctx.db.get(profile._id);
  },
});
