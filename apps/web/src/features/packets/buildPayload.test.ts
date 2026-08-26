/**
 * Coverage for the pure DB-row -> OKF payload/manifest mapping in
 * buildPayload.ts, including a full round trip through validateManifest
 * once the exporter's checksums are injected.
 */
import { describe, expect, test } from "vitest";
import { validateManifest } from "./manifest";
import {
  buildCorrectionOperations,
  buildDeckPayload,
  buildManifestCore,
  buildMainContentPayload,
  buildPhraseEntries,
  countForPayload,
  deriveOrThrow,
  isoTimestamp,
  packetKindForEntries,
  semverFromVersion,
  slugifyText,
  type EntryLike,
  type PacketRowLike,
} from "./buildPayload";

function entry(partial: Partial<EntryLike> & Pick<EntryLike, "kind" | "payload">): EntryLike {
  return { language: "ko", sourceSubmissionId: "sub_1", ...partial };
}

describe("packetKindForEntries", () => {
  test("maps each family to its contract kind", () => {
    expect(packetKindForEntries([entry({ kind: "phrase", payload: {} })])).toEqual({
      ok: true,
      kind: "phrase-pack",
    });
    expect(packetKindForEntries([entry({ kind: "exampleSentence", payload: {} })]).ok).toBe(true);
    expect(packetKindForEntries([entry({ kind: "card", payload: {} })])).toEqual({
      ok: true,
      kind: "deck-pack",
    });
    expect(packetKindForEntries([entry({ kind: "correction", payload: {} })])).toEqual({
      ok: true,
      kind: "dictionary-correction",
    });
    // situationPack is phrase-family too
    expect(packetKindForEntries([entry({ kind: "situationPack", payload: {} })])).toEqual({
      ok: true,
      kind: "phrase-pack",
    });
  });

  test("rejects empty and cross-family packets", () => {
    expect(packetKindForEntries([]).ok).toBe(false);
    const mixed = packetKindForEntries([
      entry({ kind: "correction", payload: {} }),
      entry({ kind: "phrase", payload: {} }),
    ]);
    expect(mixed.ok).toBe(false);
    if (!mixed.ok) expect(mixed.reason).toContain("mixed");
  });

  test("deriveOrThrow surfaces the reason as an Error", () => {
    expect(() => deriveOrThrow([])).toThrow(/no entries/);
  });
});

describe("slugifyText / ids", () => {
  test("ascii slugs are kebab-cased and trimmed", () => {
    expect(slugifyText("Iced Americano!!")).toBe("iced-americano");
    expect(slugifyText("  여기서 마실 거예요 ")).toBe("entry"); // non-ascii falls back
    expect(slugifyText("café con leche")).toBe("cafe-con-leche"); // diacritics stripped
  });

  test("phrase ids are sequential zero-padded ordinals (unique per packet)", () => {
    const entries = [
      entry({ kind: "phrase", payload: { text: "Same", english: "same" } }),
      entry({ kind: "phrase", payload: { text: "Same", english: "same again" } }),
      entry({
        kind: "phrase",
        sourceSubmissionId: undefined,
        payload: { text: "Other", english: "other" },
      }),
    ];
    const phrases = buildPhraseEntries(entries, "ko");
    expect(phrases.map((p) => p.id)).toEqual([
      "ko-phrase-001-same",
      "ko-phrase-002-same",
      "ko-phrase-003-other",
    ]);
  });

  test("CJK text slugs fall back to the English gloss, like the doc example", () => {
    expect(slugifyText("여기서 마실 거예요")).toBe("entry"); // non-ascii alone falls back
    const [p] = buildPhraseEntries(
      [
        entry({
          kind: "phrase",
          language: "ko",
          payload: { text: "아이스 아메리카노", english: "Iced americano" },
        }),
      ],
      "ko",
    );
    expect(p!.id).toBe("ko-phrase-001-iced-americano");
  });
});

