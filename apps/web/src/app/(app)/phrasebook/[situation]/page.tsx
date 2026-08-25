import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { phrasebookData } from "@/features/phrasebook/data";
import { LanguageFilter } from "@/features/phrasebook/LanguageFilter";
import { PhraseList } from "@/features/phrasebook/PhraseList";
import type { PhrasebookLanguage } from "@/features/phrasebook/types";

export const metadata = { title: "Phrasebook — Asian" };

const VALID_LANGUAGES: readonly string[] = ["ja", "ko", "zh"];

type SituationPageProps = {
  params: Promise<{ situation: string }>;
  searchParams: Promise<{ lang?: string }>;
};

/** One situation's phrases, filterable by language via `?lang=`. */
export default async function SituationPage({ params, searchParams }: SituationPageProps) {
  const [{ situation: slug }, { lang }] = await Promise.all([params, searchParams]);

  const situation = await phrasebookData.getSituation(slug);
  if (situation === null) notFound();

  // Unknown `lang` values fall back to all languages rather than 404ing.
  const language =
    lang !== undefined && VALID_LANGUAGES.includes(lang) ? (lang as PhrasebookLanguage) : undefined;

  const phrases = await phrasebookData.listPhrases(slug, language);

  return (
    <div>
      <PageHeader title={situation.title} description={situation.description} />
      <Link
        href="/phrasebook"
        className="text-muted-foreground hover:text-foreground mb-4 inline-block text-sm underline-offset-4 hover:underline"
      >
        ← All situations
      </Link>
      <div className="mb-6">
        <LanguageFilter situationSlug={situation.slug} selected={language} />
      </div>
      <PhraseList phrases={phrases} />
    </div>
  );
}
