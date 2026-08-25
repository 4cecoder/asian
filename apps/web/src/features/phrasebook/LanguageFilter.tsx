import Link from "next/link";

import { cn } from "@/lib/utils";
import { ROMANIZATION_SCHEME, type PhrasebookLanguage } from "./types";

const LANGUAGES = Object.keys(ROMANIZATION_SCHEME) as PhrasebookLanguage[];

const LANGUAGE_LABELS: Record<PhrasebookLanguage, string> = {
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
};

type LanguageFilterProps = {
  situationSlug: string;
  /** Currently selected language from `?lang=`, or undefined for all languages. */
  selected?: PhrasebookLanguage;
};

/**
 * Language chips rendered as plain links (`?lang=` search param), keeping
 * the situation page a server component with shareable URLs and no client
 * JS. The "All" chip clears the filter.
 */
export function LanguageFilter({ situationSlug, selected }: LanguageFilterProps) {
  const chipClass = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav aria-label="Filter by language" data-testid="language-filter">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <Link
            href={`/phrasebook/${situationSlug}`}
            className={chipClass(selected === undefined)}
            aria-current={selected === undefined ? "true" : undefined}
          >
            All
          </Link>
        </li>
        {LANGUAGES.map((language) => (
          <li key={language}>
            <Link
              href={`/phrasebook/${situationSlug}?lang=${language}`}
              className={chipClass(selected === language)}
              aria-current={selected === language ? "true" : undefined}
            >
              {LANGUAGE_LABELS[language]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
