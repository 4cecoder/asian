/**
 * FSRS v4.5 scheduler core.
 *
 * Pure functions, zero runtime dependencies, no React/Convex imports.
 * Time is Unix epoch milliseconds (integers). Stability and difficulty
 * are unitless floats; stability is measured in days.
 *
 * Reference: open-spaced-repetition/py-fsrs v1.x (FSRS-4.5) and the
 * awesome-fsrs wiki "The Algorithm" page. Track 7 scope line fixes the
 * choices: 17-parameter model, power forgetting curve, SM-2 fallback
 * (see ./sm2.ts).
 */

/** Review grade: 1 again, 2 hard, 3 good, 4 easy. */
export type Rating = 1 | 2 | 3 | 4;

/**
 * Persisted scheduling state for one card. All timestamps are integer
 * epoch milliseconds. `stability` is in days; `difficulty` is in [1, 10].
 */
export interface CardState {
  stability: number;
  difficulty: number;
  due: number;
  lastReview: number;
  reps: number;
  lapses: number;
}

/** The 17 FSRS-4.5 weights, indices 0..16. */
export type FsrParams = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Canonical FSRS-4.5 default weights (awesome-fsrs wiki, "The Algorithm"). */
export const DEFAULT_PARAMS: FsrParams = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];

/** Power forgetting curve exponent, fixed in FSRS-4.5. */
const DECAY = -0.5;
/** Chosen so R(S, S) = 0.9 exactly: 0.9^(1/DECAY) - 1 = 19/81. */
const FACTOR = 19 / 81;
/** Target retention. Baked to the FSRS default; interval then equals stability. */
export const REQUEST_RETENTION = 0.9;
export const DAY_MS = 86_400_000;
/** Floor for stability. Matches the reference: max(w[G-1], 0.1). */
export const MIN_STABILITY = 0.1;
/** Upper cap on stability/intervals, matching the reference maximum_interval. */
export const MAX_STABILITY_DAYS = 36_500;
/** Mid-band difficulty used when incoming difficulty is unusable. */
const FALLBACK_DIFFICULTY = 5.5;

const RATINGS: readonly Rating[] = [1, 2, 3, 4];

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/**
 * True when `params` can be used as-is: right length, every weight finite.
 * Callers that get false should fall back to SM-2 or substitute
 * DEFAULT_PARAMS (next() substitutes automatically).
 */
export function isValidParams(params: unknown): params is FsrParams {
  return (
    Array.isArray(params) &&
    params.length === DEFAULT_PARAMS.length &&
    params.every((w) => typeof w === "number" && Number.isFinite(w))
  );
}

function resolveParams(params?: FsrParams): FsrParams {
  return isValidParams(params) ? params : DEFAULT_PARAMS;
}

/** True when every CardState field is a usable finite number. */
export function isValidState(state: CardState): boolean {
  const numeric = [
    state.stability,
    state.difficulty,
    state.due,
    state.lastReview,
    state.reps,
    state.lapses,
  ];
  return (
    numeric.every((v) => Number.isFinite(v)) &&
    state.stability >= 0 &&
    state.stability <= MAX_STABILITY_DAYS &&
    state.reps >= 0 &&
    state.lapses >= 0
  );
}

function assertRating(rating: Rating): void {
  if (!RATINGS.includes(rating)) {
    throw new RangeError(`rating must be 1|2|3|4, got ${String(rating)}`);
  }
}

/** Power forgetting curve: R(t, S) = (1 + FACTOR * t / S)^DECAY. */
function forgettingCurve(elapsedDays: number, stability: number): number {
  return (1 + (FACTOR * elapsedDays) / stability) ** DECAY;
}

/**
 * Scheduled interval in days for a given stability at REQUEST_RETENTION.
 * Solving R(I, S) = 0.9 gives I = S exactly, so this is the identity up
 * to the upper cap.
 */
function intervalDaysFor(stability: number): number {
  const solved = (stability / FACTOR) * (REQUEST_RETENTION ** (1 / DECAY) - 1);
  return Math.min(solved, MAX_STABILITY_DAYS);
}

function dueFrom(now: number, stability: number): number {
  // Math.round keeps due an integer millisecond timestamp.
  return Math.round(now + intervalDaysFor(stability) * DAY_MS);
}

