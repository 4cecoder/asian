import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ProfileStatsProps = {
  /** Decks the caller owns (public and private) — from myProfile. */
  deckCount: number;
};

/**
 * Trivial account stats. Deck count comes from the server-side
 * `by_owner` count in myProfile — NOT decks.list length, which merges in
 * public community decks the user doesn't own.
 */
export function ProfileStats({ deckCount }: ProfileStatsProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Your content</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          <span className="font-heading text-2xl font-semibold">{deckCount}</span>{" "}
          {deckCount === 1 ? "deck" : "decks"} owned
        </p>
      </CardContent>
    </Card>
  );
}
