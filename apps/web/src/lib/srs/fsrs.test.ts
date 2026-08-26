import { describe, expect, it } from "vitest";

import {
  DEFAULT_PARAMS,
  DAY_MS,
  MAX_STABILITY_DAYS,
  MIN_STABILITY,
  initState,
  isValidParams,
  isValidState,
  next,
  retrievability,
} from "./fsrs";
import type { CardState, FsrParams, Rating } from "./fsrs";

const BASE = Date.UTC(2026, 0, 1); // integer epoch ms

/** Deterministic PRNG for property tests (mulberry32). */
function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const RATINGS: readonly Rating[] = [1, 2, 3, 4];

function stateAt(
  stability: number,
  difficulty: number,
  lastReview: number,
  reps = 3,
  lapses = 0,
): CardState {
  return {
    stability,
    difficulty,
    due: lastReview + DAY_MS,
    lastReview,
    reps,
    lapses,
  };
}

describe("DEFAULT_PARAMS", () => {
  it("is a valid 17-weight vector", () => {
    expect(isValidParams(DEFAULT_PARAMS)).toBe(true);
  });

  it("orders initial stabilities again < hard < good < easy", () => {
    const [w0, w1, w2, w3] = DEFAULT_PARAMS;
    expect(w0).toBeLessThan(w1);
    expect(w1).toBeLessThan(w2);
    expect(w2).toBeLessThan(w3);
  });
});

describe("initState", () => {
  it.each(RATINGS)("produces finite, ordered state for rating %i", (rating) => {
    const s = initState(BASE, rating);
    expect(Number.isFinite(s.stability)).toBe(true);
    expect(Number.isFinite(s.difficulty)).toBe(true);
    expect(s.stability).toBeGreaterThanOrEqual(MIN_STABILITY);
    expect(s.difficulty).toBeGreaterThanOrEqual(1);
    expect(s.difficulty).toBeLessThanOrEqual(10);
    expect(s.reps).toBe(1);
    expect(s.lastReview).toBe(BASE);
    expect(Number.isInteger(s.due)).toBe(true);
    expect(s.due).toBeGreaterThan(BASE);
  });

  it("matches the reference initial stability/difficulty values", () => {
    expect(initState(BASE, 1).stability).toBeCloseTo(0.4872, 10);
    expect(initState(BASE, 2).stability).toBeCloseTo(1.4003, 10);
    expect(initState(BASE, 3).stability).toBeCloseTo(3.7145, 10);
    expect(initState(BASE, 4).stability).toBeCloseTo(13.8206, 10);
    expect(initState(BASE, 1).difficulty).toBeCloseTo(7.6214, 10);
    expect(initState(BASE, 2).difficulty).toBeCloseTo(6.3916, 10);
    expect(initState(BASE, 3).difficulty).toBeCloseTo(5.1618, 10);
    expect(initState(BASE, 4).difficulty).toBeCloseTo(3.932, 10);
  });

  it("does not count a first-rating again as a lapse (reference rule)", () => {
    expect(initState(BASE, 1).lapses).toBe(0);
  });

  it("approximates learning steps with sub-day stability for again", () => {
    const s = initState(BASE, 1);
    const gapDays = (s.due - BASE) / DAY_MS;
    // w0 = 0.4872 days (~11.7h): sub-day, unlike good/easy first intervals.
    expect(gapDays).toBeGreaterThan(0);
    expect(gapDays).toBeLessThan(1);
  });

  it("throws RangeError on out-of-contract ratings", () => {
    // @ts-expect-error -- exercising the runtime guard for JS callers
    expect(() => initState(BASE, 5)).toThrow(RangeError);
    // @ts-expect-error -- exercising the runtime guard for JS callers
    expect(() => initState(BASE, 0)).toThrow(RangeError);
  });
});

describe("retrievability", () => {
  it("equals 0.9 when elapsed time equals stability", () => {
    const s = initState(BASE, 3); // stability 3.7145 days
    const atDue = Math.round(BASE + s.stability * DAY_MS);
    expect(retrievability(s, atDue)).toBeCloseTo(0.9, 9);
  });

  it("is 1 at the review instant and decreases monotonically", () => {
    const s = stateAt(10, 5, BASE);
    expect(retrievability(s, BASE)).toBe(1);
    let prev = 1;
    for (let d = 1; d <= 120; d += 7) {
      const r = retrievability(s, BASE + d * DAY_MS);
      expect(r).toBeLessThanOrEqual(prev);
      expect(r).toBeGreaterThan(0);
      prev = r;
    }
  });

  it("returns 0 for restart states and corrupt timestamps", () => {
    expect(retrievability(stateAt(0, 5, BASE), BASE + DAY_MS)).toBe(0);
    expect(retrievability(stateAt(NaN, 5, BASE), BASE + DAY_MS)).toBe(0);
    expect(retrievability(stateAt(10, 5, NaN), BASE + DAY_MS)).toBe(0);
  });

  it("clamps future-dated clock skew to 1", () => {
    expect(retrievability(stateAt(10, 5, BASE + DAY_MS), BASE)).toBe(1);
  });
});

