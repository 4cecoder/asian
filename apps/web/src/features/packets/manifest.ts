/**
 * OKF v0.2 runtime content-packet manifest: shared types + pure
 * validation. Implements docs/knowledge/content-packet-format.md
 * ("Manifest schema" + "Field rules") as structured errors instead of
 * throws, so callers (builder preview, export script) can batch-report
 * problems. No imports — this module is shared by Convex functions,
 * unit tests, and scripts/export-packets.ts.
 */

export const OKF_VERSION = "0.2";
export const PAYLOAD_SCHEMA_VERSION = "1";
export const MANIFEST_FORMAT = "okf-v0.2";

export const PACKET_KINDS = ["phrase-pack", "deck-pack", "dictionary-correction"] as const;
export type PacketKind = (typeof PACKET_KINDS)[number];

/** Contract lifecycle (docs line: submitted -> refined -> approved|rejected). */
export const PACKET_STATUSES = ["submitted", "refined", "approved", "rejected"] as const;
export type PacketStatus = (typeof PACKET_STATUSES)[number];

/**
 * Public licenses only — the doc names exactly these two for community
 * content. Anything else is rejected.
 */
export const ALLOWED_LICENSES = ["CC0", "CC-BY-4.0"] as const;

/** Main payload filename per kind (doc: "Name it after the kind"). */
export const MAIN_CONTENT_BY_KIND: Record<PacketKind, string> = {
  "phrase-pack": "phrases.json",
  "deck-pack": "deck.json",
  "dictionary-correction": "corrections.json",
};

export interface OkfManifest {
  okf_version: string;
  package_id: string;
  kind: PacketKind;
  version: string;
  name: string;
  description: string;
  language: string;
  license: string;
  status: PacketStatus;
  created: string;
  last_updated: string;
  categories: string[];
  tags: string[];
  format: string;
  structure: {
    type: "distribution";
    main_content: string;
    reference?: string[];
  };
  payload: {
    schema_version: string;
    count: number;
    /** filename -> "sha256:<64 hex>". Filled by the exporter, never guessed. */
    checksums: Record<string, string>;
  };
  provenance: {
    source: string;
    submission_ids: string[];
    refined_by: string;
    reviewed_by: string | null;
  };
}

export interface ValidationIssue {
  /** Dotted location inside the manifest, e.g. "payload.checksums.phrases.json". */
  path: string;
  /** Stable machine-readable code — tests and tooling match on this. */
  code: string;
  message: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const BCP47_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/;
const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const SHA256_RE = /^sha256:[0-9a-f]{64}$/;
const WORKER_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[0-9][A-Za-z0-9.+_-]*$/;

function isIsoUtcTimestamp(value: unknown): value is string {
  return typeof value === "string" && ISO_UTC_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Validate one manifest against docs/knowledge/content-packet-format.md.
 * Returns every violation found ([] means valid).
 *
 * `opts.actualCount` enables the consumer-contract check "payload.count
 * equals the actual entry count" for callers that have the parsed payload
 * at hand (the exporter passes it; the bare builder cannot).
 */
export function validateManifest(
  input: unknown,
  opts?: { actualCount?: number },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message });

  if (!isObject(input)) {
    add("", "type.not_object", "Manifest must be a JSON object.");
    return issues;
  }
  const m = input;

  // --- scalar header fields -------------------------------------------------
  if (m.okf_version === undefined) add("okf_version", "okf_version.missing", "Required.");
  else if (m.okf_version !== OKF_VERSION) {
    add("okf_version", "okf_version.invalid", `Must be "${OKF_VERSION}".`);
  }

  if (m.package_id === undefined) add("package_id", "package_id.missing", "Required.");
  else if (typeof m.package_id !== "string" || m.package_id.length === 0) {
    add("package_id", "package_id.format", "Must be a non-empty string.");
  }

