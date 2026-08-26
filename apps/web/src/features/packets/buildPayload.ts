/**
 * Pure mapping from contentPackets rows (convex schema) to the OKF v0.2
 * runtime payload shapes defined in docs/knowledge/content-packet-format.md.
 * No Convex imports — EntryLike mirrors convex/submissionTypes.ts
 * PacketEntry structurally so this module stays usable from scripts.
 *
 * Checksums are NOT produced here: only bytes on disk can be hashed, and
 * those bytes exist at export time. The exporter fills manifest.payload.
 */

import {
  MAIN_CONTENT_BY_KIND,
  OKF_VERSION,
  MANIFEST_FORMAT,
  PAYLOAD_SCHEMA_VERSION,
  type OkfManifest,
  type PacketKind,
} from "./manifest";

/** Structural mirror of a contentPackets entry (see submissionTypes.ts). */
export interface EntryLike {
  kind: "phrase" | "card" | "correction" | "exampleSentence" | "situationPack";
  language: string;
  payload: unknown;
  sourceSubmissionId?: string;
}

export type PacketRowStatus = "draft" | "published";

export interface PacketRowLike {
  packetId: string;
  language: string;
  version: number;
  status: PacketRowStatus;
  createdAt: number;
  publishedAt?: number;
  entries: EntryLike[];
}

/** Which of the three contract kinds an entry belongs to. */
type KindFamily = "phrase" | "deck" | "correction";

const FAMILY_BY_ENTRY_KIND: Record<EntryLike["kind"], KindFamily> = {
  phrase: "phrase",
  exampleSentence: "phrase",
  situationPack: "phrase",
  card: "deck",
  correction: "correction",
};

const KIND_BY_FAMILY: Record<KindFamily, PacketKind> = {
  phrase: "phrase-pack",
  deck: "deck-pack",
  correction: "dictionary-correction",
};

const KIND_LABELS: Record<PacketKind, string> = {
  "phrase-pack": "Phrase pack",
  "deck-pack": "Deck pack",
  "dictionary-correction": "Dictionary correction batch",
};

const LANGUAGE_NAMES: Record<string, string> = { ko: "Korean", ja: "Japanese", zh: "Mandarin" };

/** Consistent default learner-level tag per language (doc: free-form but consistent). */
const DEFAULT_LEVELS: Record<string, string> = {
  ko: "TOPIK-1",
  ja: "JLPT-N5",
  zh: "HSK-1",
};

/**
 * Derive the packet kind from its entries. Entries must all belong to one
 * family — a packet mixing corrections with phrases has no main_content
 * filename under the contract, so it is rejected instead of guessed.
 */
export function packetKindForEntries(
  entries: readonly EntryLike[],
): { ok: true; kind: PacketKind } | { ok: false; reason: string } {
  if (entries.length === 0) {
    return { ok: false, reason: "packet has no entries" };
  }
  const families = new Set(entries.map((e) => FAMILY_BY_ENTRY_KIND[e.kind]));
  if (families.size > 1) {
    return {
      ok: false,
      reason: `mixed entry kinds (${[...families].join(" + ")}) cannot share one packet`,
    };
  }
  return { ok: true, kind: KIND_BY_FAMILY[[...families][0]!] };
}

export function deriveOrThrow(entries: readonly EntryLike[]): PacketKind {
  const decided = packetKindForEntries(entries);
  if (!decided.ok) throw new Error(`Cannot build packet: ${decided.reason}.`);
  return decided.kind;
}

/**
 * DB numeric version -> SemVer. contentPackets.version counts major
 * versions (1, 2, ...); minor/patch have no DB counterpart yet.
 */
export function semverFromVersion(version: number): string {
  const major = Math.max(1, Math.trunc(version));
  return `${major}.0.0`;
}

/** Epoch ms -> ISO-8601 UTC ("Z") as required for created/last_updated. */
export function isoTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * ASCII kebab slug from arbitrary text, used in entry ids. Falls back to
 * "entry" when nothing usable survives (e.g. pure-CJK text).
 */
