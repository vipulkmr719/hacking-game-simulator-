/**
 * The level curve.
 *
 * Advancing costs more at every level: going from 1 to 2 takes 200 XP, 2 to 3
 * takes 300, and so on. A flat cost would make later levels arrive faster in
 * real terms, because contracts pay more as they get harder — the curve is
 * what keeps a level worth the same amount of effort throughout.
 *
 * Tuned against the shipped campaign: its ten contracts pay 5,300 XP, which
 * lands an operator who finishes them at level 9, having passed each mission's
 * level gate with room to spare. A test walks that progression, so retuning
 * these two numbers without retuning the campaign fails the build rather than
 * quietly stranding a contract behind a level nobody can reach.
 */

/** XP to go from level 1 to level 2. */
export const LEVEL_BASE_XP = 200;

/** Added to the cost of each subsequent level. */
export const LEVEL_STEP_XP = 100;

/** Bounds the search in `levelForXp`; the curve itself has no ceiling. */
export const MAX_LEVEL = 30;

export function sanitizeXp(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0) {
    return 0;
  }
  return Math.floor(xp);
}

/** XP needed to advance from `level` to the next one. */
export function xpToAdvanceFrom(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  return LEVEL_BASE_XP + LEVEL_STEP_XP * (safe - 1);
}

/** Total XP needed to reach `level` from zero. Level 1 costs nothing. */
export function xpRequiredForLevel(level: number): number {
  const target = Math.max(1, Math.floor(level));
  let total = 0;
  for (let current = 1; current < target; current += 1) {
    total += xpToAdvanceFrom(current);
  }
  return total;
}

/**
 * The level a total of XP buys.
 *
 * Integer arithmetic rather than inverting the quadratic: a square root lands
 * a hair under the threshold at exact boundaries, which would show a player
 * sitting on precisely enough XP one level lower than they earned.
 */
export function levelForXp(xp: number): number {
  const total = sanitizeXp(xp);
  let level = 1;
  let spent = 0;

  while (level < MAX_LEVEL) {
    const next = spent + xpToAdvanceFrom(level);
    if (next > total) {
      break;
    }
    spent = next;
    level += 1;
  }

  return level;
}

/** XP earned since reaching the current level. */
export function xpIntoCurrentLevel(xp: number): number {
  const total = sanitizeXp(xp);
  return total - xpRequiredForLevel(levelForXp(total));
}

/** Size of the current level's band, i.e. the denominator of the progress bar. */
export function xpForCurrentLevel(xp: number): number {
  return xpToAdvanceFrom(levelForXp(sanitizeXp(xp)));
}

export function xpUntilNextLevel(xp: number): number {
  return Math.max(0, xpForCurrentLevel(xp) - xpIntoCurrentLevel(xp));
}

/** Progress through the current level, 0 to 1, for meters. */
export function levelProgress(xp: number): number {
  const band = xpForCurrentLevel(xp);
  if (band <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, xpIntoCurrentLevel(xp) / band));
}
