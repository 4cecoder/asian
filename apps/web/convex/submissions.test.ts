import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", {}));
}

async function seedModerator(t: ReturnType<typeof convexTest>) {
  const userId = await seedUser(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("userRoles", { userId, role: "moderator" });
  });
  const asModerator = t.withIdentity({ subject: userId });
  return { userId, asModerator };
}

describe("submissions.submitContent", () => {
  test("rejects anonymous calls", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.submissions.submitContent, {
        kind: "card",
        language: "ja",
        payload: { front: "犬", back: "dog" },
      }),
    ).rejects.toThrow("Must be signed in");
  });

  test("a valid submission lands as pending with timestamps", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const asSubmitter = t.withIdentity({ subject: submitterId });

    const id = await asSubmitter.mutation(api.submissions.submitContent, {
      kind: "phrase",
      language: "ko",
      payload: {
        text: "감사합니다",
        english: "Thank you",
        romanization: "gamsahamnida",
      },
    });

    const stored = await t.run(async (ctx) => ctx.db.get(id));
    expect(stored?.status).toBe("pending");
    expect(stored?.submitterId).toBe(submitterId);
    expect(stored?.language).toBe("ko");
    expect(typeof stored?.createdAt).toBe("number");
  });

  test("payload shape is validated per kind at the boundary", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const asSubmitter = t.withIdentity({ subject: submitterId });

    // card payload missing 'back' — fails the args validator. The bad
    // shape is deliberately mistyped so tsc can't call it valid.
    const missingBack = { front: "犬" } as unknown as { front: string; back: string };
    await expect(
      asSubmitter.mutation(api.submissions.submitContent, {
        kind: "card",
        language: "ja",
        payload: missingBack,
      }),
    ).rejects.toThrow();

    // right fields, wrong kind
    await expect(
      asSubmitter.mutation(api.submissions.submitContent, {
        kind: "phrase",
        language: "ja",
        payload: { front: "犬", back: "dog" },
      }),
    ).rejects.toThrow('Invalid payload for kind "phrase"');
  });

  test("enforces the daily submission rate limit", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const asSubmitter = t.withIdentity({ subject: submitterId });

    for (let i = 0; i < 10; i++) {
      await asSubmitter.mutation(api.submissions.submitContent, {
        kind: "card",
        language: "zh",
        payload: { front: `词${i}`, back: `word ${i}` },
      });
    }
    await expect(
      asSubmitter.mutation(api.submissions.submitContent, {
        kind: "card",
        language: "zh",
        payload: { front: "第十一", back: "eleventh" },
      }),
    ).rejects.toThrow("rate limit");
  });
});

describe("submissions.mySubmissions", () => {
  test("only shows the caller's own submissions, newest first", async () => {
    const t = convexTest(schema, modules);
    const a = await seedUser(t);
    const b = await seedUser(t);

    await t.withIdentity({ subject: a }).mutation(api.submissions.submitContent, {
      kind: "card",
      language: "ja",
      payload: { front: "犬", back: "dog" },
    });
    await t.run(async (ctx) => {
      // second submission for user a — inserted directly to control ordering
      await ctx.db.insert("submissions", {
        submitterId: a,
        kind: "phrase",
        language: "ko",
        payload: { text: "안녕", english: "hello" },
        status: "pending",
        createdAt: Date.now() + 1000,
        updatedAt: Date.now() + 1000,
      });
      // someone else's submission — must never leak into a's list
      await ctx.db.insert("submissions", {
        submitterId: b,
        kind: "phrase",
        language: "zh",
        payload: { text: "你好", english: "hello" },
        status: "pending",
        createdAt: Date.now() + 2000,
        updatedAt: Date.now() + 2000,
      });
    });

    const mine = await t.withIdentity({ subject: a }).query(api.submissions.mySubmissions, {});
    expect(mine).toHaveLength(2);
    expect(mine.every((s) => s.submitterId === a)).toBe(true);
    expect(mine[0].kind).toBe("phrase"); // newest first
  });
});