export function slugifyText(text: string): string {
  const ascii = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return ascii.length > 0 ? ascii : "entry";
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/**
 * Sequential `<prefix><zero-padded ordinal>-<slug>` ids. The ordinal
 * alone guarantees within-packet uniqueness (contract rule: entry ids
 * unique per packet); the slug keeps them readable.
 */
function assignIds(items: { prefix: string; slug: string }[]): string[] {
  return items.map(({ prefix, slug }, i) => `${prefix}${pad3(i + 1)}-${slug}`);
}

/**
 * Pick the most ASCII-sluggable text available. Mirrors the doc's own
 * example ("ko-phrase-001-iced-americano" from Korean text): CJK text
 * falls back to the English gloss, then romanization, then "entry".
 */
function pickSlug(text: unknown, english?: unknown, romanization?: unknown): string {
  const candidates = [
    typeof text === "string" ? text : "",
    typeof english === "string" ? english : "",
    typeof romanization === "string" ? romanization : "",
  ];
  for (const candidate of candidates) {
    const slug = slugifyText(candidate);
    if (slug !== "entry") return slug;
  }
  return "entry";
}

// ---------------------------------------------------------------------------
// Runtime payload shapes (contract "Payload schemas")
// ---------------------------------------------------------------------------

export interface PhraseEntry {
  id: string;
  text: string;
  romanization: string | null;
  gloss: Record<string, string>;
  register: string;
  level: string;
  scenario: string;
  tags: string[];
  notes: string | null;
  sources: string[];
}

export interface DeckPayload {
  deck: {
    name: string;
    language: string;
    description: string;
    srs_hint: "fsrs" | "sm-2";
    card_count: number;
  };
  cards: {
    id: string;
    front: string;
    back: string;
    reading: string | null;
    tags: string[];
    source_phrase_id: string | null;
  }[];
}

export interface CorrectionOperation {
  op: "correct" | "merge" | "flag";
  target_id: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  into_id?: string;
  reason?: string;
  confidence: number;
}

function phraseFromSubmission(
  raw: unknown,
  language: string,
  sourceId: string | undefined,
  scenarioFallback: string,
): Omit<PhraseEntry, "id"> {
  const p = isObject(raw) ? raw : {};
  // TODO(refinement): submissions carry no politeness register yet — the
  // refinement worker should set it; "neutral" is the honest placeholder.
  const register = str(p.register) ?? "neutral";
  return {
    text: typeof p.text === "string" ? p.text : "",
    romanization: str(p.romanization) ?? null,
    gloss: { en: typeof p.english === "string" ? p.english : "" },
    register,
    level: str(p.level) ?? DEFAULT_LEVELS[language] ?? "TOPIK-1",
    scenario: str(p.situation ?? p.scenario) ?? scenarioFallback,
    tags: Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === "string") : [],
    notes: str(p.notes) ?? null,
    sources: sourceId ? [sourceId] : [],
  };
}

/** Flatten every entry into phrase-pack entries (situationPacks fan out). */
export function buildPhraseEntries(entries: readonly EntryLike[], language: string): PhraseEntry[] {
  const flat: { body: Omit<PhraseEntry, "id">; slug: string }[] = [];
  for (const entry of entries) {
    if (entry.kind === "situationPack" && isObject(entry.payload)) {
      const phrases = Array.isArray(entry.payload.phrases) ? entry.payload.phrases : [];
      for (const raw of phrases) {
        const p = isObject(raw) ? raw : {};
        flat.push({
          body: phraseFromSubmission(p, language, entry.sourceSubmissionId, "general"),
          slug: pickSlug(p.text, p.english, p.romanization),
        });
      }
      continue;
    }
    const p = isObject(entry.payload) ? entry.payload : {};
    if (entry.kind === "exampleSentence") {
      const headword = str(p.targetHeadword);
      flat.push({
        body: {
          ...phraseFromSubmission(
            { ...p, text: p.sentence },
            language,
            entry.sourceSubmissionId,
            "sentences",
          ),
          notes: str(p.notes) ?? (headword ? `Example sentence for "${headword}".` : null),
        },
        slug: pickSlug(p.sentence, p.english),
      });
      continue;
    }
    flat.push({
      body: phraseFromSubmission(entry.payload, language, entry.sourceSubmissionId, "general"),
      slug: pickSlug(p.text, p.english, p.romanization),
    });
  }
  const ids = assignIds(flat.map((f) => ({ prefix: `${language}-phrase-`, slug: f.slug })));
  return flat.map((f, i) => ({ id: ids[i]!, ...f.body }));
}

export function buildDeckPayload(
  entries: readonly EntryLike[],
  language: string,
  meta: { name: string; description: string },
): DeckPayload {
  const specs = entries.map((entry) => {
    const p = isObject(entry.payload) ? entry.payload : {};
    return { p, slug: pickSlug(p.front, p.back, p.reading) };
  });
  const ids = assignIds(specs.map((s) => ({ prefix: `${language}-card-`, slug: s.slug })));
  const cards = specs.map(({ p }, i) => ({
    id: ids[i]!,
    front: typeof p.front === "string" ? p.front : "",
    back: typeof p.back === "string" ? p.back : "",
    reading: str(p.reading) ?? null,
    tags: Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === "string") : [],
    source_phrase_id: str(p.sourcePhraseId ?? p.source_phrase_id) ?? null,
  }));
  return {
    deck: {
      name: meta.name,
      language,
      description: meta.description,
      srs_hint: "fsrs",
      card_count: cards.length,
    },
    cards,
  };
}

