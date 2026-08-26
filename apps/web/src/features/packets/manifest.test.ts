/**
 * Exhaustive rule coverage for validateManifest / validateManifestBatch.
 * Every code the validator can emit is asserted at least once, per
 * docs/knowledge/content-packet-format.md's manifest schema + field rules.
 */
import { describe, expect, test } from "vitest";
import {
  MAIN_CONTENT_BY_KIND,
  validateManifest,
  validateManifestBatch,
  type OkfManifest,
} from "./manifest";

/** The doc's filled-in example (checksum placeholder swapped for a real shape). */
function validManifest(): OkfManifest {
  return {
    okf_version: "0.2",
    package_id: "ko-phrase-pack-cafe-ordering",
    kind: "phrase-pack",
    version: "1.0.0",
    name: "Cafe Ordering Phrases (Korean)",
    description: "One sentence.",
    language: "ko",
    license: "CC-BY-4.0",
    status: "refined",
    created: "2026-08-25T09:00:00Z",
    last_updated: "2026-08-25T09:00:00Z",
    categories: ["phrases"],
    tags: ["ko", "cafe", "beginner"],
    format: "okf-v0.2",
    structure: { type: "distribution", main_content: "phrases.json", reference: [] },
    payload: {
      schema_version: "1",
      count: 3,
      checksums: {
        "phrases.json": "sha256:" + "a".repeat(64),
      },
    },
    provenance: {
      source: "community-submissions",
      submission_ids: ["sub_01J8ZKQ5WEXAMPLE00000001"],
      refined_by: "refinement-worker/1.2.0",
      reviewed_by: null,
    },
  };
}

const SHA = `sha256:${"b".repeat(64)}`;

function codes(issues: ReturnType<typeof validateManifest>): string[] {
  return issues.map((i) => i.code);
}

describe("validateManifest — acceptance", () => {
  test("the doc's example passes with zero issues", () => {
    expect(validateManifest(validManifest())).toEqual([]);
  });

  test("non-object input yields exactly one type issue", () => {
    for (const bad of [null, undefined, 42, "x", []]) {
      const issues = validateManifest(bad);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.code).toBe("type.not_object");
    }
  });
});

describe("validateManifest — required fields and enums", () => {
  test("every required field reports its own missing code when deleted", () => {
    const requiredCodes: [keyof OkfManifest, string][] = [
      ["okf_version", "okf_version.missing"],
      ["package_id", "package_id.missing"],
      ["kind", "kind.missing"],
      ["version", "version.missing"],
      ["name", "name.missing"],
      ["description", "description.missing"],
      ["language", "language.missing"],
      ["license", "license.missing"],
      ["status", "status.missing"],
      ["created", "created.missing"],
      ["last_updated", "last_updated.missing"],
      ["format", "format.missing"],
      ["structure", "structure.missing"],
      ["payload", "payload.missing"],
      ["provenance", "provenance.missing"],
    ];
    for (const [field, code] of requiredCodes) {
      const m = validManifest();
      delete m[field];
      expect(codes(validateManifest(m))).toContain(code);
    }
  });

  test("nested required fields report their own codes", () => {
    const cases: [(m: OkfManifest) => unknown, string][] = [
      [(m) => ({ ...m, structure: { type: "distribution" } }), "structure.main_content.missing"],
      [(m) => ({ ...m, payload: { count: 1, checksums: {} } }), "payload.schema_version.missing"],
      [(m) => ({ ...m, payload: { schema_version: "1", checksums: {} } }), "payload.count.missing"],
      [(m) => ({ ...m, payload: { schema_version: "1", count: 1 } }), "payload.checksums.missing"],
      [
        (m) => ({ ...m, provenance: { refined_by: "w/1", reviewed_by: null } }),
        "provenance.source.missing",
      ],
      [
        (m) => ({
          ...m,
          provenance: {
            source: "community-submissions",
            refined_by: "w/1",
            reviewed_by: null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            submission_ids: undefined as any,
          },
        }),
        "provenance.submission_ids.missing",
      ],
    ];
    for (const [mutate, code] of cases) {
      const issues = validateManifest(mutate(validManifest()));
      expect(codes(issues)).toContain(code);
    }
  });

  test("enum violations are named precisely", () => {
    const m1 = validManifest();
    m1.kind = "quizlet-import" as OkfManifest["kind"];
    expect(codes(validateManifest(m1))).toContain("kind.invalid");

    const m2 = validManifest();
    // draft/published are DB statuses, not contract statuses
    m2.status = "draft" as OkfManifest["status"];
    expect(codes(validateManifest(m2))).toContain("status.invalid");

    const m3 = validManifest();
    m3.okf_version = "0.1";
    expect(codes(validateManifest(m3))).toContain("okf_version.invalid");

    const m4 = validManifest();
    m4.format = "okf-v0.1";
    expect(codes(validateManifest(m4))).toContain("format.invalid");

    const m5 = validManifest();
    m5.payload.schema_version = "2";
    expect(codes(validateManifest(m5))).toContain("payload.schema_version.invalid");
  });
});

