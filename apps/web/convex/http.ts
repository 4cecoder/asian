import { httpRouter } from "convex/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, httpAction } from "./_generated/server";

const http = httpRouter();

auth.addHttpRoutes(http);

// ---------------------------------------------------------------------------
// Worker ingestion endpoints (ADR 0005 resolution)
//
// The Python refinement worker (apps/worker) authenticates with a shared
// secret sent as `Authorization: Bearer <WORKER_SECRET>`. The secret lives
// in the Convex env var WORKER_SECRET (`bunx convex env set WORKER_SECRET
// ...` per SECURITY.md) and is read via process.env inside the actions.
// These httpActions forward to the internal mutations in submissions.ts,
// which keep their status-transition guards as the second line of defense
// against double claims.
// ---------------------------------------------------------------------------

/** Longest batch a worker may claim in one call; matches MAX_QUEUE_PAGE. */
const MAX_CLAIM_BATCH = 100;

/**
 * Claim up to `limit` pending submissions for refinement.
 *
 * Enumerates the pending queue by_status (FIFO by createdAt per the index
 * definition) and flips each row to `processing` through beginProcessing so
 * the single-row claim guard stays the one place that owns that transition.
 */
export const claimPendingBatch = internalMutation({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit, 1), MAX_CLAIM_BATCH);
    const pending = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(limit);

    const claimed = [];
    for (const submission of pending) {
      try {
        await ctx.runMutation(internal.submissions.beginProcessing, {
          submissionId: submission._id,
        });
      } catch {
        // Lost the race (row no longer pending). Skip it; another worker won.
        continue;
      }
      claimed.push({
        submissionId: submission._id,
        kind: submission.kind,
        language: submission.language,
        payload: submission.payload,
      });
    }
    return claimed;
  },
});

/**
 * Constant-time-enough string comparison for the shared secret. Length
 * mismatch short-circuits (leaks only the length, which is not sensitive
 * here); equal-length comparison always walks every character.
 */
function secretMatches(provided: string | undefined | null, expected: string): boolean {
  if (!provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Shared guard for both worker routes. Returns either the validated secret
 * comparison result or a ready-made Response rejecting the request.
 */
function authorizeWorkerRequest(
  request: Request,
): { ok: true } | { ok: false; response: Response } {
  const expected = process.env.WORKER_SECRET;
  if (!expected) {
    // Deployment misconfiguration, not a client problem.
    return {
      ok: false,
      response: jsonError(500, "Server misconfigured: WORKER_SECRET is not set."),
    };
  }
  if (!secretMatches(bearerToken(request), expected)) {
    return { ok: false, response: jsonError(401, "Invalid or missing worker credentials.") };
  }
  return { ok: true };
}

export const workerClaim = httpAction(async (ctx, request) => {
  const authorized = authorizeWorkerRequest(request);
  if (!authorized.ok) return authorized.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }
  const limit = (body as { limit?: unknown })?.limit;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1) {
    return jsonError(400, 'Body must be {"limit": positive integer}.');
  }

  const claimed = await ctx.runMutation(internal.http.claimPendingBatch, { limit });
  return new Response(JSON.stringify({ submissions: claimed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export const workerComplete = httpAction(async (ctx, request) => {
  const authorized = authorizeWorkerRequest(request);
  if (!authorized.ok) return authorized.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }
  const parsed = body as {
    submissionId?: unknown;
    outcome?: unknown;
    aiNotes?: unknown;
    refinedPayload?: unknown;
  };
  if (typeof parsed.submissionId !== "string" || parsed.submissionId.length === 0) {
    return jsonError(400, "submissionId is required.");
  }
  // finishProcessing's v.id("submissions") validator re-checks this at the
  // mutation boundary; a malformed id throws there and maps to 409 below.
  const submissionId = parsed.submissionId as Id<"submissions">;
  if (parsed.outcome !== "needsReview" && parsed.outcome !== "approved") {
    return jsonError(400, 'outcome must be "needsReview" or "approved".');
  }

  try {
    await ctx.runMutation(internal.submissions.finishProcessing, {
      submissionId: parsed.submissionId as Id<"submissions">,
      outcome: parsed.outcome,
      aiNotes: typeof parsed.aiNotes === "string" ? parsed.aiNotes : undefined,
      refinedPayload: parsed.refinedPayload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    if (message.includes("Validator")) {
      // Argument validation failed — the request was malformed.
      return jsonError(422, message);
    }
    // Otherwise finishProcessing rejected on unknown id or wrong current
    // status (e.g. the cron sweep already released a stale claim back to
    // pending) — a conflict for the caller to skip.
    return jsonError(409, message);
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

http.route({
  path: "/api/worker/claim",
  method: "POST",
  handler: workerClaim,
});

http.route({
  path: "/api/worker/complete",
  method: "POST",
  handler: workerComplete,
});

export default http;
