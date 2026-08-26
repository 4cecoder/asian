#!/usr/bin/env bun
/**
 * Converts the kaikki.org machine-readable Korean dictionary (English
 * Wiktionary Korean section, extracted by wiktextract) into JSONL matching
 * the `dictionaryEntries` table schema.
 *
 * Source: https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl
 * License: Wiktionary text is dual-licensed CC BY-SA 3.0 + GFDL; this data
 * carries both licenses (see kaikki.org copyright page). Attribution lives
 * in each row's `sourceName`; share-alike applies to redistribution.
 *
 * Usage:
 *   curl -sL -o /tmp/kaikki-ko-en.jsonl \
 *     https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl
 *   bun run convex/seed/build-wiktionary-ko.ts /tmp/kaikki-ko-en.jsonl \
 *     > convex/seed/dictionary-ko.jsonl
 *
 * Notes:
 * - One output row per headword: multiple Wiktionary lines for the same
 *   word (separate etymologies/POS) are merged into one entry with combined
 *   glosses — unlike JMdict where each <entry> is already unique.
 * - Romanization comes from Wiktionary's Revised Romanization forms
 *   (`forms[].tags` containing "romanization"); McCune–Reischauer/Yale are
 *   not modeled here.
 * - Non-Hangul headwords (hanja "character"/"syllable" glyph entries,
 *   punctuation, symbols) are dropped: the search index serves Hangul
 *   prefix queries, and hanja glyphs would pollute it. Quality over
 *   quantity — this pass keeps only entries with real English glosses.
 */

type Sense = { glosses?: unknown; raw_glosses?: unknown };
type Form = { form?: string; tags?: string[] };

type WiktEntry = {
  word?: string;
  lang_code?: string;
  pos?: string;
  senses?: Sense[];
  forms?: Form[];
};

const path = process.argv[2];
if (!path) {
  console.error("Usage: bun run build-wiktionary-ko.ts <path-to-kaikki-ko-en.jsonl>");
  process.exit(1);
}

const POS_LABELS: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adj: "adjective",
  adv: "adverb",
  name: "proper name",
  pron: "pronoun",
  det: "determiner",
  num: "numeral",
  particle: "particle",
  counter: "counter",
  conj: "conjunction",
  intj: "interjection",
  phrase: "phrase",
  proverb: "proverb",
  suffix: "suffix",
  prefix: "prefix",
  contraction: "contraction",
  root: "root",
  postp: "postposition",
  affix: "affix",
  interfix: "interfix",
  romanization: "romanization",
};

// POS whose entries are hanja glyphs or non-word tokens, not learner vocabulary.
const EXCLUDED_POS = new Set(["character", "syllable", "punct", "symbol"]);

function hasHangul(s: string): boolean {
  return /[\uac00-\ud7af\u1100-\u11ff]/.test(s);
}

const text = await Bun.file(path).text();

type Merged = {
  reading?: string;
  partOfSpeech: Set<string>;
  definitions: string[];
};

const byHeadword = new Map<string, Merged>();

for (const line of text.split(/\r?\n/)) {
  if (!line.trim()) continue;
  let d: WiktEntry;
  try {
    d = JSON.parse(line) as WiktEntry;
  } catch {
    continue;
  }
  if (d.lang_code !== "ko") continue;

  const headword = d.word as string | undefined;
  if (!headword || !hasHangul(headword)) continue;
  if (d.pos && EXCLUDED_POS.has(d.pos)) continue;

  const glosses: string[] = [];
  for (const sense of d.senses ?? []) {
    // raw_glosses keep qualifier parentheses ("(South Korea) ...") that
    // `glosses` strips — prefer them when present, they read like a real
    // dictionary entry.
    const g = (sense.raw_glosses ?? sense.glosses) as unknown;
    if (Array.isArray(g)) {
      for (const x of g) {
        if (typeof x === "string" && x.length > 0) glosses.push(x);
      }
    }
  }
  if (glosses.length === 0) continue;

  const roman = (d.forms ?? []).find(
    (f: Form) => Array.isArray(f.tags) && f.tags.includes("romanization"),
  )?.form;

  let merged = byHeadword.get(headword);
  if (!merged) {
    merged = { partOfSpeech: new Set(), definitions: [] };
    byHeadword.set(headword, merged);
  }
  if (!merged.reading && roman) merged.reading = roman;
  if (POS_LABELS[d.pos]) merged.partOfSpeech.add(POS_LABELS[d.pos]);
  for (const def of glosses) {
    if (!merged.definitions.includes(def)) merged.definitions.push(def);
  }
}

let count = 0;
const out: string[] = [];
for (const [headword, merged] of byHeadword) {
  const entry: Record<string, unknown> = {
    language: "ko",
    headword,
    reading: merged.reading,
    partOfSpeech: merged.partOfSpeech.size > 0 ? [...merged.partOfSpeech].join(", ") : undefined,
    definitions: merged.definitions,
    frequencyRank: undefined,
    sourceName: "English Wiktionary (via kaikki.org/Wiktextract, CC BY-SA 3.0)",
  };
  out.push(JSON.stringify(entry));
  count++;
}

console.error(`Parsed ${count} Korean entries from ${text.split("\n").length} source lines.`);
process.stdout.write(out.join("\n") + "\n");
