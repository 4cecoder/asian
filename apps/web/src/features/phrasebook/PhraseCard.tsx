import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROMANIZATION_SCHEME, type Phrase } from "./types";

const LANGUAGE_BADGE_LABELS: Record<Phrase["language"], string> = {
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin",
};

/**
 * One situational phrase: English meaning, native script, romanization.
 *
 * `href` is optional — set it to link the card into the phrase detail
 * route; omit it inside contexts that already show full detail.
 */
export function PhraseCard({ phrase, href }: { phrase: Phrase; href?: string }) {
  const body = (
    <>
      <CardDescription>{phrase.english}</CardDescription>
      <p lang={phrase.language} className="text-lg font-medium" data-testid="phrase-translation">
        {phrase.translation}
      </p>
      {phrase.romanization !== undefined ? (
        <p className="text-muted-foreground mt-1 text-sm">
          <span className="sr-only">{ROMANIZATION_SCHEME[phrase.language]}: </span>
          {phrase.romanization}
        </p>
      ) : null}
    </>
  );

  return (
    <Card data-testid="phrase-card">
      <CardHeader>
        <CardTitle>
          <Badge variant="secondary">{LANGUAGE_BADGE_LABELS[phrase.language]}</Badge>
        </CardTitle>
        {href !== undefined ? (
          <CardAction>
            <Link
              href={href}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Details
            </Link>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">{body}</CardContent>
    </Card>
  );
}
