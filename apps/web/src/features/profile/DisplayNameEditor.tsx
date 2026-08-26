"use client";

import { useState, type FormEvent } from "react";

import { useMutation } from "convex/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateProfileRef } from "./api";

type DisplayNameEditorProps = {
  /** Stored value shown before any local edit; also resyncs after saves. */
  initial: string | null;
};

/**
 * Display-name editor. Uncontrolled input keyed on the stored value so a
 * successful save (which refetches myProfile) resets the field to what
 * the server now holds.
 */
export function DisplayNameEditor({ initial }: DisplayNameEditorProps) {
  const updateProfile = useMutation(updateProfileRef);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const displayName = String(new FormData(event.currentTarget).get("displayName") ?? "");
    setPending(true);
    try {
      await updateProfile({ displayName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving your name failed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5" key={initial ?? ""}>
      <Label htmlFor="display-name">Display name</Label>
      <div className="flex max-w-sm items-center gap-2">
        <Input
          id="display-name"
          name="displayName"
          type="text"
          maxLength={80}
          defaultValue={initial ?? ""}
          placeholder="How should we greet you?"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "display-name-error" : undefined}
          disabled={pending}
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {error ? (
        <p id="display-name-error" role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </form>
  );
}
