/**
 * Seeded pseudo-random number generator.
 *
 * Every random draw in the game threads through this module so that a given
 * seed plus a given sequence of actions always reproduces the same state.
 * Determinism is what makes the engine testable, saves trustworthy, and bug
 * reports reproducible, so `Math.random` is lint-banned inside src/game.
 *
 * Algorithm: mulberry32. Small, fast, and good enough for gameplay variation.
 * It is NOT cryptographically secure and must never be used as if it were.
 */

export interface RngState {
  readonly seed: number;
}

export interface RngDraw {
  /** Result in the half-open interval [0, 1). */
  readonly value: number;
  readonly next: RngState;
}

const UINT32 = 0x100000000;
const MULBERRY_INCREMENT = 0x6d2b79f5;

export function createRng(seed: number): RngState {
  return { seed: normalizeSeed(seed) };
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    return 1;
  }
  // Coerce into an unsigned 32-bit range so the generator behaves identically
  // for negative, fractional, or oversized seeds.
  return Math.abs(Math.trunc(seed)) % UINT32;
}

/** Draws the next value and returns the successor state. Never mutates. */
export function nextValue(state: RngState): RngDraw {
  let t = (state.seed + MULBERRY_INCREMENT) >>> 0;
  const nextSeed = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32;
  return { value, next: { seed: nextSeed } };
}

/** Integer in [min, max] inclusive. Returns `min` if the range is inverted. */
export function nextInt(state: RngState, min: number, max: number): { value: number; next: RngState } {
  const low = Math.trunc(min);
  const high = Math.trunc(max);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) {
    return { value: low, next: nextValue(state).next };
  }
  const draw = nextValue(state);
  const span = high - low + 1;
  return { value: low + Math.floor(draw.value * span), next: draw.next };
}

/** Picks one item. Returns null for an empty list rather than throwing. */
export function pickOne<T>(
  state: RngState,
  items: readonly T[],
): { value: T | null; next: RngState } {
  if (items.length === 0) {
    return { value: null, next: nextValue(state).next };
  }
  const { value: index, next } = nextInt(state, 0, items.length - 1);
  return { value: items[index] ?? null, next };
}