  if (m.kind === undefined) add("kind", "kind.missing", "Required.");
  else if (typeof m.kind !== "string" || !PACKET_KINDS.includes(m.kind as PacketKind)) {
    add("kind", "kind.invalid", `Must be one of ${PACKET_KINDS.join(", ")}.`);
  }

  if (m.version === undefined) add("version", "version.missing", "Required.");
  else if (typeof m.version !== "string" || !SEMVER_RE.test(m.version)) {
    add("version", "version.semver", 'Must be SemVer, e.g. "1.0.0".');
  }

  if (m.name === undefined) add("name", "name.missing", "Required.");
  else if (typeof m.name !== "string") add("name", "name.format", "Must be a string.");
  else if (m.name.trim().length === 0) add("name", "name.empty", "Must not be blank.");

  if (m.description === undefined) add("description", "description.missing", "Required.");
  else if (typeof m.description !== "string") {
    add("description", "description.format", "Must be a string.");
  }

  if (m.language === undefined) add("language", "language.missing", "Required.");
  else if (typeof m.language !== "string" || !BCP47_RE.test(m.language)) {
    add("language", "language.format", "Must be a BCP-47 tag, e.g. ko, ja, zh-Hans.");
  }

  // Doc: public licenses only (CC0, CC-BY-4.0). Reject everything else.
  if (m.license === undefined) add("license", "license.missing", "Required.");
  else if (
    typeof m.license !== "string" ||
    !(ALLOWED_LICENSES as readonly string[]).includes(m.license)
  ) {
    add(
      "license",
      "license.not_public",
      `Community content publishes, so license must be one of ${ALLOWED_LICENSES.join(", ")}.`,
    );
  }

  if (m.status === undefined) add("status", "status.missing", "Required.");
  else if (typeof m.status !== "string" || !PACKET_STATUSES.includes(m.status as PacketStatus)) {
    add("status", "status.invalid", `Lifecycle must be one of ${PACKET_STATUSES.join(", ")}.`);
  }

  if (m.created === undefined) add("created", "created.missing", "Required.");
  else if (!isIsoUtcTimestamp(m.created)) {
    add("created", "created.format", "Must be an ISO-8601 UTC timestamp ending in Z.");
  }

  if (m.last_updated === undefined) {
    add("last_updated", "last_updated.missing", "Required.");
  } else if (!isIsoUtcTimestamp(m.last_updated)) {
    add("last_updated", "last_updated.format", "Must be an ISO-8601 UTC timestamp ending in Z.");
  }

  if (
    isIsoUtcTimestamp(m.created) &&
    isIsoUtcTimestamp(m.last_updated) &&
    Date.parse(m.last_updated) < Date.parse(m.created)
  ) {
    add("last_updated", "timestamps.order", "last_updated must not precede created.");
  }

  if (m.format === undefined) add("format", "format.missing", "Required.");
  else if (m.format !== MANIFEST_FORMAT) {
    add("format", "format.invalid", `Must be "${MANIFEST_FORMAT}".`);
  }

  // categories/tags are shown in the doc's schema but absent from its
  // required-field table — validate shape when present, don't demand them.
  if (m.categories !== undefined && !isStringArray(m.categories)) {
    add("categories", "categories.format", "Must be an array of strings when present.");
  }
  if (m.tags !== undefined && !isStringArray(m.tags)) {
    add("tags", "tags.format", "Must be an array of strings when present.");
  }

  // --- package_id convention: <language>-<kind>-<slug>, kebab-case --------
  if (typeof m.package_id === "string" && m.package_id.length > 0) {
    if (!KEBAB_RE.test(m.package_id)) {
      add("package_id", "package_id.format", "Must be kebab-case ([a-z0-9]-separated).");
    }
    const language =
      typeof m.language === "string" && BCP47_RE.test(m.language) ? m.language.toLowerCase() : null;
    if (language && !m.package_id.startsWith(`${language}-`)) {
      add(
        "package_id",
        "package_id.language_prefix",
        `Must start with the language tag: "${language}-".`,
      );
    }
    if (language && typeof m.kind === "string" && PACKET_KINDS.includes(m.kind as PacketKind)) {
      const kind = m.kind as PacketKind;
      const rest = m.package_id.slice(language.length + 1);
      if (!rest.startsWith(`${kind}-`)) {
        add(
          "package_id",
          "package_id.kind_segment",
          `Must contain "-${kind}-" after the language.`,
        );
      } else {
        const slug = rest.slice(kind.length + 1);
        if (!KEBAB_RE.test(slug)) {
          add("package_id", "package_id.slug", "Slug part must be non-empty kebab-case.");
        }
      }
    }
  }

