"use client";

import Link from "next/link";

import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type DeckProgressData = FunctionReturnType<typeof api.decks.deckProgress>;

/**
 * Subscribe to `decks.deckProgress` for one deck. Skipped until auth is
 * resolved so an anonymous visitor can never fire a query that throws
 * "Must be signed in" — /decks routes are middleware-protected, but the
 * Convex handshake still resolves after first paint.
 *
 * `undefined` = loading (skipped or subscription pending); the panel and
 * strip below render matching skeletons for that state.
 */
function useDeckProgress(deckId: Id<"decks">): DeckProgressData | undefined {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.decks.deckProgress, isAuthenticated ? { deckId } : "skip");
}

/** Percent reviewed, rounded like ReviewProgress; callers gate on total > 0. */
function reviewedPercent(progress: DeckProgressData): number {
  return Math.round((progress.reviewed / progress.total) * 100);
}

/**
 * Detail-page progress block: "X of Y reviewed · Z due" plus the review
 * CTA. Hidden entirely for decks with no cards — the card list's empty
 * state already explains that situation.
 */
export function DeckProgressPanel({ deckId }: { deckId: Id<"decks"> }) {
  const progress = useDeckProgress(deckId);

  if (progress === undefined) {
    return (
      // Same skeleton idiom as DeckDetail's loader: pulse bar aria-hidden,
      // live status text outside it so it isn't silenced too.
      <div className="mb-6" aria-busy="true">
        <span aria-hidden="true" className="bg-muted block h-2 w-full animate-pulse rounded" />
        <p className="sr-only" role="status">
          Loading progress…
        </p>
      </div>
    );
  }

  if (progress.total === 0) return null;

  const ctaHref = `/review?deck=${deckId}`;
  const cta =
    progress.due > 0 ? (
      <Button size="sm" render={<Link href={ctaHref} />}>
        Review {progress.due} due
      </Button>
    ) : progress.reviewed === 0 ? (
      <Button size="sm" render={<Link href={ctaHref} />}>
        Start review
      </Button>
    ) : (
      <Button size="sm" variant="outline" render={<Link href={ctaHref} />}>
        Practice again
      </Button>
    );

  return (
    <section data-testid="deck-progress" className="mb-6 space-y-1">
      <div className="flex items-center justify-between gap-4">
        <p data-testid="deck-progress-label" className="text-muted-foreground text-sm tabular-nums">
          {progress.reviewed} of {progress.total} reviewed ·{" "}
          {progress.due > 0 ? `${progress.due} due` : "Nothing due"}
        </p>
        {cta}
      </div>
      <Progress value={reviewedPercent(progress)} aria-label="Deck review progress" />
    </section>
  );
}

/**
 * Slim per-tile strip for the deck list grid. Silent while loading — the
 * list already announces one overall "Loading decks…" status, and one
 * announcement per tile would be screen-reader noise.
 */
export function DeckProgressStrip({ deckId }: { deckId: Id<"decks"> }) {
  const progress = useDeckProgress(deckId);

  if (progress === undefined) {
    return (
      <span
        aria-hidden="true"
        data-testid="deck-progress-loading"
        className="bg-muted mt-3 block h-1 w-full animate-pulse rounded-full"
      />
    );
  }

  if (progress.total === 0) return null;

  return (
    <div data-testid="deck-progress-strip" className="mt-3">
      <Progress
        value={reviewedPercent(progress)}
        aria-label={`${progress.reviewed} of ${progress.total} cards reviewed`}
      />
    </div>
  );
}