export function buildCorrectionOperations(entries: readonly EntryLike[]): CorrectionOperation[] {
  return entries.map((entry) => {
    const p = isObject(entry.payload) ? entry.payload : {};
    const confidence =
      typeof p.confidence === "number" ? Math.min(1, Math.max(0, p.confidence)) : 0.5;
    // old_value is intentionally empty: community submissions do not know
    // the current dictionary value. Per the consumer contract a mismatched
    // old_value is skipped and reported — never force-written.
    return {
      op: "correct" as const,
      target_id: typeof p.targetId === "string" ? p.targetId : "",
      field: typeof p.field === "string" ? p.field : undefined,
      old_value: "",
      new_value: typeof p.proposedValue === "string" ? p.proposedValue : undefined,
      confidence,
    };
  });
}

export function buildMainContentPayload(
  kind: PacketKind,
  entries: readonly EntryLike[],
  language: string,
  meta: { name: string; description: string },
): Record<string, unknown> {
  switch (kind) {
    case "phrase-pack":
      return { entries: buildPhraseEntries(entries, language) };
    case "deck-pack":
      return buildDeckPayload(entries, language, meta) as unknown as Record<string, unknown>;
    case "dictionary-correction":
      return { operations: buildCorrectionOperations(entries) };
  }
}

/** Entry count the consumer cross-checks against payload.count. */
export function countForPayload(kind: PacketKind, payload: unknown): number {
  if (kind === "phrase-pack" && isObject(payload) && Array.isArray(payload.entries)) {
    return payload.entries.length;
  }
  if (kind === "deck-pack" && isObject(payload) && Array.isArray(payload.cards)) {
    return payload.cards.length;
  }
  if (kind === "dictionary-correction" && isObject(payload) && Array.isArray(payload.operations)) {
    return payload.operations.length;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Manifest core assembly
// ---------------------------------------------------------------------------

/**
 * Assemble the OKF manifest from a contentPackets row. DB lifecycle maps
 * onto the contract's: draft -> "refined", published -> "approved".
 *
 * payload.checksums is left empty — the exporter hashes real file bytes
 * and fills it in before writing anything.
 */
// TODO(license): CC-BY-4.0 is a stand-in default. Confirm attribution
// expectations for community contributions with legal/product before the
// first real publish; flip per-packet here or surface as a moderator choice.
export const DEFAULT_LICENSE = "CC-BY-4.0";
export const REFINED_BY = "asian-web-builder/0.1.0";

export function buildManifestCore(row: PacketRowLike): OkfManifest {
  const kind = deriveOrThrow(row.entries);
  const submissionIds = [
    ...new Set(
      row.entries
        .map((e) => e.sourceSubmissionId)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const lastUpdatedMs =
    row.status === "published" && row.publishedAt ? row.publishedAt : row.createdAt;
  const label = KIND_LABELS[kind];
  const langName = LANGUAGE_NAMES[row.language] ?? row.language;

  return {
    okf_version: OKF_VERSION,
    package_id: row.packetId,
    kind,
    version: semverFromVersion(row.version),
    name: row.packetId, // TODO(moderator UI): human-readable name editing.
    description:
      `${label} for ${langName} learners, refined from ${submissionIds.length} community ` +
      `submission(s). TODO(moderator UI): replace with a human summary before approval.`,
    language: row.language,
    license: DEFAULT_LICENSE,
    status: row.status === "published" ? "approved" : "refined",
    created: isoTimestamp(row.createdAt),
    last_updated: isoTimestamp(lastUpdatedMs),
    categories: [kind],
    tags: [row.language],
    format: MANIFEST_FORMAT,
    structure: {
      type: "distribution",
      main_content: MAIN_CONTENT_BY_KIND[kind],
      reference: [],
    },
    payload: {
      schema_version: PAYLOAD_SCHEMA_VERSION,
      count: 0, // exporter overwrites with countForPayload(...) before validating
      checksums: {},
    },
    provenance: {
      source: "community-submissions",
      submission_ids: submissionIds,
      refined_by: REFINED_BY,
      reviewed_by: null, // set by a human on approval — never auto-filled
    },
  };
}
