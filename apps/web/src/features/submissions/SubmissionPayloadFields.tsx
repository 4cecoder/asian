"use client";

import { Input } from "@/components/ui/input";

import { SubmissionTextarea } from "./SubmissionTextarea";
import { PAYLOAD_FIELDS, type ComposableKind, type PayloadFieldValue } from "./types";

/**
 * Dynamic per-kind payload form. Fields render straight from the
 * PAYLOAD_FIELDS descriptors in types.ts, so adding a submission kind or
 * a field is a data change, not a component change.
 */
export function SubmissionPayloadFields({
  type,
  values,
  onChange,
}: {
  type: ComposableKind;
  values: Readonly<Record<string, PayloadFieldValue>>;
  onChange: (fieldId: string, value: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {PAYLOAD_FIELDS[type].map((field) => {
        const inputId = `payload-${field.id}`;
        const value = values[field.id] ?? "";
        const describedBy = field.required ? `${inputId}-hint` : undefined;

        return (
          <div key={field.id} className="grid gap-1.5">
            <label htmlFor={inputId} className="text-sm font-medium">
              {field.label}
              {field.required ? (
                <span aria-hidden="true" className="text-destructive">
                  {" *"}
                </span>
              ) : null}
            </label>
            {field.options ? (
              <select
                id={inputId}
                value={value || field.options[0].value}
                onChange={(e) => onChange(field.id, e.target.value)}
                aria-describedby={describedBy}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 rounded-lg border bg-transparent px-2 text-sm outline-none focus-visible:ring-3"
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.multiline ? (
              <SubmissionTextarea
                id={inputId}
                value={value}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.id, e.target.value)}
                aria-describedby={describedBy}
                required={field.required}
              />
            ) : (
              <Input
                id={inputId}
                value={value}
                placeholder={field.placeholder}
                onChange={(e) => onChange(field.id, e.target.value)}
                aria-describedby={describedBy}
                required={field.required}
              />
            )}
            {field.required ? (
              <p id={`${inputId}-hint`} className="text-muted-foreground text-xs">
                Required.
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
