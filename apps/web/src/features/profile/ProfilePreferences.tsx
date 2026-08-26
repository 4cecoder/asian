"use client";

import { useState, type FormEvent } from "react";

import { useMutation } from "convex/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { updateProfileRef } from "./api";
import { goalLabel, languageLabel } from "./labels";
import {
  GOAL_OPTIONS,
  LANGUAGE_OPTIONS,
  type OnboardingGoal,
  type OnboardingLanguage,
} from "../onboarding/preferences";

type ProfilePreferencesProps = {
  language: OnboardingLanguage | string | null;
  goal: OnboardingGoal | string | null;
};

/**
 * Language + goal display and inline change. Reuses the onboarding
 * pickers' option data (same radio-card styling, same values) but posts
 * to the profiles mutation — never to the onboarding routes/actions.
 * Keyed on stored values so a successful save resets the radios to what
 * the server now holds.
 */
export function ProfilePreferences({ language, goal }: ProfilePreferencesProps) {
  const updateProfile = useMutation(updateProfileRef);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSummary =
    language && goal
      ? `${languageLabel(language)} · ${goalLabel(goal)}`
      : "Not set yet — pick these the same way you did in onboarding.";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);
    const language = data.get("language");
    const goal = data.get("goal");
    if (!language || !goal) return; // Radios are required; nothing to save.

    setPending(true);
    try {
      await updateProfile({
        language: language as OnboardingLanguage,
        goal: goal as OnboardingGoal,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving your preferences failed. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning preferences</CardTitle>
        <CardDescription>{currentSummary}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" key={`${language ?? ""}-${goal ?? ""}`}>
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="sr-only">Target language</legend>
            {LANGUAGE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="has-checked:border-ring has-checked:ring-ring/30 hover:bg-muted/50 flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors has-checked:ring-3"
              >
                <input
                  type="radio"
                  name="language"
                  value={option.value}
                  defaultChecked={language === option.value}
                  required
                  className="sr-only"
                />
                <span lang={option.value} className="font-heading text-xl font-semibold">
                  {option.nativeLabel}
                </span>
                <span className="text-muted-foreground text-sm">{option.englishLabel}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Learning goal</legend>
            {GOAL_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="has-checked:border-ring has-checked:ring-ring/30 hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-checked:ring-3"
              >
                <input
                  type="radio"
                  name="goal"
                  value={option.value}
                  defaultChecked={goal === option.value}
                  required
                  className="mt-1"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-sm">{option.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