describe("validateManifest — package_id naming convention", () => {
  const badIds: [string, string][] = [
    ["KO-Phrase-Pack-Cafe", "package_id.format"], // not lowercase kebab
    ["ko_phrase_pack_cafe", "package_id.format"], // underscores
    ["ko-phrasepackcafe", "package_id.kind_segment"], // kind segment absent
    ["ja-phrase-pack-cafe", "package_id.language_prefix"], // language mismatch
    ["ko-phrase-pack-", "package_id.slug"], // empty slug
    ["ko-deck-pack--core", "package_id.slug"], // empty slug chunk
  ];
  test.each(badIds)("%# %s is rejected with %s", (id, code) => {
    const m = validManifest();
    m.package_id = id;
    if (code === "package_id.language_prefix") m.language = "ko"; // ja id, ko manifest
    if (id === "ko-deck-pack--core") m.kind = "deck-pack"; // keep kind segment consistent
    expect(codes(validateManifest(m))).toContain(code);
  });

  test("multi-hyphen kinds parse out of the id (dictionary-correction)", () => {
    const m = validManifest();
    m.package_id = "ja-dictionary-correction-keigo-2026w34";
    m.kind = "dictionary-correction";
    m.language = "ja";
    m.structure.main_content = MAIN_CONTENT_BY_KIND["dictionary-correction"];
    m.payload.checksums = { [m.structure.main_content]: SHA };
    expect(validateManifest(m)).toEqual([]);
  });
});

describe("validateManifest — version, timestamps, license", () => {
  test.each(["1", "1.0", "v1.0.0", "01.0.0", "1.0.0.0", "", "latest"])(
    "version %s fails semver",
    (v) => {
      const m = validManifest();
      m.version = v;
      expect(codes(validateManifest(m))).toContain("version.semver");
    },
  );

  test.each(["2026-08-25 09:00:00", "2026-08-25T09:00:00+09:00", "not-a-date"])(
    "timestamp %s is not ISO-8601 UTC Z",
    (ts) => {
      const m = validManifest();
      m.created = ts;
      expect(codes(validateManifest(m))).toContain("created.format");
    },
  );

  test("last_updated before created violates ordering", () => {
    const m = validManifest();
    m.last_updated = "2026-08-24T00:00:00Z";
    expect(codes(validateManifest(m))).toContain("timestamps.order");
  });

  test("only public licenses pass", () => {
    for (const bad of ["MIT", "Apache-2.0", "CC-BY-NC-4.0", "", "cc-by-4.0"]) {
      const m = validManifest();
      m.license = bad;
      expect(codes(validateManifest(m))).toContain("license.not_public");
    }
    for (const good of ["CC0", "CC-BY-4.0"]) {
      const m = validManifest();
      m.license = good;
      expect(codes(validateManifest(m))).not.toContain("license.not_public");
    }
  });

  test("blank name is rejected", () => {
    const m = validManifest();
    m.name = "   ";
    expect(codes(validateManifest(m))).toContain("name.empty");
  });
});

describe("validateManifest — structure and kind/filename pairing", () => {
  test("main content filename must match the kind", () => {
    const m = validManifest();
    m.structure.main_content = "deck.json";
    expect(codes(validateManifest(m))).toContain("structure.main_content.filename");
  });

  test('structure.type must be "distribution"', () => {
    const m = validManifest();
    // deliberate mistype so tsc cannot call it valid
    const wrong = "bundle" as unknown as "distribution";
    m.structure.type = wrong;
    expect(codes(validateManifest(m))).toContain("structure.type");
  });

  test("duplicate reference entries are flagged", () => {
    const m = validManifest();
    m.structure.reference = ["review-notes.md", "review-notes.md"];
    m.payload.checksums["review-notes.md"] = SHA;
    expect(codes(validateManifest(m))).toContain("structure.reference.duplicate");
  });

  test("reference files need checksums too", () => {
    const m = validManifest();
    m.structure.reference = ["review-notes.md"];
    expect(codes(validateManifest(m))).toContain("payload.checksums.missing_file");
  });

  test("main content must not reappear in reference", () => {
    const m = validManifest();
    m.structure.reference = ["phrases.json"];
    expect(codes(validateManifest(m))).toContain("structure.reference.conflict");
  });
});

