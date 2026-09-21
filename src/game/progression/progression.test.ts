import { describe, expect, it } from 'vitest';
import {
  STARTING_CREDITS,
  awardXp,
  canAfford,
  createInitialPlayerState,
  levelForXp,
  ownsTool,
  sanitizeCredits,
  sanitizeReputation,
  spendCredits,
  unlockTool,
  xpRequiredForLevel,
} from './progression';

describe('starting state', () => {
  it('matches the opening figures the game promises', () => {
    const player = createInitialPlayerState();
    expect(player.level).toBe(1);
    expect(player.xp).toBe(0);
    expect(player.credits).toBe(STARTING_CREDITS);
    expect(player.credits).toBe(500);
    expect(player.reputation).toBe(0);
  });

  it('issues the basic scanner and nothing else', () => {
    expect(createInitialPlayerState().unlockedToolIds).toEqual(['basic-scanner']);
  });

  it('starts with an empty record', () => {
    const player = createInitialPlayerState();
    expect(player.completedMissionIds).toEqual([]);
    expect(player.achievementIds).toEqual([]);
    expect(player.statistics).toEqual({
      commandsExecuted: 0,
      missionsAttempted: 0,
      missionsCompleted: 0,
      missionsFailed: 0,
      creditsSpent: 0,
      toolsPurchased: 0,
    });
  });
});

describe('awardXp', () => {
  it('adds xp and recomputes the level', () => {
    const player = awardXp(createInitialPlayerState(), xpRequiredForLevel(3));
    expect(player.xp).toBe(xpRequiredForLevel(3));
    expect(player.level).toBe(3);
  });

  it('accumulates across awards', () => {
    let player = createInitialPlayerState();
    player = awardXp(player, 150);
    player = awardXp(player, 150);
    expect(player.xp).toBe(300);
    expect(player.level).toBe(levelForXp(300));
  });

  it('ignores a negative or non-finite award rather than removing xp', () => {
    const player = awardXp(awardXp(createInitialPlayerState(), 400), -1000);
    expect(player.xp).toBe(400);
    expect(awardXp(player, Number.NaN).xp).toBe(400);
  });

  it('never mutates the player it is given', () => {
    const player = createInitialPlayerState();
    awardXp(player, 500);
    expect(player.xp).toBe(0);
  });
});

describe('credits', () => {
  it('reports affordability', () => {
    const player = createInitialPlayerState();
    expect(canAfford(player, 500)).toBe(true);
    expect(canAfford(player, 501)).toBe(false);
  });

  it('deducts the price and records the spend', () => {
    const result = spendCredits(createInitialPlayerState(), 200);
    expect(result.spent).toBe(true);
    expect(result.player.credits).toBe(300);
    expect(result.player.statistics.creditsSpent).toBe(200);
  });

  it('refuses rather than overdrawing', () => {
    const result = spendCredits(createInitialPlayerState(), 900);
    expect(result.spent).toBe(false);
    expect(result.player.credits).toBe(STARTING_CREDITS);
    expect(result.player.statistics.creditsSpent).toBe(0);
  });

  it('never leaves a negative balance', () => {
    let player = createInitialPlayerState();
    for (let i = 0; i < 20; i += 1) {
      player = spendCredits(player, 100).player;
    }
    expect(player.credits).toBe(0);
    expect(player.credits).toBeGreaterThanOrEqual(0);
  });

  it('rejects negative and non-finite totals', () => {
    expect(sanitizeCredits(-1)).toBe(0);
    expect(sanitizeCredits(Number.NaN)).toBe(0);
    expect(sanitizeReputation(-99)).toBe(0);
  });
});

describe('tool ownership', () => {
  it('reports what the player owns', () => {
    const player = createInitialPlayerState();
    expect(ownsTool(player, 'basic-scanner')).toBe(true);
    expect(ownsTool(player, 'decoder')).toBe(false);
  });

  it('adds a tool once', () => {
    const player = unlockTool(unlockTool(createInitialPlayerState(), 'decoder'), 'decoder');
    expect(player.unlockedToolIds.filter((id) => id === 'decoder')).toHaveLength(1);
  });

  it('returns the same object when the tool is already owned', () => {
    const player = createInitialPlayerState();
    expect(unlockTool(player, 'basic-scanner')).toBe(player);
  });
});
