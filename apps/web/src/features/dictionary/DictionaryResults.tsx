"use client";

import { DictionaryEntryCard } from "./DictionaryEntryCard";
import {
  LANGUAGE_LABELS,
  MAX_QUERY_RESULTS,
  type DictionaryEntry,
  type DictionaryLanguage,
} from "./types";

type DictionaryResultsProps = {
  /** undefined while the Convex subscription is loading. */
  entries: DictionaryEntry[] | undefined;
  language: DictionaryLanguage;
  hasQuery: boolean;
};

/**
 * Result list plus every non-result state: idle prompt, loading
 * placeholders, and no-results (see convex/seed/README.md for which
 * languages currently have sourced data).
 */
export function DictionaryResults({ entries, language, hasQuery }: DictionaryResultsProps) {
  if (!hasQuery) {
    return (
      <p className="text-muted-foreground text-sm">
        Type to search {LANGUAGE_LABELS[language]} entries by headword prefix.
      </p>
    );
  }

  if (entries === undefined) {
    return (
      <ul aria-label="Loading results" className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <li key={index} className="bg-muted/60 h-20 animate-pulse rounded-xl" />
        ))}
      </ul>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No {LANGUAGE_LABELS[language]} entries match this search.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry._id}>
            <DictionaryEntryCard entry={entry} />
          </li>
        ))}
      </ul>
      {entries.length >= MAX_QUERY_RESULTS ? (
        <p className="text-muted-foreground text-xs">
          Showing the first {MAX_QUERY_RESULTS} matches — try a longer or more specific prefix.
        </p>
      ) : null}
    </div>
  );
}