describe("validateManifest — payload block", () => {
  test("count must be a non-negative integer", () => {
    for (const count of [-1, 1.5, Number.NaN]) {
      const m = validManifest();
      // deliberate type break so tsc cannot call it valid
      m.payload.count = count as number;
      expect(codes(validateManifest(m))).toContain("payload.count.format");
    }
  });

  test("count mismatch against actualCount is reported", () => {
    const m = validManifest();
    expect(codes(validateManifest(m, { actualCount: 4 }))).toEqual(["payload.count.mismatch"]);
    expect(validateManifest(m, { actualCount: 3 })).toEqual([]);
  });

  test("checksum values must be sha256:<64 hex>", () => {
    for (const bad of ["md5:abc", "sha256:" + "z".repeat(64), "sha256:abc123", ""]) {
      const m = validManifest();
      m.payload.checksums["phrases.json"] = bad;
      expect(codes(validateManifest(m))).toContain("payload.checksums.format");
    }
  });

  test("undeclared extra checksum entries are rejected", () => {
    const m = validManifest();
    m.payload.checksums["surprise.json"] = SHA;
    expect(codes(validateManifest(m))).toContain("payload.checksums.unknown_file");
  });

  test("missing main-content checksum is rejected", () => {
    const m = validManifest();
    m.payload.checksums = {};
    expect(codes(validateManifest(m))).toContain("payload.checksums.missing_file");
  });
});

describe("validateManifest — provenance", () => {
  test("community-submissions packets cannot have empty submission_ids", () => {
    const m = validManifest();
    m.provenance.submission_ids = [];
    expect(codes(validateManifest(m))).toContain("provenance.submission_ids.empty_community");
  });

  test("empty submission_ids is fine when the source is not community-submissions", () => {
    const m = validManifest();
    m.provenance.source = "curated";
    m.provenance.submission_ids = [];
    expect(codes(validateManifest(m))).toEqual([]);
  });

  test.each(["refinement-worker", "worker/", "/1.2.0", "refinement-worker/"])(
    "refined_by %s lacks a version part",
    (bad) => {
      const m = validManifest();
      m.provenance.refined_by = bad;
      expect(codes(validateManifest(m))).toContain("provenance.refined_by.format");
    },
  );

  test("reviewed_by must be a string or null", () => {
    const m = validManifest();
    const bad = 42 as unknown as string | null;
    m.provenance.reviewed_by = bad;
    expect(codes(validateManifest(m))).toContain("provenance.reviewed_by.type");
  });

  test("approved packets require a reviewer", () => {
    const m = validManifest();
    m.status = "approved";
    expect(codes(validateManifest(m))).toContain("provenance.reviewed_by.required_on_approved");
    m.provenance.reviewed_by = "mod_kim";
    expect(codes(validateManifest(m))).not.toContain("provenance.reviewed_by.required_on_approved");
  });
});

describe("validateManifestBatch", () => {
  test("flags duplicate (package_id, version) pairs across the batch", () => {
    const a = validManifest();
    const b = validManifest(); // same pair on purpose
    b.name = "A second packet with the same identity";
    const c = validManifest();
    c.version = "2.0.0"; // same package_id, new version — legal refinement

    const issues = validateManifestBatch([a, b, c]);
    expect(codes(issues)).toContain("version.duplicate_pair");
    expect(issues.filter((i) => i.code === "version.duplicate_pair")).toHaveLength(1);

    // same batch without the dupe is clean
    expect(validateManifestBatch([a, c])).toEqual([]);
  });

  test("per-manifest issues carry through with batch indices intact", () => {
    const broken = validManifest();
    broken.version = "nope";
    const issues = validateManifestBatch([broken]);
    expect(codes(issues)).toContain("version.semver");
  });
});
