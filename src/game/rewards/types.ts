import type { PlayerState } from '../progression/types';

export interface MissionReward {
  readonly xp: number;
  readonly credits: number;
  readonly reputation: number;
  readonly toolIds: readonly string[];
  readonly achievementIds: readonly string[];
}

export type RewardRefusalReason = 'already-claimed';

export interface RewardGrant {
  readonly player: PlayerState;
  /** False when the reward was refused, e.g. an already-claimed mission. */
  readonly granted: boolean;
  readonly reason: RewardRefusalReason | null;
}
