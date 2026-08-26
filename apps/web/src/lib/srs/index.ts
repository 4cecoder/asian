/**
 * SRS engine entry point.
 *
 * Re-exports the agreed Track 7 interface (fsrs.ts) plus the SM-2
 * fallback engine (sm2.ts), and provides `schedule`, a deterministic
 * selector between the two engines.
 */
import type { CardState, FsrParams, Rating } from "./fsrs";
import { next } from "./fsrs";
import { efToDifficulty, needsFallback, nextSM2 } from "./sm2";

export * from "./fsrs";
export {
  EF_MAX,
  EF_MIN,
  FIRST_INTERVAL_DAYS,
  SECOND_INTERVAL_DAYS,
  difficultyToEf,
  efToDifficulty,
  needsFallback,
  nextSM2,
} from "./sm2";

/** Blank card used when scheduling a brand-new card through schedule(). */
function freshCard(now: number): CardState {
  return {
    stability: 0,
    difficulty: efToDifficulty(2.5),
    due: now,
    lastReview: now,
    reps: 0,
    lapses: 0,
  };
}

/**
 * Review a card with whichever engine can be trusted:
 *
 * - Valid state and valid params -> FSRS v4.5 (primary per Track 7).
 * - Missing or corrupt state, or invalid params -> SM-2, which repairs
 *   as it schedules. Its output is well-formed for both engines, so
 *   feeding it back through this function converges on FSRS.
 *
 * Pure and deterministic: identical inputs pick the identical engine.
 */
export function schedule(
  state: CardState | null | undefined,
  rating: Rating,
  now: number,
  params?: FsrParams,
): CardState {
  const current = state ?? freshCard(now);
  if (needsFallback(current, params)) {
    return nextSM2(current, rating, now);
  }
  return next(current, rating, now, params);
}
