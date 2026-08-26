import { describe, expect, it } from "vitest";

import { DAY_MS, DEFAULT_PARAMS, isValidState } from "./fsrs";
import type { CardState, Rating } from "./fsrs";
import { needsFallback, nextSM2 } from "./sm2";
import { initState, retrievability, schedule } from "./index";

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

const RATINGS: readonly Rating[] = [1, 2, 3, 4];

function healthy(): CardState {
  return {
    stability: 9,
    difficulty: 5,
    due: BASE - DAY_MS,
    lastReview: BASE - 10 * DAY_MS,
    reps: 4,
    lapses: 0,
  };
}

describe("schedule engine selection", () => {
  it("routes valid state to FSRS", () => {
    const state = healthy();
    const at = BASE;
    const viaDispatcher = schedule(state, 3, at);
    // FSRS branch signature: continuous stability growth, no lapse on good.
    expect(viaDispatcher.due).toBeGreaterThan(at);
    expect(viaDispatcher.stability).not.toBe(0);
    expect(viaDispatcher.lapses).toBe(state.lapses);
  });

  it("routes corrupt state to SM-2 and matches a direct SM-2 call", () => {
    const corrupt: CardState = { ...healthy(), stability: Number.NaN };
    expect(needsFallback(corrupt)).toBe(true);
    const at = BASE;
    expect(schedule(corrupt, 4, at)).toEqual(nextSM2(corrupt, 4, at));
  });

  it("routes invalid params to SM-2 even with healthy state", () => {
    const badParams = [...DEFAULT_PARAMS.slice(0, 16)] as unknown as typeof DEFAULT_PARAMS;
    expect(needsFallback(healthy(), badParams)).toBe(true);
    const withNan = [...DEFAULT_PARAMS] as number[];
    withNan[8] = Number.NaN;
    expect(needsFallback(healthy(), withNan as unknown as typeof DEFAULT_PARAMS)).toBe(true);
    const out = schedule(healthy(), 3, BASE, badParams);
    expect(out).toEqual(nextSM2(healthy(), 3, BASE));
  });

  it("treats a missing state as a fresh SM-2 card", () => {
    const first = schedule(null, 3, BASE);
    expect(first.stability).toBe(1); // I(1)
    expect(first.reps).toBe(1);
    expect(first.due).toBe(BASE + DAY_MS);
  });

  it("converges back to FSRS after corruption is repaired by SM-2", () => {
    let state: CardState = { ...healthy(), difficulty: Number.NaN, lastReview: NaN };
    const at0 = BASE;
    state = schedule(state, 3, at0); // SM-2 repair pass
    expect(isValidState(state)).toBe(true);
    expect(needsFallback(state)).toBe(false);

    const at1 = at0 + 5 * DAY_MS;
    const repaired = schedule(state, 3, at1);
    // Now on the FSRS path: lapse counter untouched by a good rating and
    // stability grows continuously rather than resetting to day chains.
    expect(repaired.lapses).toBe(state.lapses);
    expect(repaired.stability).toBeGreaterThan(state.stability);
  });
});

describe("joint FSRS/SM-2 random walk (seeded)", () => {
  it("stays finite and well-formed across 10,000 mixed-engine reviews with injections", () => {
    const rng = mulberry32(20260825);
    let state: CardState | null = initState(BASE, 3);
    let now = BASE;

    for (let i = 0; i < 10_000; i++) {
      const rating = RATINGS[Math.floor(rng() * 4)];
      const roll = rng();
      if (roll < 0.02) {
        // Inject corruption: NaN or out-of-range field.
        const field = Math.floor(rng() * 3);
        const poison = rng() < 0.5 ? Number.NaN : -rng() * 100;
        const target = state as CardState;
        if (field === 0) target.stability = poison;
        else if (field === 1) target.difficulty = poison;
        else target.lastReview = poison;
      }

      const stepMs =
        roll > 0.7 ? Math.floor(DAY_MS + rng() * 365 * DAY_MS) : Math.floor(rng() * DAY_MS * 0.99);
      now += stepMs;

      const params =
        roll > 0.95
          ? ([...DEFAULT_PARAMS, 0] as unknown as typeof DEFAULT_PARAMS) // wrong length -> fallback
          : undefined;

      state = schedule(state, rating, now, params);
      const s = state as CardState;

      expect(Number.isFinite(s.stability)).toBe(true);
      expect(Number.isFinite(s.difficulty)).toBe(true);
      expect(Number.isFinite(s.due)).toBe(true);
      expect(Number.isFinite(s.lastReview)).toBe(true);
      expect(Number.isFinite(s.reps)).toBe(true);
      expect(Number.isFinite(s.lapses)).toBe(true);
      expect(s.stability).toBeGreaterThanOrEqual(0);
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(10);
      expect(Number.isInteger(s.due)).toBe(true);
      expect(Number.isInteger(s.lastReview)).toBe(true);
      expect(s.due).toBeGreaterThan(now);
      expect(s.reps).toBe(i + 2);
      expect(s.lapses).toBeLessThanOrEqual(s.reps);
      const r = retrievability(s, now);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  }, 120_000);
});
