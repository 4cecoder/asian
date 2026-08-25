"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";

import type { CardDoc } from "./useCardCatalog";

type DeckCardsLoaderProps = {
  deckId: CardDoc["deckId"];
  onCards: (deckId: CardDoc["deckId"], cards: ReadonlyArray<CardDoc> | undefined) => void;
};

/**
 * Subscribes to one deck's cards and reports the result (or `undefined`
 * while loading) up to the catalog. Renders nothing.
 */
export function DeckCardsLoader({ deckId, onCards }: DeckCardsLoaderProps) {
  const cards = useQuery(api.cards.listByDeck, { deckId });

  useEffect(() => {
    onCards(deckId, cards);
  }, [deckId, cards, onCards]);

  return null;
}
