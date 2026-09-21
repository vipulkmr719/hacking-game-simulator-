import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../../data/achievements';
import { MISSIONS } from '../../data/missions';
import { TOOLS } from '../../data/tools';
import { createInitialPlayerState } from '../progression/progression';
import type { PlayerState } from '../progression/types';
import { createAchievementCatalog } from './catalog';
import { evaluateAchievements, isTriggered } from './engine';

const catalog = createAchievementCatalog(ACHIEVEMENTS);
const fresh = createInitialPlayerState();

function playerWith(overrides: Partial<PlayerState>): PlayerState {
  return { ...fresh, ...overrides };
}

describe('catalog', () => {
  it('gives every achievement a unique id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every achievement a name and a description', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.name.length).toBeGreaterThan(0);
      expect(achievement.description.length).toBeGreaterThan(0);
      expect(achievement.xp).toBeGreaterThan(0);
    }
  });

  it('only names contracts that exist', () => {
    const missionIds = MISSIONS.map((mission) => mission.id);
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.trigger.type === 'mission-completed') {
        expect(missionIds).toContain(achievement.trigger.missionId);
      }
    }
  });

  it('never asks for more tools than exist', () => {
    for (const achievement of ACHIEVEMENTS) {
      if (achievement.trigger.type === 'tools-owned') {
        expect(achievement.trigger.count).toBeLessThanOrEqual(TOOLS.length);
      }
    }
  });
});

describe('triggers', () => {
  it('fires on a completed contract', () => {
    const trigger = { type: 'mission-completed', missionId: 'first-connection' } as const;
    expect(isTriggered(trigger, fresh)).toBe(false);
    expect(isTriggered(trigger, playerWith({ completedMissionIds: ['first-connection'] }))).toBe(true);
  });

  it('fires at or above a level, not only exactly on it', () => {
    const trigger = { type: 'level-reached', level: 3 } as const;
    expect(isTriggered(trigger, playerWith({ level: 2 }))).toBe(false);
    expect(isTriggered(trigger, playerWith({ level: 3 }))).toBe(true);
    expect(isTriggered(trigger, playerWith({ level: 9 }))).toBe(true);
  });

  it('counts completed contracts', () => {
    const trigger = { type: 'missions-completed', count: 2 } as const;
    expect(isTriggered(trigger, playerWith({ completedMissionIds: ['a'] }))).toBe(false);
    expect(isTriggered(trigger, playerWith({ completedMissionIds: ['a', 'b'] }))).toBe(true);
  });

  it('counts owned tools', () => {
    expect(isTriggered({ type: 'tools-owned', count: 2 }, fresh)).toBe(false);
    expect(
      isTriggered({ type: 'tools-owned', count: 2 }, playerWith({ unlockedToolIds: ['a', 'b'] })),
    ).toBe(true);
  });

  it('watches credits held', () => {
    expect(isTriggered({ type: 'credits-held', amount: 3000 }, fresh)).toBe(false);
    expect(isTriggered({ type: 'credits-held', amount: 3000 }, playerWith({ credits: 3000 }))).toBe(
      true,
    );
  });

  it('watches commands executed and contracts lost', () => {
    const busy = playerWith({
      statistics: { ...fresh.statistics, commandsExecuted: 250, missionsFailed: 1 },
    });
    expect(isTriggered({ type: 'commands-executed', count: 250 }, busy)).toBe(true);
    expect(isTriggered({ type: 'missions-failed', count: 1 }, busy)).toBe(true);
  });
});

describe('evaluation', () => {
  it('awards nothing to a brand new operator', () => {
    expect(evaluateAchievements(fresh, catalog).unlocked).toEqual([]);
  });

  it('records the achievement and pays its xp', () => {
    const result = evaluateAchievements(
      playerWith({ completedMissionIds: ['first-connection'] }),
      catalog,
    );

    expect(result.unlocked.map((a) => a.id)).toContain('first-contract');
    expect(result.player.achievementIds).toContain('first-contract');
    expect(result.player.xp).toBe(60);
  });

  it('pays each achievement exactly once', () => {
    const player = playerWith({ completedMissionIds: ['first-connection'] });
    const first = evaluateAchievements(player, catalog);
    const second = evaluateAchievements(first.player, catalog);

    expect(second.unlocked).toEqual([]);
    expect(second.player.xp).toBe(first.player.xp);
  });

  it('cascades: achievement xp can earn a level achievement in the same pass', () => {
    // Enough XP that the level achievement's own payout is what crosses the
    // next threshold, which the fixpoint loop has to notice.
    const player = playerWith({
      xp: 480,
      level: 2,
      completedMissionIds: ['first-connection', 'open-ports', 'hidden-service'],
    });
    const result = evaluateAchievements(player, catalog);

    expect(result.unlocked.map((a) => a.id)).toContain('first-contract');
    expect(result.unlocked.map((a) => a.id)).toContain('getting-started');
    expect(result.player.level).toBeGreaterThanOrEqual(3);
  });

  it('terminates rather than looping forever', () => {
    const everything = playerWith({
      xp: 100000,
      level: 30,
      credits: 99999,
      completedMissionIds: MISSIONS.map((m) => m.id),
      unlockedToolIds: TOOLS.map((t) => t.id),
      statistics: {
        ...fresh.statistics,
        commandsExecuted: 9999,
        missionsFailed: 5,
      },
    });
    const result = evaluateAchievements(everything, catalog);
    expect(result.player.achievementIds).toHaveLength(ACHIEVEMENTS.length);
  });

  it('never mutates the player it is given', () => {
    const player = playerWith({ completedMissionIds: ['first-connection'] });
    evaluateAchievements(player, catalog);
    expect(player.achievementIds).toEqual([]);
    expect(player.xp).toBe(0);
  });
});