/** Defensive normalization so hostile/persisted junk cannot produce NaN. */
function normalizeInputs(state: CardState): { s: number; d: number } {
  const s = Number.isFinite(state.stability)
    ? clamp(state.stability, MIN_STABILITY, MAX_STABILITY_DAYS)
    : MIN_STABILITY;
  const d = Number.isFinite(state.difficulty)
    ? clamp(state.difficulty, 1, 10)
    : FALLBACK_DIFFICULTY;
  return { s, d };
}

/** Non-negative integer count, or 0 when the stored count is unusable. */
function normalizeCount(value: number): number {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

/**
 * Current probability of recall. Returns 0 for restart states
 * (stability <= 0, see sm2.ts) and 1 for future-dated reviews.
 */
export function retrievability(state: CardState, now: number): number {
  if (
    !Number.isFinite(state.stability) ||
    state.stability <= 0 ||
    !Number.isFinite(state.lastReview)
  ) {
    return 0;
  }
  const elapsedMs = Math.max(0, now - state.lastReview);
  const t = elapsedMs / DAY_MS;
  const r = forgettingCurve(t, clamp(state.stability, MIN_STABILITY, MAX_STABILITY_DAYS));
  return clamp(r, 0, 1);
}

/**
 * First review of a new card. Follows the reference: stability is
 * w[rating - 1] (floored at 0.1), difficulty is the linear initial
 * difficulty. Sub-day stability stands in for Anki-style minute-level
 * learning steps because CardState has no phase field.
 */
export function initState(now: number, rating: Rating, params?: FsrParams): CardState {
  assertRating(rating);
  const w = resolveParams(params);
  const stability = Math.max(w[rating - 1], MIN_STABILITY);
  // D0(G) = clamp(w4 - w5 * (G - 3), 1, 10) — linear form (FSRS v4/4.5).
  const difficulty = clamp(w[4] - w[5] * (rating - 3), 1, 10);
  return {
    stability,
    difficulty,
    due: dueFrom(now, stability),
    lastReview: now,
    reps: 1,
    // The reference does not count a first-rating Again as a lapse.
    lapses: 0,
  };
}

/**
 * Review an existing card.
 *
 * Branching follows FSRS-4.5: reviews less than one day after lastReview
 * never mutate memory state (the reference only lets the first review of
 * a day update S/D). Cross-day reviews run the full model with continuous
 * elapsed time.
 *
 * Throws RangeError on out-of-contract ratings. Never returns NaN:
 * inputs are normalized and outputs are clamped.
 */
export function next(state: CardState, rating: Rating, now: number, params?: FsrParams): CardState {
  assertRating(rating);
  const w = resolveParams(params);
  const { s, d } = normalizeInputs(state);
  // An unusable lastReview is treated as "just reviewed" (same-day).
  const lastReview = Number.isFinite(state.lastReview) ? state.lastReview : now;
  const reps = normalizeCount(state.reps) + 1;
  const lapses = normalizeCount(state.lapses) + (rating === 1 ? 1 : 0);

  if (now - lastReview < DAY_MS) {
    // Memory state frozen; only bookkeeping and due move.
    return {
      stability: s,
      difficulty: d,
      due: dueFrom(now, s),
      lastReview: now,
      reps,
      lapses,
    };
  }

  const t = (now - lastReview) / DAY_MS;
  const r = forgettingCurve(t, s);

  // Mean reversion toward D0(3) = w4, then clamp (FSRS v4/4.5 form).
  const difficulty = clamp(w[7] * w[4] + (1 - w[7]) * (d - w[6] * (rating - 3)), 1, 10);

  let stability: number;
  if (rating === 1) {
    // Post-lapse stability: depends on D, S and R.
    stability =
      w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]);
  } else {
    const hardPenalty = rating === 2 ? w[15] : 1;
    const easyBonus = rating === 4 ? w[16] : 1;
    stability =
      s *
      (1 +
        Math.exp(w[8]) *
          (11 - d) *
          Math.pow(s, -w[9]) *
          (Math.exp((1 - r) * w[10]) - 1) *
          hardPenalty *
          easyBonus);
  }

  return {
    stability: clamp(stability, MIN_STABILITY, MAX_STABILITY_DAYS),
    difficulty,
    due: dueFrom(now, stability),
    lastReview: now,
    reps,
    lapses,
  };
}
