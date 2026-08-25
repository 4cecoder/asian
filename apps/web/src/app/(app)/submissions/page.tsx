import { PageHeader } from "@/components/layout/PageHeader";

import { MySubmissionsList } from "@/features/submissions/MySubmissionsList";
import { SubmissionComposer } from "@/features/submissions/SubmissionComposer";

export const metadata = { title: "My submissions — Asian" };

/**
 * Community contribution experience. Composition only — all logic and
 * markup live in features/submissions/ (ADR 0004).
 */
export default function SubmissionsPage() {
  return (
    <div className="grid gap-10">
      <PageHeader
        title="Contributions"
        description="Share phrases, deck cards, corrections, and example sentences — approved contributions become knowledge packets for every learner."
      />
      <SubmissionComposer />
      <MySubmissionsList />
    </div>
  );
}
