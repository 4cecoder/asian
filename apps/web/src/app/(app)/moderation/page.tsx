import { PageHeader } from "@/components/layout/PageHeader";

import { ModerationBoard } from "@/features/moderation/ModerationBoard";
import { ModerationQueue } from "@/features/moderation/ModerationQueue";

export const metadata = { title: "Moderation — Asian" };

/**
 * Staff-only moderation queue. Composition only (ADR 0004): the board
 * gates on the Convex-side role check, and every queue read / review
 * write re-checks the role server-side. Not in AppNav — see the comment
 * in ModerationBoard's feature README decision notes; staff reach this
 * page by direct URL.
 */
export default function ModerationPage() {
  return (
    <div className="grid gap-10">
      <PageHeader
        title="Moderation"
        description="Review community submissions before they publish to every learner."
      />
      <ModerationBoard>
        <ModerationQueue />
      </ModerationBoard>
    </div>
  );
}
