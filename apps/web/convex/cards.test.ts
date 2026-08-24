import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", {}));
}

describe("cards", () => {
  test("only the deck owner can add cards, and cardCount tracks it", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t);
    const otherId = await seedUser(t);
    const asOwner = t.withIdentity({ subject: ownerId });

    const deckId = await asOwner.mutation(api.decks.create, {
      title: "N5 Vocab",
      language: "ja",
      visibility: "public",
    });

    await expect(
      t.withIdentity({ subject: otherId }).mutation(api.cards.create, {
        deckId,
        front: "犬",
        back: "dog",
      }),
    ).rejects.toThrow("Only the deck owner");

    await asOwner.mutation(api.cards.create, { deckId, front: "犬", back: "dog" });
    await asOwner.mutation(api.cards.create, { deckId, front: "猫", back: "cat" });

    const deck = await t.query(api.decks.get, { deckId });
    expect(deck?.cardCount).toBe(2);

    const cards = await t.query(api.cards.listByDeck, { deckId });
    expect(cards.map((c) => c.front).sort()).toEqual(["犬", "猫"]);
    expect(cards.every((c) => c.language === "ja")).toBe(true); // inherited from the deck, not passed in
  });

  test("listByDeck hides a private deck's cards from non-owners", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t);
    const otherId = await seedUser(t);
    const asOwner = t.withIdentity({ subject: ownerId });

    const deckId = await asOwner.mutation(api.decks.create, {
      title: "Private",
      language: "ko",
      visibility: "private",
    });
    await asOwner.mutation(api.cards.create, { deckId, front: "안녕", back: "hello" });

    expect(
      await t.withIdentity({ subject: otherId }).query(api.cards.listByDeck, { deckId }),
    ).toEqual([]);
    expect(await t.query(api.cards.listByDeck, { deckId })).toEqual([]); // anonymous
    expect((await asOwner.query(api.cards.listByDeck, { deckId })).length).toBe(1);
  });
});
