/**
 * Detection / trace system.
 *
 * A purely fictional pressure meter. Actions raise it, the stealth action
 * lowers it, and reaching the maximum fails the contract. It models nothing
 * real, observes nothing outside game state, and reaches nothing outside the
 * simulation.
 *
 * The meter is always a clamped integer in [0, 100]. Integers matter: tool
 * multipliers produce fractions, and if state held 99.6 the display would
 * round to 100, the band would read DETECTED, and the failure check — which
 * compares against 100 — would disagree with both.
 *
 * NaN is nonsense and resolves to the neutral value; Infinity is an extreme
 * and clamps to the nearer bound. Treating +Infinity as nonsense would be
 * worse than wrong: a runaway cost would drop the trace to zero instead of
 * failing the run.
 */

export const DETECTION_MIN = 0;
export const DETECTION_MAX = 100;

/**
 * Base trace costs, in one place so the whole economy can be read at a glance.
 * Missions override any of these through their `detectionRules`.
 */
export const ACTION_TRACE_COST = {
  scan: 5,
  ports: 4,
  analyze: 6,
  inspect: 2,
  logs: 3,
  connect: 8,
  download: 7,
} as const;

/** Trace removed by one stealth action. */
export const STEALTH_TRACE_RECOVERY = 5;

/** Stealth actions allowed per contract. Without a cap it is a free reset. */
export const STEALTH_ACTIONS_PER_CONTRACT = 3;

/** Default cost of a wrong puzzle answer; a puzzle may set its own. */
export const PUZZLE_FAILURE_TRACE_COST = 10;

export interface DetectionProfile {
  /** Added to the meter when the action resolves. */
  readonly cost: number;
  /** Scales the cost; tools adjust this. 1 is neutral. */
  readonly multiplier: number;
}

export function clampDetection(value: number): number {
  if (Number.isNaN(value)) {
    return DETECTION_MIN;
  }
  return Math.round(Math.min(DETECTION_MAX, Math.max(DETECTION_MIN, value)));
}

export function applyDetectionDelta(current: number, delta: number): number {
  const safeDelta = Number.isNaN(delta) ? 0 : delta;
  return clampDetection(clampDetection(current) + safeDelta);
}

/**
 * The trace an action costs after its multiplier, as a whole number.
 *
 * Rounded here as well as at application so the figure the player is charged
 * is the figure that could be shown to them — a fractional cost that rounds
 * away at the meter would look like the tool did nothing.
 */
export function resolveDetectionCost(profile: DetectionProfile): number {
  const cost = Number.isNaN(profile.cost) ? 0 : profile.cost;
  const multiplier = Number.isNaN(profile.multiplier) ? 1 : profile.multiplier;
  const resolved = Math.max(0, cost * multiplier);
  return Number.isFinite(resolved) ? Math.round(resolved) : resolved;
}

export function isTraceCritical(value: number): boolean {
  return clampDetection(value) >= DETECTION_MAX;
}

export function formatTrace(value: number): string {
  return `TRACE: ${String(clampDetection(value))}%`;
}
