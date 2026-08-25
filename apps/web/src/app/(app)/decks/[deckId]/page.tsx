import { DecksErrorBoundary } from "@/features/decks/DecksErrorBoundary";
import { DeckDetail } from "@/features/decks/DeckDetail";

export const metadata = { title: "Deck — Asian" };

type DeckDetailPageProps = {
  params: Promise<{ deckId: string }>;
};

/** Deck detail page — composes `features/decks/DeckDetail` (`decks.get`, `cards.listByDeck`). */
export default async function DeckDetailPage({ params }: DeckDetailPageProps) {
  const { deckId } = await params;

  return (
    <DecksErrorBoundary>
      <DeckDetail deckId={deckId} />
    </DecksErrorBoundary>
  );
}
