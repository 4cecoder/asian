"use client";

import Link from "next/link";

import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";

import { CardList } from "./CardList";
import { DeckProgressPanel } from "./DeckProgress";
import { LANGUAGE_LABELS } from "./languages";

type DeckDetailProps = {
  deckId: string;
};

// Convex document IDs are 32-char lowercase base32. Checking the shape
// before subscribing keeps a garbage URL from throwing inside the query.
const DECK_ID_PATTERN = /^[a-z0-9]{32}$/;

/** Deck detail view: deck metadata via `decks.get`, cards via `cards.listByDeck`. */
export function DeckDetail({ deckId }: DeckDetailProps) {
  const isValidId = DECK_ID_PATTERN.test(deckId);
  const typedDeckId = deckId as Id<"decks">;

  const deck = useQuery(api.decks.get, isValidId ? { deckId: typedDeckId } : "skip");
  const cards = useQuery(api.cards.listByDeck, isValidId ? { deckId: typedDeckId } : "skip");

  if (!isValidId || deck === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deck not found</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            This deck doesn’t exist or isn’t visible to you.
          </p>
          <Button variant="outline" render={<Link href="/decks" />}>
            Back to decks
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (deck === undefined || cards === undefined) {
    return (
      <div aria-busy="true">
        <PageHeader title="Loading…" />
        <Card>
          <CardContent className="space-y-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className="bg-muted block h-4 animate-pulse rounded"
              />
            ))}
          </CardContent>
        </Card>
        <p className="sr-only" role="status">
          Loading deck…
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={deck.title}
        description={`${deck.cardCount} ${deck.cardCount === 1 ? "card" : "cards"} in this deck`}
        actions={
          deck.cardCount > 0 ? (
            <Button render={<Link href={`/review?deck=${deck._id}`} />}>Start review</Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{LANGUAGE_LABELS[deck.language]}</Badge>
        {deck.visibility === "private" ? <Badge variant="outline">Private</Badge> : null}
      </div>

      <DeckProgressPanel deckId={deck._id} />

      <h2 className="font-heading mb-3 text-lg font-semibold tracking-tight">Cards</h2>
      <CardList cards={cards} />
    </div>
  );
}