describe("moderation", () => {
  test("queue and review both require the moderator role", async () => {
    const t = convexTest(schema, modules);
    const plainUserId = await seedUser(t);
    const asPlain = t.withIdentity({ subject: plainUserId });

    await expect(
      asPlain.query(api.submissions.moderationQueue, { status: "pending" }),
    ).rejects.toThrow("Moderator role required");
    await expect(
      asPlain.query(api.submissions.moderationQueue, { status: "needsReview" }),
    ).rejects.toThrow("Moderator role required");

    const submissionId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId: plainUserId,
        kind: "phrase",
        language: "ko",
        payload: { text: "안녕", english: "hello" },
        status: "needsReview",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      asPlain.mutation(api.submissions.reviewSubmission, {
        submissionId,
        decision: "approved",
      }),
    ).rejects.toThrow("Moderator role required");
  });

  test("anonymous users can't even see the queue", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.submissions.moderationQueue, { status: "pending" })).rejects.toThrow(
      "Must be signed in",
    );
  });

  test("a moderator sees queued items and can approve/reject with notes", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const { asModerator } = await seedModerator(t);

    const pendingId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "exampleSentence",
        language: "ja",
        payload: { sentence: "本を読みます。", english: "I read a book." },
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const flaggedId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "phrase",
        language: "ko",
        payload: { text: "천만에요", english: "You're welcome" },
        status: "needsReview",
        aiNotes: "Register check requested.",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const queue = await asModerator.query(api.submissions.moderationQueue, {
      status: "needsReview",
    });
    expect(queue.map((s) => s._id)).toEqual([flaggedId]);

    await asModerator.mutation(api.submissions.reviewSubmission, {
      submissionId: flaggedId,
      decision: "approved",
      reviewerNotes: "Natural phrase.",
    });
    const approved = await t.run(async (ctx) => ctx.db.get(flaggedId));
    expect(approved?.status).toBe("approved");
    expect(approved?.reviewerNotes).toBe("Natural phrase.");

    await asModerator.mutation(api.submissions.reviewSubmission, {
      submissionId: pendingId,
      decision: "rejected",
      reviewerNotes: "Already covered by an existing entry.",
    });
    expect((await t.run(async (ctx) => ctx.db.get(pendingId)))?.status).toBe("rejected");
  });

  test("already-reviewed submissions can't be reviewed twice", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const { asModerator } = await seedModerator(t);

    const approvedId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "card",
        language: "zh",
        payload: { front: "你好", back: "hello" },
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      asModerator.mutation(api.submissions.reviewSubmission, {
        submissionId: approvedId,
        decision: "rejected",
      }),
    ).rejects.toThrow("can be reviewed");
  });
});

