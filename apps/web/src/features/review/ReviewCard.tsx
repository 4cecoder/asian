"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ReviewItem } from "./useCardCatalog";

const LANGUAGE_LABELS: Record<ReviewItem["language"], string> = {
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin",
  th: "Thai",
  vi: "Vietnamese",
};

type ReviewCardProps = {
  item: ReviewItem;
  revealed: boolean;
};

/** One card's face: the prompt, plus the answer once revealed. */
export function ReviewCard({ item, revealed }: ReviewCardProps) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>Prompt</CardTitle>
        <CardAction>
          <Badge variant="outline">{LANGUAGE_LABELS[item.language]}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-h-36 flex-col items-center justify-center text-center">
        {/* lang switches screen-reader pronunciation to the card's language. */}
        <p lang={item.language} className="font-heading text-3xl font-semibold tracking-tight">
          {item.front}
        </p>
      </CardContent>
      {revealed ? (
        // aria-live announces the answer for screen readers on reveal.
        <CardContent aria-live="polite" className="bg-muted/50 border-t py-4 text-center">
          <p className="text-xl">{item.back}</p>
          {item.notes ? <p className="text-muted-foreground mt-2 text-sm">{item.notes}</p> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
