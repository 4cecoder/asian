import { PageHeader } from "@/components/layout/PageHeader";

import { SwipeDeck } from "@/features/review/SwipeDeck";

export const metadata = { title: "Review — Asian" };

/** SRS review session — due cards, grade, next; summary when drained. */
export default function ReviewPage() {
  return (
    <div>
      <PageHeader title="Review" description="Work through the cards that are due today." />
      <SwipeDeck />
    </div>
  );
}
