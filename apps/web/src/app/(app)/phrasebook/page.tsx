import { PageHeader } from "@/components/layout/PageHeader";
import { phrasebookData } from "@/features/phrasebook/data";
import { SituationPicker } from "@/features/phrasebook/SituationPicker";

export const metadata = { title: "Phrasebook — Asian" };

/**
 * Situational phrase browser (Track 10). Data flows through
 * `features/phrasebook/data.ts` — swap that file's backing store to move
 * from fixtures to Convex without touching this page.
 */
export default async function PhrasebookPage() {
  const situations = await phrasebookData.listSituations();

  return (
    <div>
      <PageHeader
        title="Phrasebook"
        description="Situational phrases for travel in Japan, Korea, and China."
      />
      <SituationPicker situations={situations} />
    </div>
  );
}
