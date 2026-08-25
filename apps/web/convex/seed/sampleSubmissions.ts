import { internalMutation } from "../_generated/server";

/**
 * Synthetic seed submissions for the community-content ingestion pipeline
 * (CONTRIBUTING.md "Seed and fixture data" requirement). All content is
 * invented for tests/dev — no real user data, no scraped third-party
 * content. Covers every submission status across all three priority
 * languages, plus the role row a moderator needs.
 *
 * Run against a dev deployment with:
 *   bunx convex run seed/sampleSubmissions:seedSampleSubmissions
 */
export const seedSampleSubmissions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const submitterId = await ctx.db.insert("users", {});
    const moderatorUserId = await ctx.db.insert("users", {});
    await ctx.db.insert("userRoles", { userId: moderatorUserId, role: "moderator" });

    // pending — fresh queue entries awaiting refinement
    await ctx.db.insert("submissions", {
      submitterId,
      kind: "phrase",
      language: "ko",
      payload: {
        text: "지하철역이 어디예요?",
        english: "Where is the subway station?",
        romanization: "jihacheollyeogi eodiyeyo?",
        situation: "directions",
      },
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("submissions", {
      submitterId,
      kind: "card",
      language: "ja",
      payload: { front: "猫", back: "cat", notes: "common N5 noun" },
      status: "pending",
      sourceUrl: "https://example.com/ja-notes/lesson-3",
      createdAt: now,
      updatedAt: now,
    });

    // processing — claimed by (future) Python refinement worker
    const processingId = await ctx.db.insert("submissions", {
      submitterId,
      kind: "correction",
      language: "zh",
      payload: {
        targetType: "dictionaryEntry",
        targetId: "seed-dictionary-entry-1",
        field: "reading",
        proposedValue: "nǐ hǎo",
        reason: "tone marks missing in current entry",
      },
      status: "processing",
      aiNotes: "Worker claimed at seed time.",
      createdAt: now - 60_000,
      updatedAt: now,
    });

    // needsReview — AI refined but flagged for human eyes
    await ctx.db.insert("submissions", {
      submitterId,
      kind: "exampleSentence",
      language: "ja",
      payload: {
        sentence: "毎朝コーヒーを飲みます。",
        english: "I drink coffee every morning.",
        targetHeadword: "飲む",
      },
      status: "needsReview",
      aiNotes:
        "Sentence is natural; politeness register mixed (です form absent) — human check requested.",
      createdAt: now - 3_600_000,
      updatedAt: now,
    });

    // approved — ready to be packed into a published contentPacket
    await ctx.db.insert("submissions", {
      submitterId,
      kind: "phrase",
      language: "ko",
      payload: {
        text: "이거 주세요",
        english: "Please give me this one",
        romanization: "igeo juseyo",
        situation: "shopping",
      },
      status: "approved",
      reviewerNotes: "Clean submission, approved as-is.",
      aiNotes: "Normalized spacing; added romanization.",
      createdAt: now - 86_400_000,
      updatedAt: now,
    });

    await ctx.db.insert("submissions", {
      submitterId,
      kind: "situationPack",
      language: "zh",
      payload: {
        situation: "restaurant",
        phrases: [
          { text: "菜单，谢谢", english: "The menu, please", romanization: "càidān, xièxie" },
          { text: "买单", english: "Check, please", romanization: "mǎidān" },
        ],
      },
      status: "approved",
      reviewerNotes: "Two clean restaurant phrases.",
      createdAt: now - 86_400_000,
      updatedAt: now,
    });

    // rejected — with reviewer context
    await ctx.db.insert("submissions", {
      submitterId,
      kind: "card",
      language: "ja",
      payload: { front: "", back: "" },
      status: "rejected",
      reviewerNotes: "Empty front/back fields; nothing to refine.",
      createdAt: now - 172_800_000,
      updatedAt: now,
    });

    return {
      success: true,
      submitterId,
      processingSubmissionId: processingId,
      moderatorUserId,
    };
  },
});
