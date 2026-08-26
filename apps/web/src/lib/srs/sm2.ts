/**
 * SM-2 fallback engine mapped onto CardState.
 *
 * Pure functions, zero dependencies. Used when FSRS cannot be trusted
 * (corrupt state or invalid params) and as the recovery writer: its
 * output is always well-formed for both engines.
 *
 * Classic reference: Piotr Wozniak's SM-0/SM-2 description as published
 * by SuperMemo ("Optimization of repetition spacing in practice",
 * algorithm SM-2 section).
 */
import type { CardState, Rating } from "./fsrs";
import { DAY_MS, MAX_STABILITY_DAYS } from "./fsrs";

/** SM-2 ease factor bounds. */
export const EF_MAX = 2.5;
export const EF_MIN = 1.3;
/** Classic bootstrap intervals in days: I(1) and I(2). */
export const FIRST_INTERVAL_DAYS = 1;
export const SECOND_INTERVAL_DAYS = 6;

/**
 * CardState.difficulty stores SM-2's ease factor through a fixed linear
 * bijection so one struct serves both engines:
 *
 *   D = 1   <=>  EF = 2.5  (trivial material)
 *   D = 10  <=>  EF = 1.3  (hardest material)
 *
 *   EF(D)    = clamp(2.5 - (D - 1) * (EF_MAX - EF_MIN) / 9, EF_MIN, EF_MAX)
 *   D(EF)    = clamp(1 + (2.5 - EF) * 9 / (EF_MAX - EF_MIN), 1, 10)
 */
const EF_SPAN = EF_MAX - EF_MIN;

export function difficultyToEf(difficulty: number): number {
  return Math.min(Math.max(EF_MAX - (difficulty - 1) * (EF_SPAN / 9), EF_MIN), EF_MAX);
}

export function efToDifficulty(ef: number): number {
  return Math.min(Math.max(1 + (EF_MAX - ef) * (9 / EF_SPAN), 1), 10);
}

/** Four-button mapping onto SM-2 quality q (pass threshold q >= 3). */
function qualityFor(rating: Rating): number {
  // again=2, hard=3, good=4, easy=5.
  return rating + 1;
}

/**
 * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), floored at 1.3.
 * With the mapping above: again -0.32, hard -0.14, good +-0, easy +0.1.
 */
function nextEf(ef: number, rating: Rating): number {
  const q = qualityFor(rating);
  const updated = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return Math.min(Math.max(updated, EF_MIN), EF_MAX);
}

/**
 * True when FSRS must not be used for this review. Deterministic, pure.
 * Triggers on wrong-length or non-finite params and on corrupt card
 * fields. Stability <= 0 also triggers: 0 is this module's restart
 * sentinel, and only the SM-2 bootstrap knows how to advance from it.
 */
export function needsFallback(state?: CardState, params?: readonly number[]): boolean {
  if (params !== undefined) {
    if (
      !Array.isArray(params) ||
      params.length !== 17 ||
      !params.every((w) => typeof w === "number" && Number.isFinite(w))
    ) {
      return true;
    }
  }
  if (!state) return true;
  return !(
    [state.stability, state.due, state.lastReview].every(Number.isFinite) &&
    Number.isFinite(state.difficulty) &&
    Number.isFinite(state.reps) &&
    Number.isFinite(state.lapses) &&
    state.stability > 0 &&
    state.stability <= MAX_STABILITY_DAYS &&
    state.reps >= 0 &&
    state.lapses >= 0
  );
}

/**
 * SM-2 review step with classic integer-day intervals.
 *
 * Interval chain, derived from the stored interval alone (no extra
 * phase field):
 * - fail (again): repetitions restart. Stability is set to the 0
 *   sentinel; the failing review itself schedules due at now + 1 day.
 * - pass on sentinel or I = 1 day: I(1)/I(2) bootstraps -> 1 then 6 days.
 * - pass on I >= 2 days: I' = round(I * EF), computed with the EF from
 *   BEFORE this response (SuperMemo pseudocode order), then EF updates.
 *
 * Difficulty always stays in [1, 10] via the EF bijection; lapses counts
 * every again; reps counts every review. Never returns NaN.
 */
export function nextSM2(state: CardState, rating: Rating, now: number): CardState {
  if (!Number.isInteger(rating) || rating < 1 || rating > 4) {
    throw new RangeError(`rating must be 1|2|3|4, got ${String(rating)}`);
  }

  const corruptDifficulty =
    !Number.isFinite(state.difficulty) || state.difficulty < 1 || state.difficulty > 10;
  const ef = difficultyToEf(corruptDifficulty ? 1 : state.difficulty);

  const priorReps = Number.isFinite(state.reps) && state.reps >= 0 ? Math.floor(state.reps) : 0;
  const priorLapses =
    Number.isFinite(state.lapses) && state.lapses >= 0 ? Math.floor(state.lapses) : 0;
  const reps = priorReps + 1;
  const failed = rating === 1;

  let stability: number;
  let dueDays: number;
  if (failed) {
    // Restart the chain; sentinel 0 marks "next pass is I(1)".
    stability = 0;
    dueDays = FIRST_INTERVAL_DAYS;
  } else {
    const current = Number.isFinite(state.stability)
      ? Math.max(0, Math.min(state.stability, MAX_STABILITY_DAYS))
      : 0;
    if (current < SECOND_INTERVAL_DAYS) {
      // Sentinel or 1-day interval: run the I(1)=1, I(2)=6 bootstrap.
      stability = current < FIRST_INTERVAL_DAYS ? FIRST_INTERVAL_DAYS : SECOND_INTERVAL_DAYS;
    } else {
      stability = Math.round(current * ef);
    }
    dueDays = Math.max(FIRST_INTERVAL_DAYS, stability);
  }

  const nextEase = nextEf(ef, rating);

  return {
    stability: Math.min(stability, MAX_STABILITY_DAYS),
    difficulty: efToDifficulty(nextEase),
    due: Math.round(now + dueDays * DAY_MS),
    lastReview: now,
    reps,
    lapses: priorLapses + (failed ? 1 : 0),
  };
}
