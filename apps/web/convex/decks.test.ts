import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", {}));
}

describe("decks", () => {
  test("create requires sign-in", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.decks.create, { title: "N5 Vocab", language: "ja", visibility: "public" }),
    ).rejects.toThrow("Must be signed in");
  });

  test("create + get round-trips a public deck for anyone", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const asUser = t.withIdentity({ subject: userId });

    const deckId = await asUser.mutation(api.decks.create, {
      title: "N5 Vocab",
      language: "ja",
      visibility: "public",
    });

    const deck = await t.query(api.decks.get, { deckId });
    expect(deck?.title).toBe("N5 Vocab");
    expect(deck?.cardCount).toBe(0);
  });

  test("a private deck is invisible to other users and anonymous callers", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t);
    const otherId = await seedUser(t);

    const deckId = await t.withIdentity({ subject: ownerId }).mutation(api.decks.create, {
      title: "My private deck",
      language: "ko",
      visibility: "private",
    });

    expect(await t.query(api.decks.get, { deckId })).toBeNull();
    expect(await t.withIdentity({ subject: otherId }).query(api.decks.get, { deckId })).toBeNull();
    expect(
      (await t.withIdentity({ subject: ownerId }).query(api.decks.get, { deckId }))?.title,
    ).toBe("My private deck");
  });

  test("list merges public decks with the caller's own private ones", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t);
    const otherId = await seedUser(t);
    const asOwner = t.withIdentity({ subject: ownerId });

    await t.withIdentity({ subject: otherId }).mutation(api.decks.create, {
      title: "Public JA deck",
      language: "ja",
      visibility: "public",
    });
    await asOwner.mutation(api.decks.create, {
      title: "My private deck",
      language: "ja",
      visibility: "private",
    });

    const decks = await asOwner.query(api.decks.list, { language: "ja" });
    expect(decks.map((d) => d.title).sort()).toEqual(["My private deck", "Public JA deck"]);

    const anonDecks = await t.query(api.decks.list, { language: "ja" });
    expect(anonDecks.map((d) => d.title)).toEqual(["Public JA deck"]);
  });
});
