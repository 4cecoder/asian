import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Role checks for community-content moderation.
 *
 * The users table is owned by @convex-dev/auth (authTables — library-
 * managed fields and indexes), so roles live in the `userRoles` side
 * table instead of overriding that definition. A user with no row there
 * is a plain contributor: they can submit and view their own submissions,
 * but cannot moderate or publish.
 *
 * Same shape as easycv's convex/authz.ts: small exported guards that take
 * the ctx/db and either return the narrowed value or throw, so every
 * moderation entry point funnels through one place.
 */

export type ModerationRole = "moderator" | "admin";

/**
 * Extract the users-table document id from an auth token subject.
 *
 * @convex-dev/auth issues token subjects as "<userId>|<sessionId>"
 * (TOKEN_SUB_CLAIM_DIVIDER in the library — verified against 0.0.95
 * dist/server/implementation/utils.js and getAuthUserId's split), so the
 * raw subject is NOT a valid users doc id. Bare ids (as used by convex-test
 * identities) pass through unchanged.
 */
export function userIdFromSubject(subject: string): string {
  return subject.split("|")[0]!;
}

export async function currentUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db.normalizeId("users", userIdFromSubject(identity.subject));
}

async function hasModerationRole(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const role = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return role !== null; // both moderator and admin may moderate
}

/**
 * Resolve the caller or throw if anonymous. Error text is asserted in
 * tests ("Must be signed in").
 */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await currentUserId(ctx);
  if (!userId) throw new Error("Must be signed in.");
  return userId;
}

/**
 * Require a moderation-capable user (moderator or admin). Throws with a
 * distinct message so tests can distinguish authn from authz failures.
 */
export async function requireModerator(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await requireUser(ctx);
  if (!(await hasModerationRole(ctx, userId))) {
    throw new Error("Moderator role required.");
  }
  return userId;
}
