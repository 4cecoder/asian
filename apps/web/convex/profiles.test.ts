import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedUser(t: ReturnType<typeof convexTest>, email?: string) {
  return await t.run(async (ctx) => ctx.db.insert("users", email ? { email } : {}));
}

describe("profiles.updateProfile get-or-create", () => {
  test("the first save creates one row; later saves reuse it (idempotent)", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const asUser = t.withIdentity({ subject: userId });

    const created = await asUser.mutation(api.profiles.updateProfile, { language: "ja" });
    expect(created?.language).toBe("ja");
    expect(created?.goal).toBeUndefined();

    // Second save must patch the SAME row, preserving createdAt.
    const updated = await asUser.mutation(api.profiles.updateProfile, { goal: "travel" });
    expect(updated?._id).toBe(created?._id);
    expect(updated?.createdAt).toBe(created?.createdAt);
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(created!.updatedAt);
    expect(updated?.language).toBe("ja");
    expect(updated?.goal).toBe("travel");

    const rows = await t.run(async (ctx) => ctx.db.query("profiles").collect());
    expect(rows).toHaveLength(1);
  });

  test("omitted args leave stored values untouched", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const asUser = t.withIdentity({ subject: userId });

    await asUser.mutation(api.profiles.updateProfile, {
      displayName: "Alice",
      language: "ko",
      goal: "work",
    });
    const touched = await asUser.mutation(api.profiles.updateProfile, {});
    expect(touched?.displayName).toBe("Alice");
    expect(touched?.language).toBe("ko");
    expect(touched?.goal).toBe("work");
  });

  test("displayName is trimmed on write and cleared by an empty string", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const asUser = t.withIdentity({ subject: userId });

    const named = await asUser.mutation(api.profiles.updateProfile, { displayName: "  Alice  " });
    expect(named?.displayName).toBe("Alice");

    const cleared = await asUser.mutation(api.profiles.updateProfile, { displayName: "   " });
    expect(cleared?.displayName).toBeUndefined();
  });

  test("over-long display names are rejected", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const asUser = t.withIdentity({ subject: userId });

    await expect(
      asUser.mutation(api.profiles.updateProfile, { displayName: "a".repeat(81) }),
    ).rejects.toThrow("80 characters or fewer");
  });
});

describe("profiles ownership", () => {
  test("anonymous callers are rejected on both functions", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.profiles.updateProfile, { language: "ja" })).rejects.toThrow(
      "Must be signed in",
    );
    await expect(t.query(api.profiles.myProfile, {})).rejects.toThrow("Must be signed in");
  });

  test("one user can never read or modify another user's profile row", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t, "alice@e2e.asian.test");
    const malloryId = await seedUser(t, "mallory@e2e.asian.test");

    const asAlice = t.withIdentity({ subject: aliceId });
    await asAlice.mutation(api.profiles.updateProfile, {
      displayName: "Alice",
      language: "zh",
      goal: "family",
    });

    // Snapshot Alice's exact row to compare byte-for-byte afterwards.
    const aliceRowBefore = await t.run(async (ctx) =>
      ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", aliceId))
        .first(),
    );

    // Mallory sees her own empty view — never Alice's values.
    const malloryView = await t
      .withIdentity({ subject: malloryId })
      .query(api.profiles.myProfile, {});
    expect(malloryView.displayName).toBeNull();
    expect(malloryView.language).toBeNull();
    expect(malloryView.email).toBe("mallory@e2e.asian.test");

    // Mallory's writes create a SEPARATE row; Alice's is untouched.
    await t.withIdentity({ subject: malloryId }).mutation(api.profiles.updateProfile, {
      displayName: "Mallory",
    });

    const rows = await t.run(async (ctx) => ctx.db.query("profiles").collect());
    expect(rows).toHaveLength(2);

    const aliceRowAfter = await t.run(async (ctx) =>
      ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", aliceId))
        .first(),
    );
    expect(aliceRowAfter).toEqual(aliceRowBefore);

    const malloryRow = await t.run(async (ctx) =>
      ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", malloryId))
        .first(),
    );
    expect(malloryRow?.displayName).toBe("Mallory");
    expect(malloryRow?.language).toBeUndefined();
  });
});

describe("profiles.myProfile view", () => {
  test("joins the account email and counts only the caller's own decks", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await seedUser(t, "alice@e2e.asian.test");
    const otherId = await seedUser(t, "other@e2e.asian.test");

    // Two decks owned by Alice (private included), one public deck owned
    // by someone else that must NOT inflate her count.
    await t.run(async (ctx) => {
      await ctx.db.insert("decks", {
        title: "Mine public",
        language: "ja",
        ownerId: aliceId,
        source: "community",
        visibility: "public",
        cardCount: 0,
      });
      await ctx.db.insert("decks", {
        title: "Mine private",
        language: "ja",
        ownerId: aliceId,
        source: "community",
        visibility: "private",
        cardCount: 0,
      });
      await ctx.db.insert("decks", {
        title: "Someone else's public deck",
        language: "ko",
        ownerId: otherId,
        source: "community",
        visibility: "public",
        cardCount: 0,
      });
    });

    const view = await t.withIdentity({ subject: aliceId }).query(api.profiles.myProfile, {});
    expect(view.email).toBe("alice@e2e.asian.test");
    expect(view.deckCount).toBe(2);
    expect(view.language).toBeNull(); // nothing saved yet
  });
});
