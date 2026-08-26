/**
 * Pure payload formatting for moderation cards. Split from the item
 * component so every branch is unit-testable without rendering.
 *
 * Queue payloads are `unknown` on the wire — refinement may reshape them
 * and legacy deck-import rows carry no granular payload at all — so every
 * branch narrows defensively and degrades to "no detail lines" instead of
 * throwing. The reviewer always sees the raw JSON as a fallback rendered
 * by the card component when this returns nothing.
 */

/** One display row: a short term and its value. */
export interface PayloadLine {
  term: string;
  detail: string;
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  return typeof payload === "object" && payload !== null && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

function str(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatPhrases(phrases: unknown): PayloadLine[] {
  if (!Array.isArray(phrases)) return [];
  return phrases.flatMap((entry, index) => {
    const record = asRecord(entry);
    if (!record) return [];
    const text = str(record, "text");
    const english = str(record, "english");
    if (!text && !english) return [];
    return [{ term: `Phrase ${index + 1}`, detail: [text, english].filter(Boolean).join(" — ") }];
  });
}

/**
 * Human-readable detail lines for one submission payload, keyed by kind.
 * Unknown kinds (legacy deck imports), missing payloads, and malformed
 * shapes all yield an empty array.
 */
export function formatPayloadLines(kind: string | undefined, payload: unknown): PayloadLine[] {
  const p = asRecord(payload);
  if (!p) return [];

  switch (kind) {
    case "phrase": {
      return [
        ["Text", str(p, "text")],
        ["English", str(p, "english")],
        ["Romanization", str(p, "romanization")],
        ["Situation", str(p, "situation")],
      ]
        .filter((line): line is [string, string] => line[1] !== null)
        .map(([term, detail]) => ({ term, detail }));
    }
    case "card": {
      return [
        ["Front", str(p, "front")],
        ["Back", str(p, "back")],
        ["Notes", str(p, "notes")],
      ]
        .filter((line): line is [string, string] => line[1] !== null)
        .map(([term, detail]) => ({ term, detail }));
    }
    case "correction": {
      const targetType = str(p, "targetType");
      const targetId = str(p, "targetId");
      const target =
        targetType && targetId ? `${targetType} · ${targetId}` : (targetId ?? targetType);
      return [
        ["Target", target],
        ["Field", str(p, "field")],
        ["Proposed value", str(p, "proposedValue")],
        ["Reason", str(p, "reason")],
      ]
        .filter((line): line is [string, string] => line[1] !== null)
        .map(([term, detail]) => ({ term, detail }));
    }
    case "exampleSentence": {
      return [
        ["Sentence", str(p, "sentence")],
        ["English", str(p, "english")],
        ["Headword", str(p, "targetHeadword")],
      ]
        .filter((line): line is [string, string] => line[1] !== null)
        .map(([term, detail]) => ({ term, detail }));
    }
    case "situationPack": {
      const situation = str(p, "situation");
      return [
        ...(situation ? [{ term: "Situation", detail: situation }] : []),
        ...formatPhrases(p.phrases),
      ];
    }
    default:
      return [];
  }
}
