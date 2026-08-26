import { describe, expect, it } from "vitest";

import { DAY_MS } from "./fsrs";
import type { CardState, Rating } from "./fsrs";
import {
  EF_MAX,
  EF_MIN,
  FIRST_INTERVAL_DAYS,
  SECOND_INTERVAL_DAYS,
  difficultyToEf,
  efToDifficulty,
  needsFallback,
  nextSM2,
} from "./sm2";

const BASE = Date.UTC(2026, 0, 1);

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function card(overrides: Partial<CardState> = {}): CardState {
  return {
    stability: 0,
    difficulty: 1, // EF 2.5
    due: BASE,
    lastReview: BASE - DAY_MS,
    reps: 0,
    lapses: 0,
    ...overrides,
  };
}

const RATINGS: readonly Rating[] = [1, 2, 3, 4];

describe("EF <-> difficulty bijection", () => {
  it("maps the documented endpoints", () => {
    expect(difficultyToEf(1)).toBeCloseTo(EF_MAX, 12);
    expect(difficultyToEf(10)).toBeCloseTo(EF_MIN, 12);
    expect(efToDifficulty(EF_MAX)).toBeCloseTo(1, 12);
    expect(efToDifficulty(EF_MIN)).toBeCloseTo(10, 12);
  });

  it("round-trips across the whole band", () => {
    for (let d = 1; d <= 10; d += 0.25) {
      expect(efToDifficulty(difficultyToEf(d))).toBeCloseTo(d, 9);
    }
  });

  it("clamps out-of-band input", () => {
    expect(difficultyToEf(-5)).toBe(EF_MAX);
    expect(difficultyToEf(99)).toBe(EF_MIN);
  });
});

describe("nextSM2 interval chain", () => {
  it("bootstraps a fresh card 1 -> 6 days", () => {
    const first = nextSM2(card(), 3, BASE);
    expect(first.stability).toBe(FIRST_INTERVAL_DAYS);
    expect(first.due).toBe(BASE + FIRST_INTERVAL_DAYS * DAY_MS);

    const second = nextSM2(first, 3, BASE + DAY_MS);
    expect(second.stability).toBe(SECOND_INTERVAL_DAYS);
    expect(second.due).toBe(BASE + DAY_MS + SECOND_INTERVAL_DAYS * DAY_MS);
  });

  it("multiplies by EF after the bootstrap", () => {
    // EF 2.5 stored as difficulty 1; round(6 * 2.5) = 15.
    const mature = card({ stability: SECOND_INTERVAL_DAYS, difficulty: 1 });
    const after = nextSM2(mature, 3, BASE);
    expect(after.stability).toBe(15);
  });

  it("restarts the chain on lapse via the zero sentinel", () => {
    const mature = card({ stability: 100, difficulty: 1, lapses: 0 });
    const lapsed = nextSM2(mature, 1, BASE);
    expect(lapsed.stability).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.reps).toBe(1);
    // The failing review itself schedules one day out.
    expect(lapsed.due).toBe(BASE + FIRST_INTERVAL_DAYS * DAY_MS);

    const recovered = nextSM2(lapsed, 3, BASE + DAY_MS);
    expect(recovered.stability).toBe(FIRST_INTERVAL_DAYS);
    const back = nextSM2(recovered, 3, BASE + 2 * DAY_MS);
    expect(back.stability).toBe(SECOND_INTERVAL_DAYS);
  });

  it("counts every review in reps", () => {
    let s = card({ reps: 0 });
    for (const rating of [3, 1, 3, 3] as const) {
      s = nextSM2(s, rating, BASE);
    }
    expect(s.reps).toBe(4);
  });

  it("treats migrated fractional stabilities below 6 days conservatively", () => {
    const migrated = card({ stability: 3.7, difficulty: 5 });
    const after = nextSM2(migrated, 3, BASE);
    expect(after.stability).toBe(SECOND_INTERVAL_DAYS);
  });
});