  // --- structure ------------------------------------------------------------
  if (m.structure === undefined) add("structure", "structure.missing", "Required.");
  else if (!isObject(m.structure)) {
    add("structure", "structure.format", "Must be an object.");
  } else {
    const s = m.structure;
    if (s.type !== "distribution") {
      add("structure.type", "structure.type", 'Must be "distribution".');
    }
    const mainContent = s.main_content;
    if (mainContent === undefined) {
      add("structure.main_content", "structure.main_content.missing", "Exactly one payload file.");
    } else if (typeof mainContent !== "string" || mainContent.length === 0) {
      add("structure.main_content", "structure.main_content.format", "Must be a non-empty string.");
    }

    let reference: string[] = [];
    if (s.reference !== undefined) {
      if (!isStringArray(s.reference)) {
        add("structure.reference", "structure.reference.format", "Must be an array of strings.");
      } else {
        reference = s.reference;
        const dupes = reference.filter((f, i) => reference.indexOf(f) !== i);
        for (const f of new Set(dupes)) {
          add(
            `structure.reference.${f}`,
            "structure.reference.duplicate",
            "Listed more than once.",
          );
        }
      }
    }

    if (
      typeof mainContent === "string" &&
      mainContent.length > 0 &&
      reference.includes(mainContent)
    ) {
      add(
        "structure.main_content",
        "structure.reference.conflict",
        "main_content must not also appear in reference.",
      );
    }

    // Filename follows the kind (phrases.json / deck.json / corrections.json).
    if (
      typeof mainContent === "string" &&
      typeof m.kind === "string" &&
      PACKET_KINDS.includes(m.kind as PacketKind)
    ) {
      const expected = MAIN_CONTENT_BY_KIND[m.kind as PacketKind];
      if (mainContent !== expected) {
        add(
          "structure.main_content",
          "structure.main_content.filename",
          `"${m.kind}" packets must name their main payload "${expected}".`,
        );
      }
    }
  }

  // --- payload --------------------------------------------------------------
  if (m.payload === undefined) add("payload", "payload.missing", "Required.");
  else if (!isObject(m.payload)) add("payload", "payload.format", "Must be an object.");
  else {
    const p = m.payload;
    if (p.schema_version === undefined) {
      add("payload.schema_version", "payload.schema_version.missing", "Required.");
    } else if (p.schema_version !== PAYLOAD_SCHEMA_VERSION) {
      add(
        "payload.schema_version",
        "payload.schema_version.invalid",
        `Today this is "${PAYLOAD_SCHEMA_VERSION}".`,
      );
    }

    if (p.count === undefined) add("payload.count", "payload.count.missing", "Required.");
    else if (typeof p.count !== "number" || !Number.isInteger(p.count) || p.count < 0) {
      add("payload.count", "payload.count.format", "Must be a non-negative integer.");
    } else if (opts?.actualCount !== undefined && p.count !== opts.actualCount) {
      add(
        "payload.count",
        "payload.count.mismatch",
        `Manifest says ${p.count}, payload holds ${opts.actualCount}.`,
      );
    }

    if (p.checksums === undefined) {
      add("payload.checksums", "payload.checksums.missing", "Required.");
    } else if (!isObject(p.checksums)) {
      add("payload.checksums", "payload.checksums.format", "Must map filenames to sha256 digests.");
    } else {
      // Narrowed views of structure — this block sits outside the
      // structure section's own isObject scope.
      const structure = isObject(m.structure) ? m.structure : undefined;
      const declared: string[] = [];
      if (typeof structure?.main_content === "string") {
        declared.push(structure.main_content);
      }
      if (isStringArray(structure?.reference)) declared.push(...structure.reference);

      for (const key of Object.keys(p.checksums)) {
        const value = p.checksums[key];
        if (!declared.includes(key)) {
          add(
            `payload.checksums.${key}`,
            "payload.checksums.unknown_file",
            "Not declared under structure; checksums must cover exactly the declared files.",
          );
        }
        if (typeof value !== "string" || !SHA256_RE.test(value)) {
          add(
            `payload.checksums.${key}`,
            "payload.checksums.format",
            'Must be "sha256:" followed by 64 hex characters.',
          );
        }
      }
      for (const f of declared) {
        if (!(f in p.checksums)) {
          add(
            `payload.checksums.${f}`,
            "payload.checksums.missing_file",
            "Every declared payload file needs a checksum.",
          );
        }
      }
    }
  }

