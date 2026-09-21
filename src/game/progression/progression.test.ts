import { describe, expect, it } from 'vitest';
import {
  STARTING_CREDITS,
  XP_PER_LEVEL,
  createInitialPlayerState,
  levelForXp,
  sanitizeCredits,
  sanitizeReputation,
  sanitizeXp,
  xpIntoCurrentLevel,
  xpUntilNextLevel,
} from './progression';

describe('progression', () => {
  it('starts every operator at level one', () => {
    const player = createInitialPlayerState();
    expect(player.level).toBe(1);
    expect(player.xp).toBe(0);
    expect(player.credits).toBe(STARTING_CREDITS);
    expect(player.statistics.commandsExecuted).toBe(0);
  });

  it('maps xp onto levels', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(XP_PER_LEVEL - 1)).toBe(1);
    expect(levelForXp(XP_PER_LEVEL)).toBe(2);
    expect(levelForXp(XP_PER_LEVEL * 4)).toBe(5);
  });

  it('never drops below level one on hostile xp', () => {
    expect(levelForXp(-500)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
  });

  it('reports progress within the current level', () => {
    expect(xpIntoCurrentLevel(XP_PER_LEVEL + 40)).toBe(40);
    expect(xpUntilNextLevel(XP_PER_LEVEL + 40)).toBe(XP_PER_LEVEL - 40);
  });

  it('refuses negative or non-finite totals', () => {
    expect(sanitizeXp(-10)).toBe(0);
    expect(sanitizeXp(Number.NaN)).toBe(0);
    expect(sanitizeCredits(-1)).toBe(0);
    expect(sanitizeReputation(-99)).toBe(0);
    expect(sanitizeXp(12.9)).toBe(12);
  });
});
