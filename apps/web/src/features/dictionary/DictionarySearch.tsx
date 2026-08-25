"use client";

import { useState } from "react";
import { useQuery } from "convex/react";

import { Input } from "@/components/ui/input";
import { api } from "../../../convex/_generated/api";
import { DictionaryResults } from "./DictionaryResults";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { DictionaryLanguage } from "./types";
import { useDebouncedValue } from "./useDebouncedValue";

const DEBOUNCE_MS = 300;

/**
 * Dictionary search: debounced prefix input -> reactive Convex
 * subscription (api.dictionary.search, max 25 results per query — the
 * backend has no cursor/pagination args yet).
 */
export function DictionarySearch() {
  const [language, setLanguage] = useState<DictionaryLanguage>("ja");
  const [inputValue, setInputValue] = useState("");
  const debouncedPrefix = useDebouncedValue(inputValue.trim(), DEBOUNCE_MS);

  const hasQuery = debouncedPrefix.length > 0;
  const entries = useQuery(
    api.dictionary.search,
    hasQuery ? { language, prefix: debouncedPrefix } : "skip",
  );

  const isLoading = hasQuery && entries === undefined;
  const resultCount = entries?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <LanguageSwitcher value={language} onChange={setLanguage} />

      {language === "ko" ? (
        <p className="text-muted-foreground text-xs">
          Korean dictionary data hasn&apos;t been sourced yet — Korean searches will come back empty
          until it is.
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dictionary-search-input" className="text-sm font-medium">
          Search {language === "ja" ? "Japanese" : language === "ko" ? "Korean" : "Chinese"}{" "}
          dictionary
        </label>
        <Input
          id="dictionary-search-input"
          name="prefix"
          type="search"
          placeholder="Start typing a word…"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          autoComplete="off"
        />
      </div>

      <p aria-live="polite" className="text-muted-foreground text-sm">
        {isLoading
          ? "Searching…"
          : hasQuery && entries !== undefined
            ? `${resultCount} ${resultCount === 1 ? "result" : "results"} for “${debouncedPrefix}”`
            : ""}
      </p>

      <DictionaryResults entries={entries} language={language} hasQuery={hasQuery} />
    </div>
  );
}
