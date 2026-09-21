/**
 * Reward application.
 *
 * Two rules from the simulation-engine skill are enforced here rather than
 * left to callers: a mission can never pay out twice, and no total can go
 * negative. `grantMissionReward` is the only sanctioned way to move a player's
 * numbers, so both rules hold wherever rewards are applied.
 */
import {
  sanitizeCredits,
  sanitizeReputation,
  sanitizeXp,
  levelForXp,
} from '../progression/progression';
import type { PlayerState } from '../progression/types';
import type { MissionReward, RewardGrant } from './types';

export const EMPTY_REWARD: MissionReward = {
  xp: 0,
  credits: 0,
  reputation: 0,
  toolIds: [],
  achievementIds: [],
};

function mergeUnique(existing: readonly string[], incoming: readonly string[]): readonly string[] {
  return [...new Set([...existing, ...incoming])];
}

export function hasClaimedMission(player: PlayerState, missionId: string): boolean {
  return player.completedMissionIds.includes(missionId);
}

/** Normalizes a reward so no field can carry a negative or non-finite value. */
export function normalizeReward(reward: MissionReward): MissionReward {
  return {
    xp: sanitizeXp(reward.xp),
    credits: sanitizeCredits(reward.credits),
    reputation: sanitizeReputation(reward.reputation),
    toolIds: [...new Set(reward.toolIds)],
    achievementIds: [...new Set(reward.achievementIds)],
  };
}

export function grantMissionReward(
  player: PlayerState,
  missionId: string,
  reward: MissionReward,
): RewardGrant {
  if (hasClaimedMission(player, missionId)) {
    return { player, granted: false, reason: 'already-claimed' };
  }

  const safe = normalizeReward(reward);
  const xp = sanitizeXp(player.xp) + safe.xp;

  return {
    player: {
      ...player,
      xp,
      level: levelForXp(xp),
      credits: sanitizeCredits(player.credits) + safe.credits,
      reputation: sanitizeReputation(player.reputation) + safe.reputation,
      unlockedToolIds: mergeUnique(player.unlockedToolIds, safe.toolIds),
      achievementIds: mergeUnique(player.achievementIds, safe.achievementIds),
      completedMissionIds: mergeUnique(player.completedMissionIds, [missionId]),
      statistics: {
        ...player.statistics,
        missionsCompleted: player.statistics.missionsCompleted + 1,
      },
    },
    granted: true,
    reason: null,
  };
}
