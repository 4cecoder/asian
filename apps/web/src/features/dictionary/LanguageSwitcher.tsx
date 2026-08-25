"use client";

import { Button } from "@/components/ui/button";
import { DICTIONARY_LANGUAGES, LANGUAGE_LABELS, type DictionaryLanguage } from "./types";

type LanguageSwitcherProps = {
  value: DictionaryLanguage;
  onChange: (language: DictionaryLanguage) => void;
};

/** Big-3 language toggle for dictionary search. */
export function LanguageSwitcher({ value, onChange }: LanguageSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Dictionary language"
      className="flex flex-wrap items-center gap-1.5"
    >
      {DICTIONARY_LANGUAGES.map((language) => (
        <Button
          key={language}
          variant={value === language ? "default" : "outline"}
          size="sm"
          aria-pressed={value === language}
          onClick={() => onChange(language)}
        >
          {LANGUAGE_LABELS[language]}
        </Button>
      ))}
    </div>
  );
}