describe("buildPhraseEntries", () => {
  test("maps submission fields onto the contract shape with honest defaults", () => {
    const [p] = buildPhraseEntries(
      [
        entry({
          kind: "phrase",
          language: "ja",
          sourceSubmissionId: "sub_9",
          payload: {
            text: "本を読みます。",
            english: "I read a book.",
            romanization: "hon o yomimasu.",
            situation: "study",
            register: "formal",
            notes: "です/ます form.",
          },
        }),
      ],
      "ja",
    );
    expect(p).toEqual({
      id: "ja-phrase-001-i-read-a-book", // slug from the English gloss
      text: "本を読みます。",
      romanization: "hon o yomimasu.",
      gloss: { en: "I read a book." },
      register: "formal",
      level: "JLPT-N5", // per-language default
      scenario: "study",
      tags: [],
      notes: "です/ます form.",
      sources: ["sub_9"],
    });
  });

  test("missing optional fields become nulls/neutral/level defaults, never undefined", () => {
    const [p] = buildPhraseEntries(
      [entry({ kind: "phrase", payload: { text: "안녕", english: "hi" } })],
      "ko",
    );
    expect(p!.romanization).toBeNull();
    expect(p!.notes).toBeNull();
    expect(p!.register).toBe("neutral");
    expect(p!.level).toBe("TOPIK-1");
    expect(p!.scenario).toBe("general");
    expect(Object.values(p!).every((v) => v !== undefined)).toBe(true);
  });

  test("situationPack fans out into one entry per phrase sharing the source id", () => {
    const phrases = buildPhraseEntries(
      [
        entry({
          kind: "situationPack",
          language: "zh",
          sourceSubmissionId: "sub_pack",
          payload: {
            situation: "restaurant",
            phrases: [
              { text: "菜单，谢谢", english: "The menu, please" },
              { text: "买单", english: "Check, please" },
            ],
          },
        }),
      ],
      "zh",
    );
    expect(phrases.map((p) => p.text)).toEqual(["菜单，谢谢", "买单"]);
    expect(phrases.every((p) => p.sources.includes("sub_pack"))).toBe(true);
    expect(phrases[0]!.scenario).toBe("general"); // pack-level situation not yet propagated
  });

  test("exampleSentence becomes a phrase entry annotated with its headword", () => {
    const [p] = buildPhraseEntries(
      [
        entry({
          kind: "exampleSentence",
          language: "ja",
          payload: {
            sentence: "毎朝コーヒーを飲みます。",
            english: "I drink coffee every morning.",
            targetHeadword: "飲む",
          },
        }),
      ],
      "ja",
    );
    expect(p!.text).toBe("毎朝コーヒーを飲みます。");
    expect(p!.scenario).toBe("sentences");
    expect(p!.notes).toBe('Example sentence for "飲む".');
  });
});

describe("buildDeckPayload", () => {
  test("card_count matches cards and card fields follow the contract", () => {
    const deck = buildDeckPayload(
      [
        entry({
          kind: "card",
          language: "ja",
          payload: { front: "猫", back: "cat", reading: "ねこ" },
        }),
        entry({
          kind: "card",
          language: "ja",
          payload: { front: "海", back: "sea", sourcePhraseId: "ja-phrase-003-umi" },
        }),
      ],
      "ja",
      { name: "Animals (Japanese)", description: "Starter nouns." },
    );
    expect(deck.deck.card_count).toBe(2);
    expect(deck.deck.srs_hint).toBe("fsrs");
    expect(deck.cards[0]).toEqual({
      id: "ja-card-001-cat", // CJK front slugs fall back to the English back
      front: "猫",
      back: "cat",
      reading: "ねこ",
      tags: [],
      source_phrase_id: null,
    });
    expect(deck.cards[1]!.source_phrase_id).toBe("ja-phrase-003-umi");
  });
});

