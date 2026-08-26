import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireModerator, requireUser } from "./authz";
import { submissionKind, submissionLanguage, submissionPayload } from "./submissionTypes";

/**
 * Community content ingestion pipeline.
 *
 * Flow: submit (public, rate-limited) -> pending -> AI refinement
 * (internal transitions; the real refinement worker is a Python service,
 * see cron.ts) -> needsReview / approved -> human moderation decision ->
 * published inside a versioned contentPacket.
 */

const MAX_SUBMISSIONS_PER_DAY = 10;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_QUEUE_PAGE = 100;

// ---------------------------------------------------------------------------
// Public: submission intake
// ---------------------------------------------------------------------------

export const submitContent = mutation({
  args: {
    kind: submissionKind,
    language: submissionLanguage,
    // Union-of-objects validator: Convex checks shape at the function
    // boundary; validatePayloadForKind below just upgrades the error
    // message from "union validation failed" to a per-kind explanation.
    payload: submissionPayload,
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);

    // Rate limit — count this submitter's submissions in the window via
    // the by_submitter_createdAt index (same counter-per-window idea as
    // easycv's usageQuotas pattern, but derived from the queue rows
    // themselves instead of a separate quota table).
    const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
    const recent = await ctx.db
      .query("submissions")
      .withIndex("by_submitter_createdAt", (q) =>
        q.eq("submitterId", userId).gte("createdAt", windowStart),
      )
      .collect();
    if (recent.length >= MAX_SUBMISSIONS_PER_DAY) {
      throw new Error(
        `Submission rate limit reached (${MAX_SUBMISSIONS_PER_DAY} per day). Try again later.`,
      );
    }

    // Validate payload shape for the declared kind. v.union in the schema
    // can't tell us WHICH member matched; matching explicitly per kind
    // gives a precise error instead of "union validation failed".
    validatePayloadForKind(args.kind, args.payload);

    const now = Date.now();
    return await ctx.db.insert("submissions", {
      submitterId: userId,
      kind: args.kind,
      language: args.language,
      payload: args.payload,
      status: "pending",
      sourceUrl: args.sourceUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});

function validatePayloadForKind(kind: string, payload: unknown): void {
  const shapes: Record<string, (p: unknown) => boolean> = {
    phrase: isObjectWith(["text", "english"]),
    card: isObjectWith(["front", "back"]),
    correction: isObjectWith(["targetType", "targetId", "field", "proposedValue"]),
    exampleSentence: isObjectWith(["sentence", "english"]),
    situationPack: (p) => isObject(p) && Array.isArray(p.phrases) && p.phrases.length > 0,
  };
  const check = shapes[kind];
  if (!check) throw new Error(`Unknown submission kind: ${kind}`);
  if (!check(payload)) throw new Error(`Invalid payload for kind "${kind}".`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isObjectWith(fields: string[]): (p: unknown) => boolean {
  return (p) => isObject(p) && fields.every((f) => typeof p[f] === "string" && p[f].length > 0);
}

export const mySubmissions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("submissions")
      .withIndex("by_submitter_createdAt", (q) => q.eq("submitterId", userId))
      .order("desc")
      .take(Math.min(args.limit ?? 50, MAX_QUEUE_PAGE));
  },
});

// ---------------------------------------------------------------------------
// Moderation (moderator/admin role required — see convex/authz.ts)
// ---------------------------------------------------------------------------

export const moderationQueue = query({
  args: {
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("needsReview")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireModerator(ctx);
    return await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .take(Math.min(args.limit ?? 50, MAX_QUEUE_PAGE));
  },
});

export const reviewSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    reviewerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireModerator(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found.");
    if (submission.status !== "needsReview" && submission.status !== "pending") {
      throw new Error(
        `Only pending or needsReview submissions can be reviewed (current: ${submission.status}).`,
      );
    }

    await ctx.db.patch(args.submissionId, {
      status: args.decision,
      reviewerNotes: args.reviewerNotes,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// ---------------------------------------------------------------------------
// Publishing: approved submissions become a versioned content packet
// ---------------------------------------------------------------------------

export const publishContentPacket = mutation({
  args: {
    packetId: v.string(),
    language: submissionLanguage,
    version: v.number(),
    submissionIds: v.array(v.id("submissions")),
    status: v.union(v.literal("draft"), v.literal("published")),
  },
  handler: async (ctx, args) => {
    await requireModerator(ctx);
    if (args.submissionIds.length === 0) {
      throw new Error("A content packet needs at least one submission.");
    }

    const now = Date.now();
    const entries = [];
    for (const submissionId of args.submissionIds) {
      const submission = await ctx.db.get(submissionId);
      if (!submission) throw new Error(`Submission ${submissionId} not found.`);
      if (submission.status !== "approved") {
        throw new Error(
          `Submission ${submissionId} is not approved (current: ${submission.status}).`,
        );
      }
      if (submission.language !== args.language) {
        throw new Error(
          `Submission ${submissionId} is ${submission.language}, not ${args.language}.`,
        );
      }
      entries.push({
        kind: submission.kind as
          "phrase" | "card" | "correction" | "exampleSentence" | "situationPack",
        language: args.language,
        payload: submission.payload,
        sourceSubmissionId: submissionId,
      });
    }

    const packetId = await ctx.db.insert("contentPackets", {
      packetId: args.packetId,
      language: args.language,
      version: args.version,
      entries,
      status: args.status,
      createdAt: now,
      ...(args.status === "published" ? { publishedAt: now } : {}),
    });

    // Stamp each consumed submission so it can't be republished into a
    // second packet later.
    for (const submissionId of args.submissionIds) {
      await ctx.db.patch(submissionId, { publishedPacketId: packetId });
    }

    return packetId;
  },
});

// ---------------------------------------------------------------------------
// Internal: AI-agent processing transitions + cron sweep
// (the Python refinement worker calls these via an authenticated path)
// ---------------------------------------------------------------------------

/**
 * Claim a pending submission for refinement. Fails if it isn't pending so
 * two workers can't both claim it.
 */
export const beginProcessing = internalMutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found.");
    if (submission.status !== "pending") {
      throw new Error(
        `Expected status "pending" to begin processing (current: ${submission.status}).`,
      );
    }
    await ctx.db.patch(args.submissionId, { status: "processing", updatedAt: Date.now() });
    return { success: true };
  },
});

/**
 * Finish refinement: either hand off to human review or auto-approve.
 * aiNotes records what the agent did, for reviewer context and audit.
 */
export const finishProcessing = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    outcome: v.union(v.literal("needsReview"), v.literal("approved")),
    aiNotes: v.optional(v.string()),
    // Optional so callers that didn't refine can omit it; undefined keeps
    // the existing payload.
    refinedPayload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found.");
    if (submission.status !== "processing") {
      throw new Error(
        `Expected status "processing" to finish processing (current: ${submission.status}).`,
      );
    }
    await ctx.db.patch(args.submissionId, {
      status: args.outcome,
      aiNotes: args.aiNotes,
      payload: args.refinedPayload ?? submission.payload,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Cron sweep target: any `pending` submission older than the threshold is
 * flagged needsReview so a human sees it instead of it rotting in the
 * queue. The real AI refinement pass lands in the Python worker; until
 * then this keeps the queue honest. Also releases submissions stuck in
 * `processing` back to `pending` after the timeout so a crashed worker
 * doesn't deadlock them.
 */
const STALE_PENDING_MS = 24 * 60 * 60 * 1000;
const STUCK_PROCESSING_MS = 6 * 60 * 60 * 1000;

export const sweepStaleSubmissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let flagged = 0;
    let released = 0;

    const stalePending = await ctx.db
      .query("submissions")
      .withIndex("by_status_createdAt", (q) =>
        q.eq("status", "pending").lt("createdAt", now - STALE_PENDING_MS),
      )
      .collect();
    for (const s of stalePending) {
      await ctx.db.patch(s._id, {
        status: "needsReview",
        aiNotes: "Auto-flagged: no AI refinement within 24h of submission.",
        updatedAt: now,
      });
      flagged++;
    }

    const stuckProcessing = await ctx.db
      .query("submissions")
      .withIndex("by_status_createdAt", (q) =>
        q.eq("status", "processing").lt("createdAt", now - STUCK_PROCESSING_MS),
      )
      .collect();
    for (const s of stuckProcessing) {
      await ctx.db.patch(s._id, {
        status: "pending",
        errorMessage: undefined,
        aiNotes: "Released: processing timed out; returned to queue.",
        updatedAt: now,
      });
      released++;
    }

    return { flagged, released };
  },
});
