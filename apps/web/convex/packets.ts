import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireModerator } from "./authz";
import { submissionLanguage } from "./submissionTypes";
import {
  buildManifestCore,
  buildMainContentPayload,
  countForPayload,
  deriveOrThrow,
} from "../src/features/packets/buildPayload";
import { validateManifest, type OkfManifest } from "../src/features/packets/manifest";

/**
 * Content-packet assembly + export (OKF v0.2 per
 * docs/knowledge/content-packet-format.md).
 *
 * This module READ-ONLY reuses rows produced by
 * submissions.publishContentPacket — it never writes submissions or
 * packet lifecycle state (the one exception is the demo seed helper at
 * the bottom, which inserts a new draft row without touching anything
 * else).
 *
 * Checksum note: manifest.payload.checksums can only be computed over
 * real file bytes, so it is filled by scripts/export-packets.ts at write
 * time. Until then manifests validate with checksum issues on purpose.
 */

/** Assemble the export bundle for one contentPackets row (pure over the doc). */
function assembleBundle(doc: Doc<"contentPackets">) {
  const kind = deriveOrThrow(doc.entries);
  const manifest = buildManifestCore({
    packetId: doc.packetId,
    language: doc.language,
    version: doc.version,
    status: doc.status,
    createdAt: doc.createdAt,
    publishedAt: doc.publishedAt,
    entries: doc.entries,
  });
  const payloadFiles = {
    [manifest.structure.main_content]: buildMainContentPayload(kind, doc.entries, doc.language, {
      name: manifest.name,
      description: manifest.description,
    }),
  };
  return {
    packetId: doc.packetId,
    dbId: doc._id,
    status: doc.status,
    entryCount: doc.entries.length,
    manifest,
    payloadFiles,
    /** Issues expected until the exporter injects checksums + count. */
    preExportIssues: validateManifest(manifest),
  };
}

/**
 * Moderator-facing preview of what a packet would look like as an OKF
 * v0.2 artifact. Throws if entries mix families — that packet cannot be
 * exported and a moderator should see the reason, not an empty manifest.
 */
export const buildPacketManifest = query({
  args: { packetId: v.string() },
  handler: async (ctx, args) => {
    await requireModerator(ctx);
    const doc = await ctx.db
      .query("contentPackets")
      .withIndex("by_packet", (q) => q.eq("packetId", args.packetId))
      .first();
    if (!doc) throw new Error(`No content packet with id ${args.packetId}.`);
    return assembleBundle(doc);
  },
});

const MAX_LIST_PAGE = 200;

/**
 * Browse content packets without their (potentially large) entries.
 * Newest first. Optional filters map onto the by_language_status index;
 * unfiltered browsing does one bounded full scan — fine while packets
 * number in the dozens, revisit if that changes.
 */
export const listPackets = query({
  args: {
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    language: v.optional(submissionLanguage),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireModerator(ctx);
    const take = Math.min(Math.max(1, args.limit ?? 50), MAX_LIST_PAGE);

    let rows: Doc<"contentPackets">[];
    if (args.language !== undefined && args.status !== undefined) {
      rows = await ctx.db
        .query("contentPackets")
        .withIndex("by_language_status", (q) =>
          q.eq("language", args.language!).eq("status", args.status!),
        )
        .collect();
    } else if (args.language !== undefined || args.status !== undefined) {
      const wantLanguage = args.language;
      const wantStatus = args.status;
      rows = (await ctx.db.query("contentPackets").take(MAX_LIST_PAGE)).filter(
        (row) =>
          (wantLanguage === undefined || row.language === wantLanguage) &&
          (wantStatus === undefined || row.status === wantStatus),
      );
    } else {
      rows = await ctx.db.query("contentPackets").take(MAX_LIST_PAGE);
    }

    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, take)
      .map((doc) => ({
        _id: doc._id,
        packetId: doc.packetId,
        language: doc.language,
        version: doc.version,
        status: doc.status,
        createdAt: doc.createdAt,
        publishedAt: doc.publishedAt,
        entryCount: doc.entries.length,
      }));
  },
});

