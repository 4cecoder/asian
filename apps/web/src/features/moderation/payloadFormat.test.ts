import { describe, expect, it } from "vitest";

import { formatPayloadLines } from "./payloadFormat";

describe("formatPayloadLines", () => {
  it("formats a phrase payload and skips empty optionals", () => {
    expect(
      formatPayloadLines("phrase", {
        text: "감사합니다",
        english: "Thank you",
        romanization: "",
        situation: "polite thanks",
      }),
    ).toEqual([
      { term: "Text", detail: "감사합니다" },
      { term: "English", detail: "Thank you" },
      { term: "Situation", detail: "polite thanks" },
    ]);
  });

  it("formats a card payload including notes", () => {
    expect(formatPayloadLines("card", { front: "猫", back: "cat", notes: "N5" })).toEqual([
      { term: "Front", detail: "猫" },
      { term: "Back", detail: "cat" },
      { term: "Notes", detail: "N5" },
    ]);
  });

  it("formats a correction with its combined target", () => {
    expect(
      formatPayloadLines("correction", {
        targetType: "dictionaryEntry",
        targetId: "entry-42",
        field: "reading",
        proposedValue: "nǐ hǎo",
      }),
    ).toEqual([
      { term: "Target", detail: "dictionaryEntry · entry-42" },
      { term: "Field", detail: "reading" },
      { term: "Proposed value", detail: "nǐ hǎo" },
    ]);
  });

  it("formats an example sentence with its optional headword", () => {
    expect(
      formatPayloadLines("exampleSentence", {
        sentence: "毎朝コーヒーを飲みます。",
        english: "I drink coffee every morning.",
        targetHeadword: "飲む",
      }),
    ).toEqual([
      { term: "Sentence", detail: "毎朝コーヒーを飲みます。" },
      { term: "English", detail: "I drink coffee every morning." },
      { term: "Headword", detail: "飲む" },
    ]);
  });

  it("lists each phrase of a situation pack", () => {
    expect(
      formatPayloadLines("situationPack", {
        situation: "restaurant",
        phrases: [
          { text: "菜单，谢谢", english: "The menu, please" },
          { text: "买单", english: "Check, please", romanization: "mǎidān" },
          {},
        ],
      }),
    ).toEqual([
      { term: "Situation", detail: "restaurant" },
      { term: "Phrase 1", detail: "菜单，谢谢 — The menu, please" },
      { term: "Phrase 2", detail: "买单 — Check, please" },
    ]);
  });

  it("returns nothing for legacy deck-import kinds", () => {
    expect(formatPayloadLines("anki_import", { whatever: true })).toEqual([]);
  });

  it("degrades safely on missing or malformed payloads", () => {
    expect(formatPayloadLines("phrase", undefined)).toEqual([]);
    expect(formatPayloadLines(undefined, { text: "x" })).toEqual([]);
    expect(formatPayloadLines("phrase", "not an object")).toEqual([]);
    expect(formatPayloadLines("phrase", ["array"])).toEqual([]);
    expect(formatPayloadLines("phrase", null)).toEqual([]);
  });
});
