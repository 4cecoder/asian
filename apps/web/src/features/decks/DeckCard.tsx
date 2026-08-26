import Link from "next/link";

import type { Doc } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { LANGUAGE_LABELS } from "./languages";
import { DeckProgressStrip } from "./DeckProgress";

type DeckCardProps = {
  deck: Doc<"decks">;
};

/** One deck in the list grid — title link, language/visibility badges, card count. */
export function DeckCard({ deck }: DeckCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle>
          <Link
            href={`/decks/${deck._id}`}
            className="focus-visible:ring-ring hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {deck.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{LANGUAGE_LABELS[deck.language]}</Badge>
        {deck.visibility === "private" ? <Badge variant="outline">Private</Badge> : null}
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {deck.cardCount} {deck.cardCount === 1 ? "card" : "cards"}
        </span>
        {/* basis-full wraps the strip onto its own row of the flex card body. */}
        <div className="w-full basis-full">
          <DeckProgressStrip deckId={deck._id} />
        </div>
      </CardContent>
    </Card>
  );
}
