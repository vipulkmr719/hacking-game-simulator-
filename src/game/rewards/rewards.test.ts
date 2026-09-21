import { describe, expect, it } from 'vitest';
import { createInitialPlayerState, levelForXp, xpRequiredForLevel } from '../progression/progression';
import { EMPTY_REWARD, grantMissionReward, hasClaimedMission, normalizeReward } from './rewards';

const reward = {
  ...EMPTY_REWARD,
  xp: 120,
  credits: 300,
  reputation: 5,
  toolIds: ['decoder'],
  achievementIds: ['first-contract'],
};

describe('mission rewards', () => {
  it('applies every component of a reward', () => {
    const player = createInitialPlayerState();
    const grant = grantMissionReward(player, 'orientation', reward);

    expect(grant.granted).toBe(true);
    expect(grant.player.xp).toBe(120);
    expect(grant.player.credits).toBe(player.credits + 300);
    expect(grant.player.reputation).toBe(5);
    expect(grant.player.unlockedToolIds).toContain('decoder');
    expect(grant.player.achievementIds).toContain('first-contract');
    expect(grant.player.completedMissionIds).toContain('orientation');
    expect(grant.player.statistics.missionsCompleted).toBe(1);
  });

  it('refuses a second claim for the same mission', () => {
    const first = grantMissionReward(createInitialPlayerState(), 'orientation', reward);
    const second = grantMissionReward(first.player, 'orientation', reward);

    expect(second.granted).toBe(false);
    expect(second.reason).toBe('already-claimed');
    expect(second.player).toBe(first.player);
    expect(second.player.xp).toBe(120);
    expect(second.player.statistics.missionsCompleted).toBe(1);
  });

  it('recomputes level from the new xp total', () => {
    const xp = xpRequiredForLevel(3);
    const grant = grantMissionReward(createInitialPlayerState(), 'm', { ...EMPTY_REWARD, xp });
    expect(grant.player.level).toBe(3);
    expect(grant.player.level).toBe(levelForXp(xp));
  });

  it('normalizes negative and non-finite reward values to zero', () => {
    const normalized = normalizeReward({
      xp: -50,
      credits: Number.NaN,
      reputation: -1,
      toolIds: ['a', 'a'],
      achievementIds: [],
    });

    expect(normalized.xp).toBe(0);
    expect(normalized.credits).toBe(0);
    expect(normalized.reputation).toBe(0);
    expect(normalized.toolIds).toEqual(['a']);
  });

  it('never produces a negative balance from a negative reward', () => {
    const grant = grantMissionReward(createInitialPlayerState(), 'm', {
      ...EMPTY_REWARD,
      credits: -100000,
    });
    expect(grant.player.credits).toBeGreaterThanOrEqual(0);
  });

  it('does not duplicate a tool the player already owns', () => {
    const player = createInitialPlayerState();
    const grant = grantMissionReward(player, 'm', {
      ...EMPTY_REWARD,
      toolIds: ['basic-scanner'],
    });
    const occurrences = grant.player.unlockedToolIds.filter((id) => id === 'basic-scanner');
    expect(occurrences).toHaveLength(1);
  });

  it('reports claim status', () => {
    const player = createInitialPlayerState();
    expect(hasClaimedMission(player, 'orientation')).toBe(false);
    const grant = grantMissionReward(player, 'orientation', EMPTY_REWARD);
    expect(hasClaimedMission(grant.player, 'orientation')).toBe(true);
  });

  it('leaves the original player object untouched', () => {
    const player = createInitialPlayerState();
    grantMissionReward(player, 'orientation', reward);
    expect(player.xp).toBe(0);
    expect(player.completedMissionIds).toHaveLength(0);
  });
});
