import { query } from "./_generated/server";
import { currentUserId } from "./authz";

/**
 * Role gate for the /moderation staff surface.
 *
 * Deliberately caller-scoped: it takes NO userId argument and resolves the
 * viewer from the auth token instead. A public query that accepted an
 * arbitrary userId would let any signed-in user enumerate who holds
 * moderation roles. Function-level enforcement for the actual queue and
 * review operations stays in convex/authz.ts's requireModerator — this
 * query only powers the UI's no-access screen, it is not a security
 * boundary by itself.
 *
 * Returns false (rather than throwing) for anonymous callers so the
 * client's useQuery settles cleanly instead of error-looping while a
 * session is expiring; the middleware in src/proxy.ts already redirects
 * signed-out traffic to /sign-in before this page renders.
 */
export const isModerator = query({
  args: {},
  handler: async (ctx) => {
    const userId = await currentUserId(ctx);
    if (!userId) return false;
    const role = await ctx.db
      .query("userRoles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return role !== null; // both moderator and admin may moderate
  },
});
