import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedModerator(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  await t.run(async (ctx) => {
    await ctx.db.insert("userRoles", { userId, role: "moderator" });
  });
  return { userId, asModerator: t.withIdentity({ subject: userId }) };
}

/** Insert a contentPackets row the way publishContentPacket would. */
async function seedPacket(
  t: ReturnType<typeof convexTest>,
  over?: Partial<{
    packetId: string;
    language: "ko" | "ja" | "zh";
    version: number;
    status: "draft" | "published";
    entries: {
      kind: "phrase" | "card" | "correction" | "exampleSentence" | "situationPack";
      language: "ko" | "ja" | "zh";
      payload: unknown;
      sourceSubmissionId?: string;
    }[];
    createdAt: number;
    publishedAt: number;
  }>,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("contentPackets", {
      packetId: over?.packetId ?? "ko-phrase-pack-cafe-ordering",
      language: over?.language ?? "ko",
      version: over?.version ?? 1,
      status: over?.status ?? "draft",
      createdAt: over?.createdAt ?? Date.UTC(2026, 7, 25, 9),
      ...(over?.publishedAt !== undefined ? { publishedAt: over.publishedAt } : {}),
      entries: over?.entries ?? [
        {
          kind: "phrase" as const,
          language: "ko" as const,
          payload: {
            text: "아이스 아메리카노 한 잔 주세요.",
            english: "One iced americano, please.",
            romanization: "aiseu amerikano han jan juseyo.",
          },
          sourceSubmissionId: undefined as string | undefined,
        },
      ],
    }),
  );
}

describe("packets.buildPacketManifest", () => {
  test("is gated: anonymous and plain users are refused", async () => {
    const t = convexTest(schema, modules);
    const plainId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asPlain = t.withIdentity({ subject: plainId });

    await expect(t.query(api.packets.buildPacketManifest, { packetId: "x" })).rejects.toThrow(
      "Must be signed in",
    );
    await expect(asPlain.query(api.packets.buildPacketManifest, { packetId: "x" })).rejects.toThrow(
      "Moderator role required",
    );
  });

  test("assembles an OKF v0.2 bundle from a draft row", async () => {
    const t = convexTest(schema, modules);
    const { asModerator } = await seedModerator(t);
    await seedPacket(t);

    const bundle = await asModerator.query(api.packets.buildPacketManifest, {
      packetId: "ko-phrase-pack-cafe-ordering",
    });
    expect(bundle.manifest.okf_version).toBe("0.2");
    expect(bundle.manifest.kind).toBe("phrase-pack");
    expect(bundle.manifest.status).toBe("refined"); // draft -> contract refined
    expect(bundle.manifest.structure.main_content).toBe("phrases.json");
    expect(bundle.manifest.version).toBe("1.0.0");
    expect(bundle.status).toBe("draft");
    // pre-export: checksums not computed yet, and the validator says so
    expect(bundle.preExportIssues.map((i) => i.code)).toContain("payload.checksums.missing_file");
    const main = bundle.payloadFiles["phrases.json"] as { entries: unknown[] };
    expect(main.entries).toHaveLength(1);
  });

  test("unknown packet ids fail loudly", async () => {
    const t = convexTest(schema, modules);
    const { asModerator } = await seedModerator(t);
    await expect(
      asModerator.query(api.packets.buildPacketManifest, { packetId: "nope" }),
    ).rejects.toThrow("No content packet");
  });

  test("mixed-family rows are rejected with the reason", async () => {
    const t = convexTest(schema, modules);
    const { asModerator } = await seedModerator(t);
    await seedPacket(t, {
      packetId: "ko-mixed",
      entries: [
        { kind: "phrase", language: "ko", payload: { text: "안녕", english: "hi" } },
        {
          kind: "correction",
          language: "ko",
          payload: { targetId: "x", field: "reading", proposedValue: "r" },
        },
      ],
    });
    await expect(
      asModerator.query(api.packets.buildPacketManifest, { packetId: "ko-mixed" }),
    ).rejects.toThrow(/mixed entry kinds/);
  });
});

