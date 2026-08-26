import { describe, expect, it } from "vitest";

import { buildPayload, PAYLOAD_FIELDS } from "./payloadForm";
import { SUBMISSION_KINDS } from "./types";

const phraseValues = {
  text: "  안녕하세요  ",
  english: "Hello (polite)",
  romanization: "",
  situation: "Greeting someone politely",
};

describe("buildPayload", () => {
  it("has field descriptors for every composable kind", () => {
    expect(Object.keys(PAYLOAD_FIELDS).sort()).toEqual([...SUBMISSION_KINDS].sort());
    // Every kind exposes at least one required field, so an empty form
    // can never submit.
    for (const fields of Object.values(PAYLOAD_FIELDS)) {
      expect(fields.some((f) => f.required)).toBe(true);
    }
  });

  it("builds a phrase payload and drops empty optionals", () => {
    const result = buildPayload("phrase", phraseValues);
    expect(result).toEqual({
      ok: true,
      payload: {
        text: "안녕하세요",
        english: "Hello (polite)",
        situation: "Greeting someone politely",
      },
    });
  });

  it("builds a card payload", () => {
    const result = buildPayload("card", { front: "ありがとう", back: "Thank you", notes: "  " });
    expect(result).toEqual({
      ok: true,
      payload: { front: "ありがとう", back: "Thank you" },
    });
  });

  it("builds a correction payload with known target/field values", () => {
    const result = buildPayload("correction", {
      targetType: "phrase",
      targetId: "食べる",
      field: "reading",
      proposedValue: "たべる",
      reason: "Source: textbook p.12",
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        targetType: "phrase",
        targetId: "食べる",
        field: "reading",
        proposedValue: "たべる",
        reason: "Source: textbook p.12",
      },
    });
  });

  it("normalizes unknown correction select values instead of failing", () => {
    const badTarget = buildPayload("correction", {
      targetType: "hacker",
      targetId: "x",
      field: "hacker",
      proposedValue: "y",
    });
    expect(badTarget.ok).toBe(true);
    if (!badTarget.ok) return;
    // Free-string selects normalize to the first/default entry rather
    // than sending garbage to the backend.
    expect(badTarget.payload).toMatchObject({ targetType: "dictionaryEntry", field: "definition" });
  });

  it("builds an example sentence payload", () => {
    const result = buildPayload("exampleSentence", {
      sentence: "毎日勉強します。",
      english: "I study every day.",
      targetHeadword: "勉強",
    });
    expect(result).toEqual({
      ok: true,
      payload: {
        sentence: "毎日勉強します。",
        english: "I study every day.",
        targetHeadword: "勉強",
      },
    });
  });

  it("rejects when required fields are missing or whitespace-only", () => {
    const missing = buildPayload("phrase", { english: "Hello" });
    expect(missing).toEqual({ ok: false, error: "Required: Phrase" });

    const blank = buildPayload("card", { front: "   ", back: "" });
    expect(blank).toEqual({ ok: false, error: "Required: Front, Back" });

    const nothing = buildPayload("exampleSentence", {});
    expect(nothing).toEqual({ ok: false, error: "Required: Sentence, English translation" });
  });
});