describe("nextSM2 ease-factor dynamics", () => {
  it("drops EF by the classic amounts per rating", () => {
    // From EF 2.5: again -0.32 -> 2.18, hard -0.14 -> 2.36, good +-0, easy +0.1 (capped).
    expect(nextSM2(card(), 1, BASE).difficulty).toBeCloseTo(efToDifficulty(2.18), 12);
    expect(nextSM2(card(), 2, BASE).difficulty).toBeCloseTo(efToDifficulty(2.36), 12);
    expect(nextSM2(card(), 3, BASE).difficulty).toBeCloseTo(efToDifficulty(2.5), 12);
    // Already at EF max: easy cannot push past 2.5.
    expect(nextSM2(card(), 4, BASE).difficulty).toBe(1);
  });

  it("raises EF only via easy and only up to 2.5", () => {
    const hardest = card({ difficulty: 10 }); // EF 1.3
    const eased = nextSM2(hardest, 4, BASE);
    expect(difficultyToEf(eased.difficulty)).toBeCloseTo(1.4, 12);
  });

  it("floors EF at 1.3 under repeated failures", () => {
    let s = card({ stability: 30, difficulty: 1 });
    for (let i = 0; i < 50; i++) {
      s = nextSM2(s, 1, BASE);
    }
    expect(s.difficulty).toBe(10); // EF pinned at 1.3
    // Restart sentinel: dispatcher keeps routing this card to SM-2
    // until a passing review lifts it out of the bootstrap.
    expect(needsFallback(s)).toBe(true);
    const recovered = nextSM2(s, 3, BASE);
    expect(recovered.stability).toBe(FIRST_INTERVAL_DAYS);
    expect(needsFallback(recovered)).toBe(false);
  });
});

describe("nextSM2 monotonicity and robustness", () => {
  it("gives all passing ratings equal immediate intervals (classic SM-2)", () => {
    const before = card({ stability: 20, difficulty: 5 });
    const dues = [2, 3, 4].map((r) => nextSM2(before, r as Rating, BASE).due);
    expect(new Set(dues).size).toBe(1);
    // Failures are always earliest.
    const failedDue = nextSM2(before, 1, BASE).due;
    expect(failedDue).toBeLessThan(dues[0]);
  });

  it("diverges later: easy keeps a higher EF than hard", () => {
    const before = card({ stability: 20, difficulty: 5 });
    const easy = nextSM2(before, 4, BASE);
    const hard = nextSM2(before, 2, BASE);
    expect(difficultyToEf(easy.difficulty)).toBeGreaterThan(difficultyToEf(hard.difficulty));
  });

  it("repairs corrupt inputs without NaN", () => {
    const corrupt = card({
      stability: Number.NaN,
      difficulty: Number.NaN,
      reps: Number.NaN,
      lapses: -5,
    });
    for (const rating of RATINGS) {
      const after = nextSM2(corrupt, rating, BASE);
      [
        after.stability,
        after.difficulty,
        after.due,
        after.lastReview,
        after.reps,
        after.lapses,
      ].forEach((v) => expect(Number.isFinite(v)).toBe(true));
      expect(after.difficulty).toBeGreaterThanOrEqual(1);
      expect(after.difficulty).toBeLessThanOrEqual(10);
      expect(after.lapses).toBeGreaterThanOrEqual(0);
    }
  });

  it("throws RangeError on out-of-contract ratings", () => {
    // @ts-expect-error -- exercising the runtime guard for JS callers
    expect(() => nextSM2(card(), 2.5)).toThrow(RangeError);
  });
});

describe("nextSM2 properties (seeded random walk)", () => {
  it("holds invariants across 10,000 reviews", () => {
    const rng = mulberry32(42);
    let s = card();
    for (let i = 0; i < 10_000; i++) {
      const rating = RATINGS[Math.floor(rng() * 4)];
      s = nextSM2(s, rating, BASE + i * DAY_MS);
      expect(Number.isFinite(s.stability)).toBe(true);
      expect(Number.isFinite(s.difficulty)).toBe(true);
      expect(s.stability).toBeGreaterThanOrEqual(0);
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(10);
      expect(Number.isInteger(s.due)).toBe(true);
      expect(Number.isInteger(s.lastReview)).toBe(true);
      expect(s.reps).toBe(i + 1);
      expect(s.lapses).toBeLessThanOrEqual(s.reps);
      const gapDays = (s.due - (BASE + i * DAY_MS)) / DAY_MS;
      expect(gapDays).toBeGreaterThanOrEqual(FIRST_INTERVAL_DAYS);
    }
  }, 120_000);
});

describe("determinism", () => {
  it("returns identical output for identical inputs", () => {
    const before = card({ stability: 17, difficulty: 4.2 });
    for (const rating of RATINGS) {
      expect(nextSM2(before, rating, BASE)).toEqual(nextSM2(before, rating, BASE));
    }
  });
});