describe("buildCorrectionOperations", () => {
  test("emits exactly the documented 'correct' fields with a safe empty old_value", () => {
    const ops = buildCorrectionOperations([
      entry({
        kind: "correction",
        language: "zh",
        payload: {
          targetType: "dictionaryEntry",
          targetId: "jd7abc",
          field: "reading",
          proposedValue: "nǐ hǎo",
        },
      }),
    ]);
    expect(ops).toEqual([
      {
        op: "correct",
        target_id: "jd7abc",
        field: "reading",
        old_value: "", // consumer skips+reports on mismatch; never force-writes
        new_value: "nǐ hǎo",
        confidence: 0.5,
      },
    ]);
  });

  test("confidence is clamped into [0,1]", () => {
    const op = buildCorrectionOperations([
      entry({ kind: "correction", payload: { targetId: "x", confidence: 7 } }),
    ])[0]!;
    expect(op.confidence).toBe(1);
  });
});

describe("semverFromVersion / isoTimestamp", () => {
  test("numeric DB versions map to SemVer majors", () => {
    expect(semverFromVersion(1)).toBe("1.0.0");
    expect(semverFromVersion(3)).toBe("3.0.0");
    expect(semverFromVersion(2.7)).toBe("2.0.0");
    expect(semverFromVersion(0)).toBe("1.0.0");
  });

  test("isoTimestamp ends in Z", () => {
    expect(isoTimestamp(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(isoTimestamp(Date.UTC(2026, 7, 25))).toMatch(/^2026-08-25T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("buildManifestCore — round trip through the validator", () => {
  const row: PacketRowLike = {
    packetId: "ko-phrase-pack-cafe-ordering",
    language: "ko",
    version: 1,
    status: "draft",
    createdAt: Date.UTC(2026, 7, 25, 9),
    publishedAt: undefined,
    entries: [
      entry({
        kind: "phrase",
        payload: {
          text: "아이스 아메리카노 한 잔 주세요.",
          english: "One iced americano, please.",
          romanization: "aiseu amerikano han jan juseyo.",
        },
      }),
      entry({
        kind: "phrase",
        sourceSubmissionId: "sub_2",
        payload: { text: "텀블러 가져왔어요.", english: "I brought my own tumbler." },
      }),
    ],
  };

  test("draft rows map to contract status 'refined' and carry provenance", () => {
    const m = buildManifestCore(row);
    expect(m.status).toBe("refined");
    expect(m.okf_version).toBe("0.2");
    expect(m.license).toBe("CC-BY-4.0");
    expect(m.provenance.submission_ids).toEqual(["sub_1", "sub_2"]);
    expect(m.structure.main_content).toBe("phrases.json");
    expect(m.version).toBe("1.0.0");
  });

  test("published rows map to 'approved' and use publishedAt for last_updated", () => {
    const m = buildManifestCore({
      ...row,
      status: "published",
      publishedAt: Date.UTC(2026, 7, 26, 10),
    });
    expect(m.status).toBe("approved");
    expect(m.last_updated).toBe("2026-08-26T10:00:00.000Z");
  });

  test("after the exporter injects checksums+count the manifest validates clean", () => {
    const m = buildManifestCore(row);
    const payload = buildMainContentPayload(m.kind, row.entries, m.language, {
      name: m.name,
      description: m.description,
    });
    const count = countForPayload(m.kind, payload);
    // what scripts/export-packets.ts does before writing anything:
    m.payload.count = count;
    m.payload.checksums = {
      [m.structure.main_content]: `sha256:${"c".repeat(64)}`,
    };
    expect(validateManifest(m, { actualCount: count })).toEqual([]);
  });

  test("pre-export manifest honestly fails validation until checksums exist", () => {
    const m = buildManifestCore(row);
    const issues = validateManifest(m);
    expect(issues.map((i) => i.code)).toContain("payload.checksums.missing_file");
  });
});
