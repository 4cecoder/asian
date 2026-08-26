"use client";

import Link from "next/link";

import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DeckCard } from "./DeckCard";

/** Reactive deck list (`decks.list`): public decks plus the user's own. */
export function DeckList() {
  const decks = useQuery(api.decks.list, {});

  if (decks === undefined) {
    return (
      // The status message lives outside the aria-hidden skeleton —
      // hiding the container would hide an announcement inside it too.
      <div className="relative">
        <div
          aria-hidden="true"
          data-testid="decks-loading"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} aria-hidden="true">
              <CardHeader>
                <CardTitle>
                  <span className="bg-muted inline-block h-4 w-3/4 animate-pulse rounded" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="bg-muted inline-block h-3 w-1/3 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="sr-only" role="status">
          Loading decks…
        </p>
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No decks yet</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">Create your first deck to start studying.</p>
          <Button render={<Link href="/decks/new" />}>New deck</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck) => (
        <li key={deck._id}>
          <DeckCard deck={deck} />
        </li>
      ))}
    </ul>
  );
}
