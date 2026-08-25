import { v } from "convex/values";

/**
 * Shared validators + TS types for community content submissions and the
 * published content packets they feed. Kept in their own module (no server
 * imports) so both schema.ts and submissions.ts can use them without an
 * import cycle.
 *
 * The new product direction: the COMMUNITY submits learning content
 * (phrases, deck cards, dictionary corrections, example sentences,
 * situational phrase packs); AI agents refine it; refined content is
 * published to everyone as versioned OKF-style knowledge packets.
 */

// Submissions are limited to the priority languages for now. th/vi remain
// valid elsewhere in the schema but aren't open for community submission.
export const submissionLanguage = v.union(v.literal("ko"), v.literal("ja"), v.literal("zh"));
export type SubmissionLanguage = "ko" | "ja" | "zh";

export const submissionKind = v.union(
  v.literal("phrase"),
  v.literal("card"),
  v.literal("correction"),
  v.literal("exampleSentence"),
  v.literal("situationPack"),
);
export type SubmissionKind = "phrase" | "card" | "correction" | "exampleSentence" | "situationPack";

// One validator per submission kind. Every shape carries its English
// gloss so the refinement agents always have the learner-facing meaning
// to check against, regardless of kind.
const phrasePayload = v.object({
  text: v.string(),
  english: v.string(),
  romanization: v.optional(v.string()),
  situation: v.optional(v.string()),
});

const cardPayload = v.object({
  front: v.string(),
  back: v.string(),
  notes: v.optional(v.string()),
});

const correctionPayload = v.object({
  // Which table the correction targets. targetId is a string rather than
  // v.id(...) because the target table varies per submission and Convex
  // id types are table-specific.
  targetType: v.union(v.literal("dictionaryEntry"), v.literal("phrase"), v.literal("card")),
  targetId: v.string(),
  field: v.string(),
  proposedValue: v.string(),
  reason: v.optional(v.string()),
});

const exampleSentencePayload = v.object({
  sentence: v.string(),
  english: v.string(),
  // Optional dictionary headword this sentence exemplifies, so refinement
  // can attach it to the right entry.
  targetHeadword: v.optional(v.string()),
});

const situationPackPayload = v.object({
  situation: v.string(),
  phrases: v.array(
    v.object({
      text: v.string(),
      english: v.string(),
      romanization: v.optional(v.string()),
    }),
  ),
});

export const submissionPayload = v.union(
  phrasePayload,
  cardPayload,
  correctionPayload,
  exampleSentencePayload,
  situationPackPayload,
);
export type SubmissionPayload = {
  text?: string;
  english?: string;
  romanization?: string;
  situation?: string;
  front?: string;
  back?: string;
  notes?: string;
  targetType?: "dictionaryEntry" | "phrase" | "card";
  targetId?: string;
  field?: string;
  proposedValue?: string;
  reason?: string;
  sentence?: string;
  targetHeadword?: string;
  phrases?: { text: string; english: string; romanization?: string }[];
};

// One entry inside a published packet: the refined payload plus where it
// came from, so provenance survives into the OKF artifact.
export const packetEntry = v.object({
  kind: submissionKind,
  language: submissionLanguage,
  payload: v.any(), // refined payload — post-AI shape may differ from the submitted one
  sourceSubmissionId: v.optional(v.id("submissions")),
});
export type PacketEntry = {
  kind: "phrase" | "card" | "correction" | "exampleSentence" | "situationPack";
  language: SubmissionLanguage;
  payload: unknown;
  sourceSubmissionId?: string;
};
