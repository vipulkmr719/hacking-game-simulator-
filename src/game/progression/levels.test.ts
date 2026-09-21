/**
 * The level curve.
 *
 * Several assertions compare the shipped implementation against a naive
 * reference built by adding up every band in turn. That is the definition of
 * the curve; the implementation is an optimisation of it, and they must agree.
 */
import { describe, expect, it } from 'vitest';
import {
  LEVEL_BASE_XP,
  LEVEL_STEP_XP,
  MAX_LEVEL,
  levelForXp,
  levelProgress,
  sanitizeXp,
  xpForCurrentLevel,
  xpIntoCurrentLevel,
  xpRequiredForLevel,
  xpToAdvanceFrom,
  xpUntilNextLevel,
} from './levels';

/** Cumulative XP to reach each level, built the slow obvious way. */
function referenceThresholds(count: number): number[] {
  const thresholds = [0];
  let total = 0;
  for (let level = 1; level < count; level += 1) {
    total += LEVEL_BASE_XP + LEVEL_STEP_XP * (level - 1);
    thresholds.push(total);
  }
  return thresholds;
}

describe('curve shape', () => {
  it('charges the base cost for the first level', () => {
    expect(xpToAdvanceFrom(1)).toBe(LEVEL_BASE_XP);
  });

  it('charges more for every level after', () => {
    for (let level = 1; level < 12; level += 1) {
      expect(xpToAdvanceFrom(level + 1)).toBe(xpToAdvanceFrom(level) + LEVEL_STEP_XP);
    }
  });

  it('never charges less than the base, even for nonsense input', () => {
    expect(xpToAdvanceFrom(0)).toBe(LEVEL_BASE_XP);
    expect(xpToAdvanceFrom(-5)).toBe(LEVEL_BASE_XP);
  });

  it('costs nothing to be level 1', () => {
    expect(xpRequiredForLevel(1)).toBe(0);
  });

  it('matches a reference sum at every level', () => {
    const reference = referenceThresholds(20);
    for (const [index, expected] of reference.entries()) {
      expect(xpRequiredForLevel(index + 1)).toBe(expected);
    }
  });
});

describe('levelForXp', () => {
  it('starts every operator at level 1', () => {
    expect(levelForXp(0)).toBe(1);
  });

  it('levels up exactly at the threshold, not one XP later', () => {
    const reference = referenceThresholds(15);
    for (const [index, threshold] of reference.entries()) {
      const level = index + 1;
      expect(levelForXp(threshold)).toBe(level);
      if (threshold > 0) {
        expect(levelForXp(threshold - 1)).toBe(level - 1);
      }
    }
  });

  it('agrees with the reference across a wide sweep', () => {
    const reference = referenceThresholds(MAX_LEVEL + 1);
    for (let xp = 0; xp < 12000; xp += 37) {
      const expected = reference.filter((threshold) => threshold <= xp).length;
      expect(levelForXp(xp)).toBe(Math.min(expected, MAX_LEVEL));
    }
  });

  it('never drops below 1 on hostile input', () => {
    expect(levelForXp(-9999)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
    expect(levelForXp(Number.NEGATIVE_INFINITY)).toBe(1);
  });

  it('stops climbing at the search ceiling', () => {
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });

  it('is monotonic: more XP never means a lower level', () => {
    let previous = 1;
    for (let xp = 0; xp < 8000; xp += 53) {
      const level = levelForXp(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });
});

describe('progress within a level', () => {
  it('reports zero progress at a threshold', () => {
    const threshold = xpRequiredForLevel(5);
    expect(xpIntoCurrentLevel(threshold)).toBe(0);
    expect(levelProgress(threshold)).toBe(0);
  });

  it('reports the remainder above a threshold', () => {
    expect(xpIntoCurrentLevel(xpRequiredForLevel(4) + 120)).toBe(120);
  });

  it('reports the band for the current level', () => {
    expect(xpForCurrentLevel(xpRequiredForLevel(3))).toBe(xpToAdvanceFrom(3));
  });

  it('counts down to the next level', () => {
    const band = xpToAdvanceFrom(3);
    expect(xpUntilNextLevel(xpRequiredForLevel(3))).toBe(band);
    expect(xpUntilNextLevel(xpRequiredForLevel(3) + 50)).toBe(band - 50);
  });

  it('keeps progress inside 0..1 everywhere', () => {
    for (let xp = 0; xp < 9000; xp += 61) {
      const progress = levelProgress(xp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });

  it('adds up: progress into the level plus what remains is the whole band', () => {
    for (let xp = 0; xp < 6000; xp += 43) {
      expect(xpIntoCurrentLevel(xp) + xpUntilNextLevel(xp)).toBe(xpForCurrentLevel(xp));
    }
  });
});

describe('sanitizeXp', () => {
  it('floors fractions and rejects negatives and NaN', () => {
    expect(sanitizeXp(12.9)).toBe(12);
    expect(sanitizeXp(-1)).toBe(0);
    expect(sanitizeXp(Number.NaN)).toBe(0);
  });
});
