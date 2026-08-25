import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

import { DeckList } from "@/features/decks/DeckList";
import { DecksErrorBoundary } from "@/features/decks/DecksErrorBoundary";

export const metadata = { title: "Decks — Asian" };

/** Deck list page — composes `features/decks/DeckList` (reactive `decks.list`). */
export default function DecksPage() {
  return (
    <div>
      <PageHeader
        title="Decks"
        description="Community decks and decks you've created."
        actions={<Button render={<Link href="/decks/new" />}>New deck</Button>}
      />
      <DecksErrorBoundary>
        <DeckList />
      </DecksErrorBoundary>
    </div>
  );
}