// ---------------------------------------------------------------------------
// Export pipeline (called by scripts/export-packets.ts via `bunx convex run`)
// ---------------------------------------------------------------------------

export interface ExportBundle {
  packetId: string;
  dbId: string;
  status: "draft" | "published";
  entryCount: number;
  manifest: OkfManifest;
  payloadFiles: Record<string, unknown>;
}

/** All published packets as export bundles, newest first. Internal-only. */
export const exportPublishedPackets = internalQuery({
  args: {},
  handler: async (ctx): Promise<ExportBundle[]> => {
    const rows = await ctx.db.query("contentPackets").collect();
    return rows
      .filter((doc) => doc.status === "published")
      .sort((a, b) => (b.publishedAt ?? b.createdAt) - (a.publishedAt ?? a.createdAt))
      .map((doc) => {
        const bundle = assembleBundle(doc);
        // countForPayload here so the exporter only adds checksums.
        const mainFile = bundle.manifest.structure.main_content;
        bundle.manifest.payload.count = countForPayload(
          bundle.manifest.kind,
          bundle.payloadFiles[mainFile],
        );
        return {
          packetId: bundle.packetId,
          dbId: bundle.dbId,
          status: bundle.status,
          entryCount: bundle.entryCount,
          manifest: bundle.manifest,
          payloadFiles: bundle.payloadFiles,
        };
      });
  },
});

// ---------------------------------------------------------------------------
// Demo seed helper (CONTRIBUTING.md seed-data requirement)
// ---------------------------------------------------------------------------

const DEMO_PACKET_ID = "ko-phrase-pack-demo-submissions";

/**
 * Idempotent demo: builds ONE draft packet from approved Korean phrase
 * submissions (seedSampleSubmissions provides one). Non-destructive by
 * design:
 *   - existing draft -> returned untouched (no second insert),
 *   - source submissions are NOT stamped with publishedPacketId, unlike
 *     publishContentPacket, so the real publish flow still owns them.
 *
 * Run: bunx convex run seed/sampleSubmissions:seedSampleSubmissions then
 *      bunx convex run packets:ensureDemoDraftPacket
 */
export const ensureDemoDraftPacket = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("contentPackets")
      .withIndex("by_packet", (q) => q.eq("packetId", DEMO_PACKET_ID))
      .first();
    if (existing) {
      return { created: false, packetRowId: existing._id, packetId: existing.packetId };
    }

    const now = Date.now();
    const approved = (
      await ctx.db
        .query("submissions")
        .withIndex("by_status_createdAt", (q) => q.eq("status", "approved"))
        .collect()
    ).sort((a, b) => (a.createdAt ?? now) - (b.createdAt ?? now));

    // Explicit narrowing: the schema's kind union also contains the deck
    // import kinds and language is optional, so a plain filter callback
    // can't narrow the element type for TS.
    const entries: {
      kind: "phrase";
      language: "ko";
      payload: unknown;
      sourceSubmissionId: Doc<"submissions">["_id"];
    }[] = [];
    for (const s of approved) {
      if (s.publishedPacketId !== undefined) continue;
      if (s.kind !== "phrase") continue;
      if (s.language !== "ko") continue;
      entries.push({
        kind: s.kind,
        language: s.language,
        payload: s.payload,
        sourceSubmissionId: s._id,
      });
      if (entries.length >= 5) break;
    }

    if (entries.length === 0) {
      throw new Error(
        "No eligible approved ko phrase submissions. Seed first: bunx convex run " +
          "seed/sampleSubmissions:seedSampleSubmissions",
      );
    }

    const packetRowId = await ctx.db.insert("contentPackets", {
      packetId: DEMO_PACKET_ID,
      language: "ko",
      version: 1,
      entries,
      status: "draft",
      createdAt: now,
    });

    return { created: true, packetRowId, packetId: DEMO_PACKET_ID, entryCount: entries.length };
  },
});
