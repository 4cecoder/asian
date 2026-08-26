import { describe, expect, it } from "vitest";

import { applyStatusFilter, type StatusFilter } from "./filtering";
import { SUBMISSION_STATUSES, type SubmissionRecord } from "./types";

function record(id: string, status: SubmissionRecord["status"]): SubmissionRecord {
  return { _id: id, _creationTime: 0, status };
}

const records: SubmissionRecord[] = [
  record("a", "pending"),
  record("b", "approved"),
  record("c", "pending"),
  record("d", "rejected"),
];

describe("applyStatusFilter", () => {
  it("returns everything, in order, for the UI-only 'all' filter", () => {
    expect(applyStatusFilter(records, "all")).toEqual(records);
    // A copy, not the same array — callers may sort/mutate.
    expect(applyStatusFilter(records, "all")).not.toBe(records);
  });

  it("keeps only matching statuses, preserving input order", () => {
    expect(applyStatusFilter(records, "pending").map((r) => r._id)).toEqual(["a", "c"]);
    expect(applyStatusFilter(records, "approved").map((r) => r._id)).toEqual(["b"]);
    expect(applyStatusFilter(records, "rejected").map((r) => r._id)).toEqual(["d"]);
  });

  it("returns empty (not null) for a status with no matches", () => {
    for (const status of SUBMISSION_STATUSES) {
      if (records.some((r) => r.status === status)) continue;
      expect(applyStatusFilter(records, status as StatusFilter)).toEqual([]);
    }
    expect(applyStatusFilter([], "processing")).toEqual([]);
  });
});
