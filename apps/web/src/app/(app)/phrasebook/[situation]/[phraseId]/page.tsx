import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/PageHeader";
import { phrasebookData } from "@/features/phrasebook/data";
import { PhraseCard } from "@/features/phrasebook/PhraseCard";
import { ROMANIZATION_SCHEME } from "@/features/phrasebook/types";

export const metadata = { title: "Phrasebook — Asian" };

type PhraseDetailPageProps = {
  params: Promise<{ situation: string; phraseId: string }>;
};

/**
 * Phrase detail. Fixture ids are URL-safe (`{slug}-{lang}-{nn}`), so the
 * id doubles as the route param today; when Convex lands, ids become
 * document ids and nothing else on this page changes.
 */
export default async function PhraseDetailPage({ params }: PhraseDetailPageProps) {
  const { situation: slug, phraseId } = await params;

  const [situation, phrase] = await Promise.all([
    phrasebookData.getSituation(slug),
    phrasebookData.getPhrase(phraseId),
  ]);

  // Guard both halves so a valid id under the wrong situation can't render.
  if (situation === null || phrase === null || phrase.situation !== slug) notFound();

  return (
    <div>
      <PageHeader title={situation.title} description={phrase.english} />
      <Link
        href={`/phrasebook/${slug}`}
        className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm underline-offset-4 hover:underline"
      >
        ← All “{situation.title}” phrases
      </Link>
      <div className="max-w-xl">
        <PhraseCard phrase={phrase} />
        {phrase.romanization !== undefined ? (
          <p className="text-muted-foreground mt-3 text-sm">
            Romanization scheme: {ROMANIZATION_SCHEME[phrase.language]}
          </p>
        ) : null}
      </div>
    </div>
  );
}
