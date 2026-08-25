"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { api } from "../../../convex/_generated/api";

import type { ReviewItem } from "./useCardCatalog";
import { buildQueue, useCardCatalog } from "./useCardCatalog";
import { DeckCardsLoader } from "./DeckCardsLoader";
import { useReviewSession } from "./useReviewSession";
import { ActiveReview } from "./ActiveReview";
import { ReviewSummary } from "./ReviewSummary";

/**
 * The review session orchestrator. Data comes straight from Convex's
 * reactive hooks (ADR 0004 — no extra cache layer on top); everything
 * session-shaped (current card, reveal state, tallies) is local state.
 *
 * Content join: srs.dueToday carries scheduling state only and no deployed
 * query fetches cards by id, so fronts/backs are assembled by subscribing
 * to each visible deck's cards and joining on cardId. Replace with a
 * server-side join query once convex/ allows adding one.
 */
export function SwipeDeck() {
  const dueStates = useQuery(api.srs.dueToday);
  const decks = useQuery(api.decks.list, {});
  const { byId, isDeckLoaded, registerCards } = useCardCatalog();

  const queue: ReviewItem[] = useMemo(
    () => (dueStates ? buildQueue(dueStates, byId) : []),
    [dueStates, byId],
  );

  const loading =
    dueStates === undefined ||
    decks === undefined ||
    !decks.every((deck) => isDeckLoaded(deck._id));

  // Hooks stay above any early return.
  const session = useReviewSession(queue);

  if (loading) {
    return (
      <p aria-busy="true" className="text-muted-foreground text-sm">
        Loading your review session…
      </p>
    );
  }

  return (
    <div>
      {/* Hidden per-deck subscriptions feeding the card catalog. */}
      {decks.map((deck) => (
        <DeckCardsLoader key={deck._id} deckId={deck._id} onCards={registerCards} />
      ))}

      {session.current ? (
        <ActiveReview
          item={session.current}
          completed={session.totalGraded}
          total={session.totalCount}
          session={session}
        />
      ) : session.totalGraded > 0 ? (
        <ReviewSummary session={session} />
      ) : (
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <CardTitle>Nothing due right now</CardTitle>
            <CardDescription>
              You&apos;re all caught up — new reviews appear as cards come due.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" render={<Link href="/decks" />}>
              Browse decks
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
