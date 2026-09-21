/**
 * Achievement evaluation.
 *
 * Runs after every command, alongside objective evaluation. There is exactly
 * one award path: a trigger holds, the achievement is recorded, its XP is paid
 * once. The exhaustive switch mirrors the mission condition interpreter, so a
 * new trigger type nobody handles is a compile error rather than an
 * achievement that silently never fires.
 */
import { awardXp } from '../progression/progression';
import type { PlayerState } from '../progression/types';
import type { Achievement, AchievementCatalog, AchievementTrigger } from './types';

/**
 * Bounds the loop below: an achievement's XP can raise a level, which can earn
 * a level-reached achievement, which pays more XP.
 */
const MAX_EVALUATION_PASSES = 8;

export function isTriggered(trigger: AchievementTrigger, player: PlayerState): boolean {
  switch (trigger.type) {
    case 'mission-completed':
      return player.completedMissionIds.includes(trigger.missionId);
    case 'level-reached':
      return player.level >= trigger.level;
    case 'missions-completed':
      return player.completedMissionIds.length >= trigger.count;
    case 'missions-failed':
      return player.statistics.missionsFailed >= trigger.count;
    case 'commands-executed':
      return player.statistics.commandsExecuted >= trigger.count;
    case 'tools-owned':
      return player.unlockedToolIds.length >= trigger.count;
    case 'credits-held':
      return player.credits >= trigger.amount;
  }
}

export interface AchievementResult {
  readonly player: PlayerState;
  readonly unlocked: readonly Achievement[];
}

export function evaluateAchievements(
  player: PlayerState,
  catalog: AchievementCatalog,
): AchievementResult {
  let current = player;
  const unlocked: Achievement[] = [];

  for (let pass = 0; pass < MAX_EVALUATION_PASSES; pass += 1) {
    const earned = catalog.all.filter(
      (achievement) =>
        !current.achievementIds.includes(achievement.id) &&
        isTriggered(achievement.trigger, current),
    );

    if (earned.length === 0) {
      break;
    }

    for (const achievement of earned) {
      current = awardXp(
        { ...current, achievementIds: [...current.achievementIds, achievement.id] },
        achievement.xp,
      );
      unlocked.push(achievement);
    }
  }

  return { player: current, unlocked };
}
