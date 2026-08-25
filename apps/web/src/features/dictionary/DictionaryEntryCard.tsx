"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DictionaryEntry } from "./types";

const PREVIEW_GLOSSES = 1;

/**
 * One dictionary result. Shows headword, reading, POS, and the first
 * gloss; expands in place for all definitions plus provenance.
 */
export function DictionaryEntryCard({ entry }: { entry: DictionaryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = entry.definitions.length - PREVIEW_GLOSSES;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span lang={entry.language} className="text-lg font-medium">
            {entry.headword}
          </span>
          {entry.reading ? <Badge variant="outline">{entry.reading}</Badge> : null}
          {entry.partOfSpeech ? <Badge variant="secondary">{entry.partOfSpeech}</Badge> : null}
          {typeof entry.frequencyRank === "number" ? (
            <Badge variant="ghost">#{entry.frequencyRank}</Badge>
          ) : null}
        </div>

        <ol className="list-decimal space-y-0.5 pl-5 text-sm">
          {(expanded ? entry.definitions : entry.definitions.slice(0, PREVIEW_GLOSSES)).map(
            (definition, index) => (
              <li key={`${entry._id}-${index}`}>{definition}</li>
            ),
          )}
        </ol>

        {hiddenCount > 0 ? (
          <div>
            <Button
              variant="ghost"
              size="xs"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded
                ? "Show fewer"
                : `Show ${hiddenCount} more definition${hiddenCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        ) : null}

        {expanded ? (
          <p className="text-muted-foreground text-xs">Source: {entry.sourceName}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