  // --- provenance -----------------------------------------------------------
  if (m.provenance === undefined) add("provenance", "provenance.missing", "Required.");
  else if (!isObject(m.provenance)) {
    add("provenance", "provenance.format", "Must be an object.");
  } else {
    const prov = m.provenance;

    if (prov.source === undefined)
      add("provenance.source", "provenance.source.missing", "Required.");
    else if (typeof prov.source !== "string" || prov.source.length === 0) {
      add("provenance.source", "provenance.source.format", "Must be a non-empty string.");
    }

    if (prov.submission_ids === undefined) {
      add("provenance.submission_ids", "provenance.submission_ids.missing", "Required.");
    } else if (!isStringArray(prov.submission_ids)) {
      add(
        "provenance.submission_ids",
        "provenance.submission_ids.format",
        "Must be an array of Convex submissions-table ids.",
      );
    } else if (prov.source === "community-submissions" && prov.submission_ids.length === 0) {
      add(
        "provenance.submission_ids",
        "provenance.submission_ids.empty_community",
        "community-submissions packets need at least one source submission.",
      );
    }

    if (prov.refined_by === undefined) {
      add("provenance.refined_by", "provenance.refined_by.missing", "Required.");
    } else if (typeof prov.refined_by !== "string" || !WORKER_ID_RE.test(prov.refined_by)) {
      add(
        "provenance.refined_by",
        "provenance.refined_by.format",
        'Worker identifier plus version, e.g. "refinement-worker/1.2.0".',
      );
    }

    if (
      prov.reviewed_by !== undefined &&
      prov.reviewed_by !== null &&
      typeof prov.reviewed_by !== "string"
    ) {
      add("provenance.reviewed_by", "provenance.reviewed_by.type", "Reviewer identity or null.");
    }
    if (m.status === "approved" && (prov.reviewed_by === undefined || prov.reviewed_by === null)) {
      add(
        "provenance.reviewed_by",
        "provenance.reviewed_by.required_on_approved",
        "Approved packets record who reviewed them.",
      );
    }
  }

  return issues;
}

/**
 * Validate a batch and enforce the consumer-contract idempotency key:
 * "(package_id, version)" must be unique across a set — a repeated pair
 * means someone tried to ship the same packet twice in one export.
 */
export function validateManifestBatch(inputs: readonly unknown[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>();

  inputs.forEach((input, index) => {
    issues.push(...validateManifest(input));

    const m = input as Record<string, unknown> | null;
    if (isObject(m) && typeof m.package_id === "string" && typeof m.version === "string") {
      const key = `${m.package_id}@${m.version}`;
      const firstAt = seen.get(key);
      if (firstAt !== undefined) {
        issues.push({
          path: `[${index}]`,
          code: "version.duplicate_pair",
          message: `Duplicate (package_id, version) pair with entry ${firstAt}: ${key}.`,
        });
      } else {
        seen.set(key, index);
      }
    }
  });

  return issues;
}
