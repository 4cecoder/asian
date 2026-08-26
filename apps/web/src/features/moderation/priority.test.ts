import { describe, expect, it } from "vitest";

import type { SubmissionRecord } from "../submissions/types";
import { sortQueueByPriority } from "./priority";

function record(
  id: string,
  status: SubmissionRecord["status"],
  creationTime: number,
): SubmissionRecord {
  return {
    _id: id,
    _creationTime: creationTime,
    status,
    kind: "phrase",
    language: "ko",
    payload: { text: "안녕", english: "hello" },
  };
}

const NOW = 1_000_000;

describe("sortQueueByPriority", () => {
  it("ranks needsReview before pending before processing", () => {
    const sorted = sortQueueByPriority([
      record("p1", "processing", NOW),
      record("n1", "needsReview", NOW),
      record("p2", "pending", NOW),
    ]);
    expect(sorted.map((r) => r._id)).toEqual(["n1", "p2", "p1"]);
  });

  it("orders oldest-first within the same status (FIFO)", () => {
    const sorted = sortQueueByPriority([
      record("newer", "pending", NOW - 1000),
      record("oldest", "pending", NOW - 5000),
      record("middle", "pending", NOW - 3000),
    ]);
    expect(sorted.map((r) => r._id)).toEqual(["oldest", "middle", "newer"]);
  });

  it("sinks terminal statuses below everything live", () => {
    const sorted = sortQueueByPriority([
      record("approved", "approved", NOW - 9000), // oldest overall, still last-ish
      record("pending", "pending", NOW),
      record("rejected", "rejected", NOW - 8000),
    ]);
    expect(sorted.map((r) => r._id)).toEqual(["pending", "approved", "rejected"]);
  });

  it("does not mutate the input array and keeps equal keys stable", () => {
    const a = record("a", "pending", NOW);
    const b = record("b", "pending", NOW); // identical rank + time
    const input = [a, b];
    const sorted = sortQueueByPriority(input);
    expect(input).toEqual([a, b]); // untouched
    expect(sorted).not.toBe(input);
    expect(sorted.map((r) => r._id)).toEqual(["a", "b"]); // insertion order kept
  });

  it("returns an empty array for an empty queue page", () => {
    expect(sortQueueByPriority([])).toEqual([]);
  });
});
