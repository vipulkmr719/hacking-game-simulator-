/**
 * Mission availability.
 *
 * Prerequisites are data on the mission, evaluated here. A locked mission
 * always explains why it is locked: a lock with no stated reason reads as a
 * bug, and the player cannot act on it.
 */
import type { PlayerState } from '../progression/types';
import type { Mission, MissionStatus } from './types';

export interface MissionAvailability {
  readonly status: Extract<MissionStatus, 'locked' | 'available' | 'completed'>;
  /** Empty when nothing is blocking. */
  readonly blockers: readonly string[];
}

export function evaluateAvailability(mission: Mission, player: PlayerState): MissionAvailability {
  const blockers: string[] = [];

  if (player.level < mission.unlock.minimumLevel) {
    blockers.push(`requires level ${String(mission.unlock.minimumLevel)}`);
  }

  const missingMissions = mission.unlock.requiredMissionIds.filter(
    (id) => !player.completedMissionIds.includes(id),
  );
  for (const id of missingMissions) {
    blockers.push(`requires mission "${id}"`);
  }

  const missingTools = mission.unlock.requiredToolIds.filter(
    (id) => !player.unlockedToolIds.includes(id),
  );
  for (const id of missingTools) {
    blockers.push(`requires tool "${id}"`);
  }

  if (blockers.length > 0) {
    return { status: 'locked', blockers };
  }

  // Completed missions stay replayable; the reward simply will not pay twice.
  if (player.completedMissionIds.includes(mission.id)) {
    return { status: 'completed', blockers: [] };
  }

  return { status: 'available', blockers: [] };
}

export function isUnlocked(mission: Mission, player: PlayerState): boolean {
  return evaluateAvailability(mission, player).status !== 'locked';
}
