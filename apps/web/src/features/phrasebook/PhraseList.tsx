import { PhraseCard } from "./PhraseCard";
import type { Phrase } from "./types";

/** Vertical list of phrase cards. Purely presentational — sorting/filtering happens in the data source. */
export function PhraseList({ phrases }: { phrases: Phrase[] }) {
  return (
    <div className="space-y-4" data-testid="phrase-list">
      {phrases.map((phrase) => (
        <PhraseCard
          key={phrase.id}
          phrase={phrase}
          href={`/phrasebook/${phrase.situation}/${phrase.id}`}
        />
      ))}
    </div>
  );
}
