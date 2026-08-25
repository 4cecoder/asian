"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { isDeckLanguage, LANGUAGES, LANGUAGE_LABELS } from "./languages";

type FormErrors = {
  title?: string;
  submit?: string;
};

/** Manual deck creation via the `decks.create` mutation. */
export function NewDeckForm() {
  const router = useRouter();
  const createDeck = useMutation(api.decks.create);

  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") ?? "").trim();
    const language = String(data.get("language") ?? "");
    const visibility = String(data.get("visibility") ?? "");

    if (!title) {
      setErrors({ title: "Give your deck a title." });
      return;
    }
    if (!isDeckLanguage(language)) {
      setErrors({ submit: "Pick a language for the deck." });
      return;
    }

    setPending(true);
    try {
      const deckId = await createDeck({
        title,
        language,
        visibility: visibility === "private" ? "private" : "public",
      });
      router.push(`/decks/${deckId}`);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Creating the deck failed. Try again.",
      });
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a deck manually</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="deck-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="deck-title"
              name="title"
              type="text"
              placeholder="e.g. Travel basics"
              required
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? "deck-title-error" : undefined}
              disabled={pending}
            />
            {errors.title ? (
              <p id="deck-title-error" className="text-destructive text-xs">
                {errors.title}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="deck-language" className="text-sm font-medium">
                Language
              </label>
              <select
                id="deck-language"
                name="language"
                defaultValue="ja"
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2 text-sm outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deck-visibility" className="text-sm font-medium">
                Visibility
              </label>
              <select
                id="deck-visibility"
                name="visibility"
                defaultValue="public"
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2 text-sm outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending}
              >
                <option value="public">Public — anyone can study it</option>
                <option value="private">Private — only you</option>
              </select>
            </div>
          </div>

          {errors.submit ? (
            <p role="alert" className="text-destructive text-sm">
              {errors.submit}
            </p>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create deck"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              render={<Link href="/decks" />}
              tabIndex={pending ? -1 : undefined}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
