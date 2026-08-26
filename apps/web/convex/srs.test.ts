import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedUserAndDeck(t: ReturnType<typeof convexTest>) {
  const ownerId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const asOwner = t.withIdentity({ subject: ownerId });
  const deckId = await asOwner.mutation(api.decks.create, {
    title: "Deck",
    language: "ja",
    visibility: "public",
  });
  return { ownerId, asOwner, deckId };
}

describe("srs.recordReview", () => {
  test("rejects anonymous calls", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, deckId } = await seedUserAndDeck(t);
    const cardId = await asOwner.mutation(api.cards.create, { deckId, front: "犬", back: "dog" });
    await expect(t.mutation(api.srs.recordReview, { cardId, rating: "good" })).rejects.toThrow(
      "Must be signed in",
    );
  });

  test("first review creates full FSRS state; 'good' schedules into the future", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, deckId } = await seedUserAndDeck(t);
    const cardId = await asOwner.mutation(api.cards.create, { deckId, front: "犬", back: "dog" });

    const before = Date.now();
    await asOwner.mutation(api.srs.recordReview, { cardId, rating: "good" });

    const due = await asOwner.query(api.srs.dueToday, {});
    expect(due).toEqual([]); // scheduled days out by FSRS, not due today

    const allRows = await t.run(async (ctx) => ctx.db.query("srsCardState").collect());
    expect(allRows).toHaveLength(1);
    const state = allRows[0]!;
    expect(state.cardId).toBe(cardId);
    expect(state.state).toBe("review"); // first-touch good promotes to review
    expect(state.reps).toBe(1);
    expect(state.lapses).toBe(0);
    expect(state.stability).toBeGreaterThan(0);
    expect(state.difficulty).toBeGreaterThan(0);
    expect(state.dueAt).toBeGreaterThan(before);
    expect(state.lastReviewedAt).toBeGreaterThanOrEqual(before);
  });

  test("harder grades give longer intervals; only 'again' lapses and stays due today", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, deckId } = await seedUserAndDeck(t);

    const again = await asOwner.mutation(api.cards.create, { deckId, front: "一", back: "one" });
    const hard = await asOwner.mutation(api.cards.create, { deckId, front: "二", back: "two" });
    const good = await asOwner.mutation(api.cards.create, { deckId, front: "三", back: "three" });
    const easy = await asOwner.mutation(api.cards.create, { deckId, front: "四", back: "four" });

    await asOwner.mutation(api.srs.recordReview, { cardId: again, rating: "again" });
    await asOwner.mutation(api.srs.recordReview, { cardId: hard, rating: "hard" });
    await asOwner.mutation(api.srs.recordReview, { cardId: good, rating: "good" });
    await asOwner.mutation(api.srs.recordReview, { cardId: easy, rating: "easy" });

    const rows = await t.run(async (ctx) => ctx.db.query("srsCardState").collect());
    const byCard = new Map(rows.map((row) => [row.cardId, row]));

    // FSRS intervals grow monotonically with grade on a first review.
    const againDue = byCard.get(again)!.dueAt;
    const hardDue = byCard.get(hard)!.dueAt;
    const goodDue = byCard.get(good)!.dueAt;
    const easyDue = byCard.get(easy)!.dueAt;
    expect(hardDue).toBeGreaterThan(againDue);
    expect(goodDue).toBeGreaterThan(hardDue);
    expect(easyDue).toBeGreaterThan(goodDue);

    // Only failures count lapses. A first-rating Again is NOT one —
    // src/lib/srs/fsrs.ts initState follows the reference here.
    expect(byCard.get(again)!.lapses).toBe(0);
    expect(byCard.get(hard)!.lapses).toBe(0);
    expect(byCard.get(good)!.lapses).toBe(0);
    expect(byCard.get(easy)!.lapses).toBe(0);

    // The lapsed card is clamped to now so it sits in today's queue.
    expect(byCard.get(again)!.dueAt).toBeLessThanOrEqual(Date.now());
    const dueToday = await asOwner.query(api.srs.dueToday, {});
    expect(dueToday.map((row) => row.cardId)).toEqual([again]);
  });

  test("a repeat review patches the same row and advances the schedule", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, deckId } = await seedUserAndDeck(t);
    const cardId = await asOwner.mutation(api.cards.create, { deckId, front: "犬", back: "dog" });

    await asOwner.mutation(api.srs.recordReview, { cardId, rating: "good" });
    const first = (await t.run(async (ctx) => ctx.db.query("srsCardState").collect()))[0]!;

    await asOwner.mutation(api.srs.recordReview, { cardId, rating: "good" });
    const rows = await t.run(async (ctx) => ctx.db.query("srsCardState").collect());
    expect(rows).toHaveLength(1); // patched, not duplicated
    const second = rows[0]!;
    expect(second._id).toBe(first._id);
    expect(second.reps).toBe(first.reps! + 1);
    // Same-day reviews freeze memory state (FSRS-4.5 rule, enforced inside
    // next()): only reps and the due date — re-anchored at now — move.
    expect(second.stability).toBe(first.stability);
    expect(second.difficulty).toBe(first.difficulty);
    expect(second.dueAt).toBeGreaterThan(first.dueAt);
    expect(await asOwner.query(api.srs.dueToday, {})).toEqual([]);
  });

  test("'again' after established state demotes to relearning and re-enters today's queue", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, deckId } = await seedUserAndDeck(t);
    const cardId = await asOwner.mutation(api.cards.create, { deckId, front: "海", back: "sea" });

    await asOwner.mutation(api.srs.recordReview, { cardId, rating: "good" });
    await asOwner.mutation(api.srs.recordReview, { cardId, rating: "again" });

    const row = (await t.run(async (ctx) => ctx.db.query("srsCardState").collect()))[0]!;
    expect(row.state).toBe("relearning");
    expect(row.lapses).toBe(1);
    expect(row.reps).toBe(2);
    expect(row.stability).toBeGreaterThan(0);

    const dueToday = await asOwner.query(api.srs.dueToday, {});
    expect(dueToday.map((row) => row.cardId)).toEqual([cardId]);
  });

  test("placeholder-era rows migrate lazily on first touch — and only then", async () => {
    const t = convexTest(schema, modules);
    const { ownerId, asOwner, deckId } = await seedUserAndDeck(t);
    const migrated = await asOwner.mutation(api.cards.create, {
      deckId,
      front: "山",
      back: "mountain",
    });
    const untouched = await asOwner.mutation(api.cards.create, {
      deckId,
      front: "川",
      back: "river",
    });

    // Rows exactly as the old placeholder scheduler wrote them: no reps,
    // no lapses, constant stability/difficulty.
    await t.run(async (ctx) => {
      await ctx.db.insert("srsCardState", {
        userId: ownerId,
        cardId: migrated,
        state: "review",
        stability: 1,
        difficulty: 5,
        dueAt: Date.now() - 1000,
        lastReviewedAt: Date.now() - 2000,
      });
      await ctx.db.insert("srsCardState", {
        userId: ownerId,
        cardId: untouched,
        state: "relearning",
        stability: 1,
        difficulty: 5,
        dueAt: Date.now(),
      });
    });

    await asOwner.mutation(api.srs.recordReview, { cardId: migrated, rating: "good" });

    const rows = await t.run(async (ctx) => ctx.db.query("srsCardState").collect());
    expect(rows).toHaveLength(2); // migration patched in place

    const migratedRow = rows.find((row) => row.cardId === migrated)!;
    expect(migratedRow.reps).toBeDefined(); // now canonical FSRS shape
    expect(migratedRow.lapses).toBe(0);
    expect(migratedRow.stability).not.toBe(1); // placeholder constant replaced
    expect(migratedRow.difficulty).not.toBe(5);
    expect(migratedRow.dueAt).toBeGreaterThan(Date.now());

    const untouchedRow = rows.find((row) => row.cardId === untouched)!;
    expect(untouchedRow.reps).toBeUndefined(); // lazy: only touched rows migrate
    expect(untouchedRow.stability).toBe(1);
  });

  test("rejects reviews of cards that do not exist", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, deckId } = await seedUserAndDeck(t);
    const cardId = await asOwner.mutation(api.cards.create, { deckId, front: "空", back: "sky" });
    await t.run(async (ctx) => ctx.db.delete(cardId));

    await expect(
      asOwner.mutation(api.srs.recordReview, { cardId, rating: "good" }),
    ).rejects.toThrow("Card not found.");
  });
});

