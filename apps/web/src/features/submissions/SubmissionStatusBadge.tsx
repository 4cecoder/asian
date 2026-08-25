import { Badge } from "@/components/ui/badge";

import type { SubmissionStatus } from "./types";

const STATUS_META: Record<
  SubmissionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  processing: { label: "Processing", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  needsReview: { label: "Needs review", variant: "outline" },
};

/** Status pill for a submission, mapped to design-token badge variants. */
export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} aria-label={`Status: ${meta.label}`}>
      {meta.label}
    </Badge>
  );
}
