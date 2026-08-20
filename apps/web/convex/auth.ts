import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Convex Auth handles identity for the Next.js web app specifically.
 * This is a separate concern from Track 3's FastAPI JWT/API-key auth
 * (docs/knowledge/modules/track-03/07-dependency-injection.md) — that's
 * for the real-time audio/LLM gateway, service-to-service and
 * high-throughput paths where a reactive DB round-trip per request isn't
 * the right shape. See docs/knowledge/adr/0003-auth-architecture.md for
 * the full reasoning and how the two are meant to relate once Track 3
 * is actually built.
 *
 * Password-only for now — lowest-friction default for getting a real
 * deployment running. Add OAuth providers here later if needed.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
