import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SituationSummary } from "./types";

/**
 * Browse grid of situations. Server component — pure links, no client
 * state, so the whole grid is crawlable and works without JS.
 */
export function SituationPicker({ situations }: { situations: SituationSummary[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="situation-grid">
      {situations.map((situation) => (
        <li key={situation.slug}>
          <Link
            href={`/phrasebook/${situation.slug}`}
            className="group focus-visible:ring-ring/50 block h-full rounded-xl outline-none focus-visible:ring-[3px]"
            aria-label={`${situation.title} — ${situation.phraseCount} phrases`}
          >
            <Card className="group-hover:border-ring/50 h-full transition-colors">
              <CardHeader>
                <CardTitle>{situation.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{situation.description}</p>
                <p className="text-muted-foreground mt-3 text-xs font-medium">
                  {situation.phraseCount} phrases
                </p>
              </CardContent>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