describe("next (cross-day)", () => {
  const before = stateAt(10, 5, BASE);
  const at = BASE + 5 * DAY_MS;

  it("grows stability more for good than for hard", () => {
    const hard = next(before, 2, at);
    const good = next(before, 3, at);
    expect(good.stability).toBeGreaterThan(hard.stability);
    // Regression pins against the reference formulas (defaults, S=10,
    // D=5, t=5d -> R~0.9461): verified independently in bun.
    expect(hard.stability).toBeCloseTo(13.0, 3);
    expect(good.stability).toBeCloseTo(23.2042, 3);
  });

  it("grows stability more for easy than for good", () => {
    const easy = next(before, 4, at);
    expect(easy.stability).toBeCloseTo(47.9686, 3);
    expect(easy.stability).toBeGreaterThan(next(before, 3, at).stability);
  });

  it("collapses stability on lapse and bumps the lapse counter", () => {
    const lapsed = next(before, 1, at);
    expect(lapsed.stability).toBeCloseTo(2.3799, 3);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.reps).toBe(4);
  });

  it("keeps lapses untouched on successful ratings", () => {
    for (const rating of [2, 3, 4] as const) {
      expect(next(before, rating, at).lapses).toBe(0);
    }
  });

  it("moves difficulty toward harder for again/hard and easier for easy", () => {
    expect(next(before, 1, at).difficulty).toBeCloseTo(6.7444, 4);
    expect(next(before, 2, at).difficulty).toBeCloseTo(5.8747, 4);
    expect(next(before, 3, at).difficulty).toBeCloseTo(5.005, 4);
    expect(next(before, 4, at).difficulty).toBeCloseTo(4.1353, 4);
  });

  it("orders dues easy > good > hard > again for a typical state", () => {
    const dues = RATINGS.map((r) => next(before, r, at).due);
    expect(dues[3]).toBeGreaterThan(dues[2]);
    expect(dues[2]).toBeGreaterThan(dues[1]);
    expect(dues[1]).toBeGreaterThan(dues[0]);
  });

  it("exhibits the spacing effect: longer delay grows stability more", () => {
    const soon = next(before, 3, BASE + 2 * DAY_MS);
    const late = next(before, 3, BASE + 30 * DAY_MS);
    expect(late.stability).toBeGreaterThan(soon.stability);
  });

  it("always produces integer due timestamps", () => {
    for (const rating of RATINGS) {
      const after = next(before, rating, at);
      expect(Number.isInteger(after.due)).toBe(true);
      expect(Number.isInteger(after.lastReview)).toBe(true);
      expect(after.due).toBeGreaterThan(at);
    }
  });

  it("caps stability at the maximum interval", () => {
    const huge = stateAt(MAX_STABILITY_DAYS, 5, BASE);
    const after = next(huge, 3, BASE + DAY_MS);
    expect(after.stability).toBeLessThanOrEqual(MAX_STABILITY_DAYS);
  });

  it("honours custom params instead of defaults", () => {
    const doubled = DEFAULT_PARAMS.map((w) => w * 2) as unknown as FsrParams;
    const withCustom = next(before, 3, at, doubled);
    const withDefault = next(before, 3, at);
    expect(withCustom.stability).not.toBeCloseTo(withDefault.stability, 3);
  });
});

describe("next (same-day)", () => {
  const before = stateAt(10, 5, BASE);
  const laterThatDay = BASE + 3_600_000; // +1h

  it("freezes memory state regardless of rating (FSRS-4.5 rule)", () => {
    for (const rating of RATINGS) {
      const after = next(before, rating, laterThatDay);
      expect(after.stability).toBe(before.stability);
      expect(after.difficulty).toBe(before.difficulty);
    }
  });

  it("advances bookkeeping and reschedules from now", () => {
    const after = next(before, 3, laterThatDay);
    expect(after.reps).toBe(4);
    expect(after.lapses).toBe(0);
    expect(after.lastReview).toBe(laterThatDay);
    expect(after.due).toBeGreaterThan(laterThatDay);
  });

  it("counts a same-day again as a lapse without touching memory state", () => {
    const after = next(before, 1, laterThatDay);
    expect(after.lapses).toBe(1);
    expect(after.stability).toBe(before.stability);
  });

  it("yields equal dues across ratings (weak monotonicity only)", () => {
    const dues = RATINGS.map((r) => next(before, r, laterThatDay).due);
    expect(new Set(dues).size).toBe(1);
  });

  it("survives a backwards clock (skew treated as same-day)", () => {
    const after = next(before, 3, BASE - 60_000);
    expect(Number.isFinite(after.stability)).toBe(true);
    expect(after.due).toBeGreaterThan(BASE - 60_000);
  });
});

