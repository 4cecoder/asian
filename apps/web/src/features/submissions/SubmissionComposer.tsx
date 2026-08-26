"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useSubmitSubmission } from "./adapter";
import { LanguagePicker } from "./LanguagePicker";
import { buildPayload, type PayloadFieldValue } from "./payloadForm";
import { SubmissionPayloadFields } from "./SubmissionPayloadFields";
import { SubmissionPreview } from "./SubmissionPreview";
import { SubmissionTypePicker } from "./SubmissionTypePicker";
import { SUBMISSION_KINDS, type ComposableKind, type SubmissionLanguage } from "./types";

const DEFAULT_KIND: ComposableKind = SUBMISSION_KINDS[0];

/**
 * The submission composer: pick a kind + language, fill the dynamic
 * payload form, optionally cite a source URL, preview, submit. Data flow
 * goes through the adapter hooks — no Convex imports here.
 */
export function SubmissionComposer() {
  const [kind, setKind] = useState<ComposableKind>(DEFAULT_KIND);
  const [language, setLanguage] = useState<SubmissionLanguage>("ko");
  const [values, setValues] = useState<Record<string, PayloadFieldValue>>({});
  const [sourceUrl, setSourceUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const { state, submit, clearError } = useSubmitSubmission();

  const changeKind = (next: ComposableKind) => {
    setKind(next);
    setValues({});
    clearError();
    setSuccessId(null);
  };

  const changeField = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    clearError();
    setSuccessId(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessId(null);

    if (sourceUrl.trim() && !URL.canParse(sourceUrl.trim())) {
      setValidationError("Source URL must be a valid URL (or leave it empty).");
      return;
    }

    const built = buildPayload(kind, values);
    if (!built.ok) {
      setValidationError(built.error);
      return;
    }
    setValidationError(null);

    const id = await submit({
      kind,
      language,
      payload: built.payload,
      sourceUrl: sourceUrl.trim() || undefined,
    });
    if (id) {
      setValues({});
      setSourceUrl("");
      setSuccessId(id);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Contribute content</CardTitle>
          <CardDescription>
            Your submission is reviewed by our AI pipeline and moderators before it publishes to
            everyone.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <SubmissionTypePicker value={kind} onChange={changeKind} />
          <LanguagePicker
            value={language}
            onChange={(lang) => {
              setLanguage(lang);
              setSuccessId(null);
            }}
          />
          <SubmissionPayloadFields type={kind} values={values} onChange={changeField} />

          <div className="grid gap-1.5">
            <label htmlFor="submission-source-url" className="text-sm font-medium">
              Source URL <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="submission-source-url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={sourceUrl}
              onChange={(e) => {
                setSourceUrl(e.target.value);
                setSuccessId(null);
              }}
            />
          </div>

          <SubmissionPreview
            kind={kind}
            language={language}
            values={values}
            sourceUrl={sourceUrl}
          />

          {(validationError ?? state.error) ? (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
            >
              {validationError ?? state.error}
            </p>
          ) : null}
          {successId ? (
            <p role="status" className="bg-muted rounded-lg px-3 py-2 text-sm">
              Thanks! Your contribution was submitted and is now pending review.
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={state.isSubmitting}>
            {state.isSubmitting ? "Submitting…" : "Submit contribution"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
