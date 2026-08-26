import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

/**
 * Route paths that require a signed-in user. These are the (app) group's
 * product pages plus the onboarding steps — route groups never appear in
 * URLs, so matchers target the public path each page resolves to.
 */
const isProtectedRoute = createRouteMatcher([
  "/home",
  "/review",
  "/decks/:path*",
  "/phrasebook/:path*",
  "/dictionary",
  "/roleplay",
  "/submissions",
  // Staff-only moderation queue — route-level auth gate only; the
  // moderator/admin role check is server-side (convex/moderation.ts +
  // requireModerator on every queue read and review write).
  "/moderation",
  "/profile",
  "/onboarding/:path*",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // Gate here, not in layouts: @convex-dev/auth warns that layout-level
  // checks don't stop nested pages from rendering.
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/sign-in");
  }
});

export const config = {
  // Run on every route except static assets and Next.js internals.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
