# SRS engine (Track 7)

Pure TypeScript schedulers for review sessions. Zero runtime
dependencies. No React or Convex imports. Timestamps are integer epoch
milliseconds. Consume `index.ts`; it re-exports everything.

```
fsrs.ts    FSRS v4.5 core — the agreed interface + the real math
sm2.ts     SM-2 fallback mapped onto the same CardState struct
index.ts   re-exports plus schedule(), the engine selector
```

## Interface

```ts
type Rating = 1 | 2 | 3 | 4; // again | hard | good | easy

interface CardState {
  stability: number;   // days; interval at which recall probability is 0.9
  difficulty: number;  // [1, 10]; higher = harder material
  due: number;         // integer epoch ms
  lastReview: number;  // integer epoch ms
  reps: number;        // lifetime review count
  lapses: number;      // lifetime again count (see "Lapses" below)
}

initState(now, rating): CardState;
next(state, rating, now, params?): CardState;
retrievability(state, now): number; // UI display, [0, 1]
DEFAULT_PARAMS: FsrParams;          // canonical FSRS-4.5 weights w[0..16]
schedule(state, rating, now, params?): CardState; // FSRS-or-SM-2 selector
```

`next` throws `RangeError` on ratings outside 1–4. It never returns NaN:
corrupt fields are normalized before use and outputs are clamped.

## FSRS v4.5 math

Source of truth: `open-spaced-repetition/py-fsrs` v1.x (FSRS-4.5 era)
and the awesome-fsrs wiki page "The Algorithm". Track 7's scope line
pins the same decisions: 17 parameters, power forgetting curve.

Notation: `S` stability, `D` difficulty, `R` retrievability, `G` rating,
`w[i]` parameter i. Defaults are FSRS-4.5 canonical:

```
w = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031,
     1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755]
```

**Forgetting curve** (power law). `DECAY = -0.5`, `FACTOR = 19/81`,
chosen so R = 0.9 exactly when elapsed t equals S:

```
R(t, S) = (1 + FACTOR * t / S) ^ DECAY
```

**First review** (`initState`):

```
S0(G) = max(w[G-1], 0.1)                  // floor matches the reference
D0(G) = clamp(w4 - w5 * (G - 3), 1, 10)   // linear form (FSRS v4/4.5)
```

**Difficulty update** (cross-day reviews): linear step, then mean
reversion toward `D0(3) = w4`, then clamp:

```
D' = clamp(w7 * w4 + (1 - w7) * (D - w6 * (G - 3)), 1, 10)
```

Note the exponential initial difficulty `D0(G) = w4 - e^(w5*(G-1)) + 1`
is FSRS-5, not 4.5. Do not "upgrade" it here.

**Stability after recall** (G >= 2):

```
S'r = S * (1 + e^w8 * (11 - D) * S^-w9 * (e^(w10*(1-R)) - 1) * P * B)
P = w15 if G=hard, else 1        // hard penalty
B = w16 if G=easy, else 1        // easy bonus
```

**Stability after lapse** (G = again):

```
S'f = w11 * D^-w12 * ((S+1)^w13 - 1) * e^(w14*(1-R))
```

Both outputs are clamped to `[0.1, 36500]` days. The 36500-day cap is
the reference's `maximum_interval`.

**Due.** At the default request retention 0.9 the solved interval equals
stability exactly, so:

```
due = round(now + min(S', 36500) * 86_400_000)
```

`Math.round` keeps `due` an integer millisecond value.

### Same-day rule

FSRS-4.5 ignores all but the first review of a day. This engine encodes
that with a rolling window instead of a calendar cutoff:

- elapsed < 24h: memory state (S, D) is frozen. `reps` advances, `due`
  reschedules from `now`, and `again` still counts a lapse.
- elapsed >= 24h: full cross-day update above.

### Learning steps

The interface has no learning/review phase field, so Anki-style minute
steps are approximated the way the reference models them numerically:
first-rating stabilities are short (again -> ~0.49d, hard -> ~1.40d).
A host that wants literal 1m/10m steps can overwrite `due` before
persisting; the memory-state math is unaffected.

## SM-2 fallback

Classic SM-2 (Wozniak / SuperMemo pseudocode) on the same `CardState`:

- **Ease factor storage.** EF lives inside `difficulty` through a fixed
  linear bijection, so one struct serves both engines:
  `EF(D) = clamp(2.5 - (D - 1) * 1.2/9, 1.3, 2.5)` and its inverse.
  D=1 means EF 2.5 (easy); D=10 means EF 1.3 (hard).
- **Quality mapping.** again->q2 (-0.32 EF), hard->q3 (-0.14),
  good->q4 (+-0), easy->q5 (+0.1). EF floors at 1.3.
- **Intervals.** Integer days. The bootstrap runs I(1) = 1 day, then
  I(2) = 6 days, then `round(I * EF)` with the EF from _before_ this
  response. A lapse sets stability to the 0 sentinel and schedules the
  failing review at now + 1 day; the next pass restarts at 1 day.

### How fallback selects

`needsFallback(state, params)` in `sm2.ts` decides, deterministically:

- params missing, wrong length, or containing non-finite weights;
- any card field non-finite, negative counts, or stability outside
  (0, 36500];
- stability equal to the 0 restart sentinel (only SM-2 can advance it).

`schedule()` runs SM-2 when that predicate fires and FSRS otherwise.
SM-2 output is always well-formed for both engines, so feeding it back
through `schedule()` converges on FSRS after corruption is repaired.
This is the recovery path for bad persisted rows; it is not an A/B mode.

## Deviations from canonical FSRS-4.5

1. **Continuous elapsed time.** The references floor elapsed time to
   whole days. We keep fractional days from the millisecond timestamps.
   Identical at exact day boundaries; smoother intraday.
2. **Rolling 24h same-day window**, not calendar-midnight cutoff. No
   timezone input exists in this pure API.
3. **No phase state machine.** Sub-day stabilities stand in for minute
   learning steps; hosts may override `due`.
4. **`lapses` counts every again**, including same-day ones. The
   reference counts only lapses out of the review state. Downstream
   leech quarantine gets a slightly more conservative counter.
5. **No interval fuzz or load balancer.** Those are presentation-layer
   concerns in Anki, not part of the model.
6. **Defensive normalization.** Corrupt inputs produce clamped outputs
   instead of exceptions (ratings excepted). Canonical code assumes
   well-formed state.

## Tests

`bunx vitest run src/lib/srs` from `apps/web`. 57 tests across three
files: reference-value regressions computed independently against the
formulas, rating monotonicity, spacing effect, lapse handling, the
same-day freeze, determinism, seeded 10k-step random walks for both
engines individually and jointly (with NaN/corruption injections), and
fallback-selection routing. PRNG is mulberry32 with fixed seeds, so
failures reproduce.
