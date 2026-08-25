"use client";

import { useCallback, useMemo, useState } from "react";

import type { FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";

export type DueState = FunctionReturnType<typeof api.srs.dueToday>[number];
export type CardDoc = FunctionReturnType<typeof api.cards.listByDeck>[number];
export type DeckDoc = FunctionReturnType<typeof api.decks.list>[number];
type CardId = CardDoc["_id"];
type DeckId = NonNullable<CardDoc["deckId"]>;

/** One reviewable card: SRS due state joined with its front/back content. */
export type ReviewItem = {
  cardId: CardId;
  front: string;
  back: string;
  notes: string | undefined;
  language: CardDoc["language"];
};

/**
 * Join due SRS states with card content. A due state whose card is missing
 * from the catalog (deleted, or in a deck we can't see) is skipped rather
 * than allowed to stall the session.
 */
export function buildQueue(
  dueStates: readonly DueState[],
  catalog: ReadonlyMap<CardId, CardDoc>,
): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const state of dueStates) {
    const card = catalog.get(state.cardId);
    if (!card) continue;
    items.push({
      cardId: state.cardId,
      front: card.front,
      back: card.back,
      notes: card.notes,
      language: card.language,
    });
  }
  return items;
}

/**
 * Client-side card catalog. `srs.dueToday` returns scheduling state only —
 * there is no deployed query that fetches cards by id (convex/ was
 * read-only when the review session was built), so content is assembled by
 * subscribing to every visible deck's cards and joining on `cardId`.
 * Temporary: replace with a `srs.dueTodayWithCards`-style join query or a
 * `cards.getByIds` query as soon as one exists.
 */
export function useCardCatalog() {
  // Per-deck subscription results; undefined value = still loading.
  const [cardsByDeck, setCardsByDeck] = useState<
    ReadonlyMap<DeckId, ReadonlyArray<CardDoc> | undefined>
  >(new Map());

  const registerCards = useCallback((deckId: DeckId, cards: ReadonlyArray<CardDoc> | undefined) => {
    setCardsByDeck((prev) => {
      if (prev.get(deckId) === cards) return prev; // no reactive change
      const next = new Map(prev);
      next.set(deckId, cards);
      return next;
    });
  }, []);

  return useMemo(() => {
    const byId = new Map<CardId, CardDoc>();
    for (const cards of cardsByDeck.values()) {
      if (!cards) continue;
      for (const card of cards) byId.set(card._id, card);
    }
    const isDeckLoaded = (deckId: DeckId) => cardsByDeck.get(deckId) !== undefined;

    return { byId, isDeckLoaded, registerCards };
  }, [cardsByDeck, registerCards]);
}
