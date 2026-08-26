import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedUser(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => ctx.db.insert("users", {}));
}

/** A public deck owned by a fresh user, with n cards created through the real mutation. */
async function seedDeckWithCards(t: ReturnType<typeof convexTest>, cardCount: number) {
  const ownerId = await seedUser(t);
  const asOwner = t.withIdentity({ subject: ownerId });
  const deckId = await asOwner.mutation(api.decks.create, {
    title: "Deck",
    language: "ja",
    visibility: "public",
  });
  const cardIds: Id<"cards">[] = [];
  for (let i = 0; i < cardCount; i++) {
    cardIds.push(
      await asOwner.mutation(api.cards.create, {
        deckId,
        front: `front ${i}`,
        back: `back ${i}`,
      }),
    );
  }
  return { asOwner, deckId, cardIds };
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

describe("decks.deckProgress", () => {
  test("rejects anonymous callers", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t);
    const deckId = await t.withIdentity({ subject: userId }).mutation(api.decks.create, {
      title: "N5 Vocab",
      language: "ja",
      visibility: "public",
    });

    await expect(t.query(api.decks.deckProgress, { deckId })).rejects.toThrow("Must be signed in");
  });

  test("a foreign private deck reports 'Deck not found', the owner's doesn't", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t);
    const otherId = await seedUser(t);
    const asOwner = t.withIdentity({ subject: ownerId });

    const privateDeckId = await asOwner.mutation(api.decks.create, {
      title: "Private stash",
      language: "ko",
      visibility: "private",
    });

    // Same non-leaking message decks.get gives for invisible private decks.
    await expect(
      t.withIdentity({ subject: otherId }).query(api.decks.deckProgress, {
        deckId: privateDeckId,
      }),
    ).rejects.toThrow("Deck not found.");

    // The owner can see their own private deck's progress.
    expect(await asOwner.query(api.decks.deckProgress, { deckId: privateDeckId })).toEqual({
      total: 0,
      due: 0,
      reviewed: 0,
    });
  });

  test("cards without SRS state count toward total only", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t);
    const asOwner = t.withIdentity({ subject: ownerId });

    const deckId = await asOwner.mutation(api.decks.create, {
      title: "Fresh deck",
      language: "ja",
      visibility: "public",
    });
    await asOwner.mutation(api.cards.create, { deckId, front: "犬", back: "dog" });
    await asOwner.mutation(api.cards.create, { deckId, front: "猫", back: "cat" });

    expect(await asOwner.query(api.decks.deckProgress, { deckId })).toEqual({
      total: 2,
      due: 0,
      reviewed: 0,
    });
  });

  test("'good' pushes out of due, 'again' stays due; reviewed counts distinct cards", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, deckId, cardIds } = await seedDeckWithCards(t, 4);

    // Two scheduled into the future, one due immediately, one never reviewed.
    await asOwner.mutation(api.srs.recordReview, { cardId: cardIds[0]!, rating: "good" });
    await asOwner.mutation(api.srs.recordReview, { cardId: cardIds[1]!, rating: "good" });
    await asOwner.mutation(api.srs.recordReview, { cardId: cardIds[2]!, rating: "again" });

    expect(await asOwner.query(api.decks.deckProgress, { deckId })).toEqual({
      total: 4,
      due: 1, // only the 'again' card has dueAt <= now
      reviewed: 3,
    });
  });

  test("progress is scoped to the caller and to this deck's cards", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t);
    const otherId = await seedUser(t);
    const asOwner = t.withIdentity({ subject: ownerId });
    const asOther = t.withIdentity({ subject: otherId });

    const deckId = await asOwner.mutation(api.decks.create, {
      title: "Shared JA deck",
      language: "ja",
      visibility: "public",
    });
    const cardA = await asOwner.mutation(api.cards.create, { deckId, front: "犬", back: "dog" });
    const cardB = await asOwner.mutation(api.cards.create, { deckId, front: "猫", back: "cat" });

    // A second deck whose reviews must not leak into deckId's numbers.
    const otherDeckId = await asOwner.mutation(api.decks.create, {
      title: "Unrelated deck",
      language: "ko",
      visibility: "private",
    });
    const unrelatedCard = await asOwner.mutation(api.cards.create, {
      deckId: otherDeckId,
      front: "안녕",
      back: "hello",
    });

    // Owner reviews both shared cards (one still-due) plus the unrelated one.
    await asOwner.mutation(api.srs.recordReview, { cardId: cardA, rating: "good" });
    await asOwner.mutation(api.srs.recordReview, { cardId: cardB, rating: "again" });
    await asOwner.mutation(api.srs.recordReview, { cardId: unrelatedCard, rating: "good" });

    expect(await asOwner.query(api.decks.deckProgress, { deckId })).toEqual({
      total: 2,
      due: 1,
      reviewed: 2, // unrelatedCard's state row is excluded
    });

    // Another user's view of the same public deck ignores the owner's states.
    expect(await asOther.query(api.decks.deckProgress, { deckId })).toEqual({
      total: 2,
      due: 0,
      reviewed: 0,
    });
  });
});