describe("next (defensive normalization)", () => {
  it("repairs corrupt counts and timestamps without NaN", () => {
    const corrupt: CardState = {
      stability: 7,
      difficulty: 5,
      due: NaN,
      lastReview: NaN,
      reps: -3,
      lapses: Number.NaN,
    };
    const after = next(corrupt, 3, BASE + 5 * DAY_MS);
    expectValid(after);
    expect(after.reps).toBe(1);
    expect(after.lapses).toBe(0);
  });

  it("floors zero-stability (SM-2 restart) states", () => {
    const restarted = stateAt(0, 5, BASE);
    const after = next(restarted, 3, BASE + 5 * DAY_MS);
    expectValid(after);
    expect(after.stability).toBeGreaterThanOrEqual(MIN_STABILITY);
  });
});

function expectValid(s: CardState): void {
  expect(isValidState({ ...s, stability: Math.max(0, s.stability) })).toBe(true);
  expect(Number.isFinite(s.stability)).toBe(true);
  expect(Number.isFinite(s.difficulty)).toBe(true);
  expect(s.difficulty).toBeGreaterThanOrEqual(1);
  expect(s.difficulty).toBeLessThanOrEqual(10);
  expect(Number.isInteger(s.due)).toBe(true);
  expect(Number.isInteger(s.lastReview)).toBe(true);
}

describe("FSRS properties (seeded random walks)", () => {
  it("holds invariants across 10,000 mixed reviews", () => {
    const rng = mulberry32(20260825);
    let state = initState(BASE, 3);
    let now = BASE;

    for (let i = 0; i < 10_000; i++) {
      const rating = RATINGS[Math.floor(rng() * 4)];
      const roll = rng();
      // Mix: same-day minutes, multi-day gaps, occasional 1s clock skew.
      const deltaMs =
        roll < 0.3
          ? Math.floor(rng() * DAY_MS * 0.99)
          : roll < 0.98
            ? Math.floor(DAY_MS + rng() * 400 * DAY_MS)
            : -60_000;
      now += deltaMs;

      const params =
        i % 5 === 0 ? (DEFAULT_PARAMS.map((w) => w * 1.3) as unknown as FsrParams) : undefined;
      state = next(state, rating, now, params);

      expect(Number.isFinite(state.stability)).toBe(true);
      expect(Number.isFinite(state.difficulty)).toBe(true);
      expect(state.stability).toBeGreaterThanOrEqual(MIN_STABILITY);
      expect(state.stability).toBeLessThanOrEqual(MAX_STABILITY_DAYS);
      expect(state.difficulty).toBeGreaterThanOrEqual(1);
      expect(state.difficulty).toBeLessThanOrEqual(10);
      expect(Number.isInteger(state.due)).toBe(true);
      expect(Number.isInteger(state.lastReview)).toBe(true);
      expect(state.due).toBeGreaterThan(now);
      expect(state.reps).toBe(i + 2);
      expect(state.lapses).toBeLessThanOrEqual(state.reps);
    }

    // Walk summary: a healthy long-run profile, not a degenerate one.
    expect(state.reps).toBe(10_001);
    expect(state.lapses).toBeGreaterThan(0);
    expect(state.stability).toBeGreaterThan(MIN_STABILITY);
  }, 120_000);

  it("keeps easy no-earlier-than hard across 2,000 random states", () => {
    const rng = mulberry32(777);
    for (let i = 0; i < 2_000; i++) {
      const stability = 0.1 + rng() ** 3 * 500;
      const difficulty = 1 + rng() * 9;
      const delay = 1 + rng() * 300;
      const before = stateAt(stability, difficulty, BASE);
      const at = BASE + delay * DAY_MS;
      const hardDue = next(before, 2, at).due;
      const goodDue = next(before, 3, at).due;
      const easyDue = next(before, 4, at).due;
      const againDue = next(before, 1, at).due;
      expect(easyDue).toBeGreaterThanOrEqual(goodDue);
      expect(goodDue).toBeGreaterThanOrEqual(hardDue);
      expect(hardDue).toBeGreaterThan(againDue);
    }
  });
});

describe("determinism", () => {
  it("returns identical output for identical inputs", () => {
    const before = stateAt(12.5, 6.25, BASE);
    const at = BASE + 9 * DAY_MS;
    for (const rating of RATINGS) {
      const a = next(before, rating, at);
      const b = next(before, rating, at);
      expect(b).toEqual(a);
    }
    expect(initState(BASE, 2)).toEqual(initState(BASE, 2));
  });
});
