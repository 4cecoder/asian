"use client";

import { cn } from "@/lib/utils";

/**
 * Multiline text field for payload values. Lives in features/ (not ui/)
 * because shadcn's textarea primitive isn't vendored yet — swap this for
 * `components/ui/textarea` when it lands.
 */
export function SubmissionTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="submission-textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 min-h-16 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
