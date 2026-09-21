/**
 * Read model for the progression screen.
 *
 * Everything the screen shows is derived here: level bands, affordability,
 * lock reasons, achievement state. The component renders this and computes
 * nothing, so the rules that decide whether a tool is buyable live in one
 * place and are tested without a DOM.
 */
import type { EngineDeps } from '../deps';
import type { GameState } from '../state/types';
import { evaluateAvailability } from '../missions/unlock';
import { canAfford, ownsTool } from './progression';
import {
  levelProgress,
  xpForCurrentLevel,
  xpIntoCurrentLevel,
  xpUntilNextLevel,
} from './levels';
import type { PlayerStatistics } from './types';

export type ToolStatus = 'owned' | 'affordable' | 'too-expensive' | 'level-locked';

export interface ToolView {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly cost: number;
  readonly requiredLevel: number;
  readonly detectionMultiplier: number;
  readonly status: ToolStatus;
  /** Why it cannot be bought, or null when it can. */
  readonly blocker: string | null;
}

export interface AchievementView {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly xp: number;
  readonly unlocked: boolean;
}

export interface ContractView {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly completed: boolean;
  readonly locked: boolean;
}

export interface ProgressionView {
  readonly level: number;
  readonly xp: number;
  readonly xpIntoLevel: number;
  readonly xpForLevel: number;
  readonly xpUntilNextLevel: number;
  /** 0 to 1, for the meter. */
  readonly levelProgress: number;
  readonly credits: number;
  readonly reputation: number;
  readonly tools: readonly ToolView[];
  readonly toolsOwned: number;
  readonly contracts: readonly ContractView[];
  readonly contractsCompleted: number;
  readonly achievements: readonly AchievementView[];
  readonly achievementsUnlocked: number;
  readonly statistics: PlayerStatistics;
}

function describeTool(
  state: GameState,
  tool: EngineDeps['tools'][number],
): { status: ToolStatus; blocker: string | null } {
  const { player } = state;

  if (ownsTool(player, tool.id)) {
    return { status: 'owned', blocker: null };
  }
  if (player.level < tool.requiredLevel) {
    return {
      status: 'level-locked',
      blocker: `needs level ${String(tool.requiredLevel)}`,
    };
  }
  if (!canAfford(player, tool.cost)) {
    return {
      status: 'too-expensive',
      blocker: `needs ${String(tool.cost - player.credits)} more CR`,
    };
  }
  return { status: 'affordable', blocker: null };
}

export function selectProgression(state: GameState, deps: EngineDeps): ProgressionView {
  const { player } = state;

  const tools: readonly ToolView[] = deps.tools.map((tool) => {
    const { status, blocker } = describeTool(state, tool);
    return {
      id: tool.id,
      name: tool.name,
      category: tool.category,
      description: tool.description,
      cost: tool.cost,
      requiredLevel: tool.requiredLevel,
      detectionMultiplier: tool.detectionMultiplier,
      status,
      blocker,
    };
  });

  const contracts: readonly ContractView[] = deps.missions.all.map((mission) => {
    const availability = evaluateAvailability(mission, player);
    return {
      id: mission.id,
      title: mission.title,
      organization: mission.organization,
      completed: availability.status === 'completed',
      locked: availability.status === 'locked',
    };
  });

  const achievements: readonly AchievementView[] = deps.achievements.all.map((achievement) => ({
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    xp: achievement.xp,
    unlocked: player.achievementIds.includes(achievement.id),
  }));

  return {
    level: player.level,
    xp: player.xp,
    xpIntoLevel: xpIntoCurrentLevel(player.xp),
    xpForLevel: xpForCurrentLevel(player.xp),
    xpUntilNextLevel: xpUntilNextLevel(player.xp),
    levelProgress: levelProgress(player.xp),
    credits: player.credits,
    reputation: player.reputation,
    tools,
    toolsOwned: tools.filter((tool) => tool.status === 'owned').length,
    contracts,
    contractsCompleted: contracts.filter((contract) => contract.completed).length,
    achievements,
    achievementsUnlocked: achievements.filter((achievement) => achievement.unlocked).length,
    statistics: player.statistics,
  };
}