describe("AI processing transitions (internal)", () => {
  test("pending -> processing -> needsReview round trip with refined payload", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const submissionId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "phrase",
        language: "ko",
        payload: { text: "안녕하세요", english: "hello" },
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await t.mutation(internal.submissions.beginProcessing, { submissionId });
    expect((await t.run(async (ctx) => ctx.db.get(submissionId)))?.status).toBe("processing");

    const refined = {
      text: "안녕하세요",
      english: "hello",
      romanization: "annyeonghaseyo",
      situation: "greetings",
    };
    await t.mutation(internal.submissions.finishProcessing, {
      submissionId,
      outcome: "needsReview",
      aiNotes: "Added romanization and situation tag.",
      refinedPayload: refined,
    });

    const done = await t.run(async (ctx) => ctx.db.get(submissionId));
    expect(done?.status).toBe("needsReview");
    expect(done?.aiNotes).toContain("romanization");
    expect(done?.payload).toEqual(refined);
  });

  test("double-claiming is rejected so two workers can't race one submission", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const processingId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "card",
        language: "ja",
        payload: { front: "海", back: "sea" },
        status: "processing",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      t.mutation(internal.submissions.beginProcessing, { submissionId: processingId }),
    ).rejects.toThrow('"pending"');
  });

  test("the stale sweep flags old pending items and releases stuck processing ones", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const now = Date.now();
    const oldPendingId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "phrase",
        language: "zh",
        payload: { text: "谢谢", english: "thank you" },
        status: "pending",
        createdAt: now - 25 * 60 * 60 * 1000, // older than the 24h threshold
        updatedAt: now,
      }),
    );
    const freshPendingId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "phrase",
        language: "zh",
        payload: { text: "不客气", english: "you're welcome" },
        status: "pending",
        createdAt: now - 3_600_000, // fresh — must not be touched
        updatedAt: now,
      }),
    );
    const stuckId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "card",
        language: "ja",
        payload: { front: "山", back: "mountain" },
        status: "processing",
        aiNotes: "Worker claimed this 7h ago and died.",
        createdAt: now - 7 * 60 * 60 * 1000,
        updatedAt: now,
      }),
    );

    const result = await t.mutation(internal.submissions.sweepStaleSubmissions, {});
    expect(result).toEqual({ flagged: 1, released: 1 });

    expect((await t.run(async (ctx) => ctx.db.get(oldPendingId)))?.status).toBe("needsReview");
    expect((await t.run(async (ctx) => ctx.db.get(freshPendingId)))?.status).toBe("pending");
    expect((await t.run(async (ctx) => ctx.db.get(stuckId)))?.status).toBe("pending");
  });
});

describe("publishContentPacket", () => {
  test("packs approved same-language submissions into a published packet", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const { asModerator } = await seedModerator(t);

    const ko1 = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "phrase",
        language: "ko",
        payload: { text: "이거 주세요", english: "Please give me this one" },
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    const jaOne = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "card",
        language: "ja",
        payload: { front: "海", back: "sea" },
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const packetRowId = await asModerator.mutation(api.submissions.publishContentPacket, {
      packetId: "ko-core-001",
      language: "ko",
      version: 1,
      submissionIds: [ko1],
      status: "published",
    });

    const packet = await t.run(async (ctx) => ctx.db.get(packetRowId));
    expect(packet?.status).toBe("published");
    expect(packet?.publishedAt).toBeDefined();
    expect(packet?.entries).toHaveLength(1);
    expect(packet?.entries[0].sourceSubmissionId).toBe(ko1);

    // consumed submissions are stamped so they can't ship twice
    const stamped = await t.run(async (ctx) => ctx.db.get(ko1));
    expect(stamped?.publishedPacketId).toBe(packetRowId);

    // cross-language mixing is blocked
    await expect(
      asModerator.mutation(api.submissions.publishContentPacket, {
        packetId: "ko-core-002",
        language: "ko",
        version: 2,
        submissionIds: [jaOne],
        status: "published",
      }),
    ).rejects.toThrow("not ko");
  });

  test("requires moderator role, non-empty list, and only approved submissions", async () => {
    const t = convexTest(schema, modules);
    const submitterId = await seedUser(t);
    const asSubmitter = t.withIdentity({ subject: submitterId });

    const pendingId = await t.run(async (ctx) =>
      ctx.db.insert("submissions", {
        submitterId,
        kind: "phrase",
        language: "ko",
        payload: { text: "감사합니다", english: "Thank you" },
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      asSubmitter.mutation(api.submissions.publishContentPacket, {
        packetId: "ko-x",
        language: "ko",
        version: 1,
        submissionIds: [pendingId],
        status: "published",
      }),
    ).rejects.toThrow("Moderator role required");

    const { asModerator } = await seedModerator(t);
    await expect(
      asModerator.mutation(api.submissions.publishContentPacket, {
        packetId: "ko-empty",
        language: "ko",
        version: 1,
        submissionIds: [],
        status: "published",
      }),
    ).rejects.toThrow("at least one submission");
    await expect(
      asModerator.mutation(api.submissions.publishContentPacket, {
        packetId: "ko-pending",
        language: "ko",
        version: 1,
        submissionIds: [pendingId],
        status: "draft",
      }),
    ).rejects.toThrow("not approved");
  });
});
