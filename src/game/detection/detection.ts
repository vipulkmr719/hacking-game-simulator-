/**
 * Detection / trace system.
 *
 * A purely fictional pressure meter. Actions raise it, some game mechanics
 * lower it, and reaching the maximum fails the mission. It models nothing real
 * and observes nothing outside game state.
 *
 * The meter is always clamped to [0, 100]: the simulation-engine rules forbid
 * a detection value outside that range from ever existing in state.
 *
 * One rule governs hostile numbers throughout this module. NaN is nonsense, so
 * it resolves to the neutral value. Infinity is an extreme, so it clamps to
 * the nearer bound. Treating +Infinity as nonsense would be worse than wrong:
 * a runaway cost would drop the trace to zero instead of failing the mission.
 */

export const DETECTION_MIN = 0;
export const DETECTION_MAX = 100;

export interface DetectionProfile {
  /** Added to the meter when the action resolves. */
  readonly cost: number;
  /** Scales the cost; tools adjust this. 1 is neutral. */
  readonly multiplier: number;
}

export const NEUTRAL_DETECTION_PROFILE: DetectionProfile = { cost: 0, multiplier: 1 };

export function clampDetection(value: number): number {
  if (Number.isNaN(value)) {
    return DETECTION_MIN;
  }
  return Math.min(DETECTION_MAX, Math.max(DETECTION_MIN, value));
}

export function applyDetectionDelta(current: number, delta: number): number {
  const safeDelta = Number.isNaN(delta) ? 0 : delta;
  return clampDetection(clampDetection(current) + safeDelta);
}

export function resolveDetectionCost(profile: DetectionProfile): number {
  const cost = Number.isNaN(profile.cost) ? 0 : profile.cost;
  const multiplier = Number.isNaN(profile.multiplier) ? 1 : profile.multiplier;
  return Math.max(0, cost * multiplier);
}

export function isTraceCritical(value: number): boolean {
  return clampDetection(value) >= DETECTION_MAX;
}

export function formatTrace(value: number): string {
  return `TRACE: ${String(Math.round(clampDetection(value)))}%`;
}
