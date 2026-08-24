import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.*s");

async function seedUserAndCard(t: ReturnType<typeof convexTest>) {
  const ownerId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const asOwner = t.withIdentity({ subject: ownerId });
  const deckId = await asOwner.mutation(api.decks.create, {
    title: "Deck",
    language: "ja",
    visibility: "public",
  });
  const cardId = await asOwner.mutation(api.cards.create, { deckId, front: "犬", back: "dog" });
  return { asOwner, cardId };
}

describe("srs.recordReview", () => {
  test("rejects anonymous calls", async () => {
    const t = convexTest(schema, modules);
    const { cardId } = await seedUserAndCard(t);
    await expect(t.mutation(api.srs.recordReview, { cardId, rating: "good" })).rejects.toThrow(
      "Must be signed in",
    );
  });

  test("first review creates state; a 'good' rating pushes dueAt into the future", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, cardId } = await seedUserAndCard(t);

    const before = Date.now();
    await asOwner.mutation(api.srs.recordReview, { cardId, rating: "good" });

    const due = await asOwner.query(api.srs.dueToday, {});
    expect(due).toEqual([]); // not due today — it's scheduled ~1 day out

    const [state] = await t.run(async (ctx) => ctx.db.query("srsCardState").collect());
    expect(state?.state).toBe("review");
    expect(state!.dueAt).toBeGreaterThan(before);
  });

  test("an 'again' rating keeps the card due immediately, and a second review updates the same row", async () => {
    const t = convexTest(schema, modules);
    const { asOwner, cardId } = await seedUserAndCard(t);

    await asOwner.mutation(api.srs.recordReview, { cardId, rating: "again" });
    const dueAfterFirst = await asOwner.query(api.srs.dueToday, {});
    expect(dueAfterFirst.length).toBe(1);
    expect(dueAfterFirst[0].state).toBe("relearning");

    await asOwner.mutation(api.srs.recordReview, { cardId, rating: "good" });
    const dueAfterSecond = await asOwner.query(api.srs.dueToday, {});
    expect(dueAfterSecond).toEqual([]); // rescheduled into the future, not a second row

    const allRows = await t.run(async (ctx) => ctx.db.query("srsCardState").collect());
    expect(allRows.length).toBe(1); // patched the existing row, didn't insert a duplicate
  });
});