describe("srs.dueToday", () => {
  test("returns nothing for anonymous callers", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.srs.dueToday, {})).toEqual([]);
  });

  test("scopes to the caller, orders oldest due first, and excludes future-due cards", async () => {
    const t = convexTest(schema, modules);
    const userA = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const userB = await t.run(async (ctx) => ctx.db.insert("users", {}));
    const asA = t.withIdentity({ subject: userA });

    // User A owns the deck so they can create its cards.
    const deckId = await asA.mutation(api.decks.create, {
      title: "Deck",
      language: "ja",
      visibility: "public",
    });
    const older = await asA.mutation(api.cards.create, { deckId, front: "古", back: "old" });
    const newer = await asA.mutation(api.cards.create, { deckId, front: "新", back: "new" });
    const future = await asA.mutation(api.cards.create, { deckId, front: "先", back: "future" });
    const foreign = await asA.mutation(api.cards.create, { deckId, front: "他", back: "other" });

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("srsCardState", {
        userId: userA,
        cardId: older,
        state: "review",
        stability: 3,
        difficulty: 5,
        dueAt: now - 5000,
      });
      await ctx.db.insert("srsCardState", {
        userId: userA,
        cardId: newer,
        state: "review",
        stability: 3,
        difficulty: 5,
        dueAt: now - 1000,
      });
      await ctx.db.insert("srsCardState", {
        userId: userA,
        cardId: future,
        state: "review",
        stability: 7,
        difficulty: 5,
        dueAt: now + 60_000, // not yet due
      });
      await ctx.db.insert("srsCardState", {
        userId: userB,
        cardId: foreign,
        state: "review",
        stability: 3,
        difficulty: 5,
        dueAt: now - 9000, // someone else's due card must not leak
      });
    });

    const due = await asA.query(api.srs.dueToday, {});
    expect(due.map((row) => row.cardId)).toEqual([older, newer]); // ascending dueAt
  });
});
