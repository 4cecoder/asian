import { PageHeader } from "@/components/layout/PageHeader";

import { DecksErrorBoundary } from "@/features/decks/DecksErrorBoundary";
import { NewDeckForm } from "@/features/decks/NewDeckForm";

export const metadata = { title: "New deck — Asian" };

/**
 * Create-deck page. Manual creation only for now; Anki upload and Quizlet
 * reimport land with the import wizard (`features/submissions/`).
 */
export default function NewDeckPage() {
  return (
    <div>
      <PageHeader
        title="New deck"
        description="Create a deck manually. Import from Anki or Quizlet is coming later."
      />
      <DecksErrorBoundary>
        <NewDeckForm />
      </DecksErrorBoundary>
    </div>
  );
}
