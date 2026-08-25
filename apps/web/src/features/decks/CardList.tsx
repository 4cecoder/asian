import type { Doc } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CardListProps = {
  cards: Doc<"cards">[];
};

/** The flashcards in one deck — front/back pairs with optional notes. */
export function CardList({ cards }: CardListProps) {
  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No cards in this deck yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Cards can be added once the card editor lands. Reviews only make sense with at least one
            card.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="list-none space-y-3 p-0">
      {cards.map((card) => (
        <li key={card._id}>
          <Card size="sm">
            <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="font-medium">{card.front}</span>
              <span className="text-muted-foreground">{card.back}</span>
            </CardContent>
            {card.notes ? (
              <CardContent className="text-muted-foreground pt-1 text-xs">{card.notes}</CardContent>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}