describe("packets.listPackets", () => {
  test("browse view hides entry payloads and supports filters + ordering", async () => {
    const t = convexTest(schema, modules);
    const { asModerator } = await seedModerator(t);

    await seedPacket(t, { packetId: "old-draft", createdAt: Date.UTC(2026, 0, 1) });
    await seedPacket(t, { packetId: "new-draft", createdAt: Date.UTC(2026, 6, 1) });
    await seedPacket(t, {
      packetId: "ja-published",
      language: "ja",
      status: "published",
      createdAt: Date.UTC(2026, 2, 1), // older than new-draft
      publishedAt: Date.UTC(2026, 5, 1),
    });

    const all = await asModerator.query(api.packets.listPackets, {});
    expect(all.map((p) => p.packetId)).toEqual(["new-draft", "ja-published", "old-draft"]);
    expect(all[0]).not.toHaveProperty("entries");
    expect(all[0]!.entryCount).toBe(1);

    const draftsOnly = await asModerator.query(api.packets.listPackets, { status: "draft" });
    expect(draftsOnly.map((p) => p.packetId)).toEqual(["new-draft", "old-draft"]);

    const jaPublished = await asModerator.query(api.packets.listPackets, {
      language: "ja",
      status: "published",
    });
    expect(jaPublished.map((p) => p.packetId)).toEqual(["ja-published"]);

    // browse stays moderator-only
    const plainId = await t.run(async (ctx) => ctx.db.insert("users", {}));
    await expect(
      t.withIdentity({ subject: plainId }).query(api.packets.listPackets, {}),
    ).rejects.toThrow("Moderator role required");
  });
});

describe("packets.exportPublishedPackets (internal)", () => {
  test("returns only published bundles with counts pre-filled", async () => {
    const t = convexTest(schema, modules);
    await seedPacket(t, { packetId: "still-draft", status: "draft" });
    await seedPacket(t, {
      packetId: "ja-deck-pack-animals",
      language: "ja",
      status: "published",
      publishedAt: Date.now(),
      entries: [
        { kind: "card", language: "ja", payload: { front: "猫", back: "cat" } },
        { kind: "card", language: "ja", payload: { front: "海", back: "sea" } },
      ],
    });

    const bundles = await t.query(internal.packets.exportPublishedPackets, {});
    expect(bundles.map((b) => b.packetId)).toEqual(["ja-deck-pack-animals"]);
    const b = bundles[0]!;
    expect(b.manifest.kind).toBe("deck-pack");
    expect(b.manifest.status).toBe("approved");
    expect(b.manifest.payload.count).toBe(2); // exporter only adds checksums
    expect(Object.keys(b.payloadFiles)).toEqual(["deck.json"]);
  });
});

describe("packets.ensureDemoDraftPacket (internal)", () => {
  test("fails helpfully when nothing eligible exists", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.packets.ensureDemoDraftPacket, {})).rejects.toThrow(
      /seedSampleSubmissions/,
    );
  });

  test("creates one draft from approved ko phrases, idempotently and non-destructively", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await t.run(async (ctx) => ctx.db.insert("users", {}));

    const approvedKo = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "phrase",
        language: "ko",
        payload: {
          text: "이거 주세요",
          english: "Please give me this one",
          romanization: "igeo juseyo",
        },
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    // noise that must be ignored: pending ko phrase, approved ja card
    await t.run(async (ctx) => {
      await ctx.db.insert("submissions", {
        submitterId,
        kind: "phrase",
        language: "ko",
        payload: { text: "안녕", english: "hello" },
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("submissions", {
        submitterId,
        kind: "card",
        language: "ja",
        payload: { front: "海", back: "sea" },
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const first = await t.mutation(internal.packets.ensureDemoDraftPacket, {});
    expect(first.created).toBe(true);

    const row = await t.run(async (ctx) => ctx.db.get(first.packetRowId));
    expect(row?.status).toBe("draft");
    expect(row?.packetId).toBe("ko-phrase-pack-demo-submissions");
    expect(row?.entries).toHaveLength(1);
    expect(row?.entries[0]!.sourceSubmissionId).toBe(approvedKo);

    // non-destructive: the submission stays unstamped for the real flow
    const sub = await t.run(async (ctx) => ctx.db.get(approvedKo));
    expect(sub?.publishedPacketId).toBeUndefined();

    // idempotent: a second call returns the same row untouched
    const second = await t.mutation(internal.packets.ensureDemoDraftPacket, {});
    expect(second.created).toBe(false);
    expect(second.packetRowId).toBe(first.packetRowId);

    // and the demo packet previews through the public builder
    const { asModerator } = await seedModerator(t);
    const preview = await asModerator.query(api.packets.buildPacketManifest, {
      packetId: "ko-phrase-pack-demo-submissions",
    });
    expect(preview.manifest.provenance.submission_ids).toEqual([approvedKo]);
  });
});
