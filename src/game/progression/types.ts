/**
 * Player progression model.
 *
 * Tools are gameplay upgrades: they change engine parameters such as detection
 * multipliers or which fictional vulnerabilities a mission will let you act
 * on. None of them performs a real operation of any kind.
 */

export interface PlayerStatistics {
  readonly commandsExecuted: number;
  readonly missionsAttempted: number;
  readonly missionsCompleted: number;
  readonly missionsFailed: number;
}

export interface PlayerState {
  readonly level: number;
  readonly xp: number;
  readonly credits: number;
  readonly reputation: number;
  readonly unlockedToolIds: readonly string[];
  readonly completedMissionIds: readonly string[];
  readonly achievementIds: readonly string[];
  readonly statistics: PlayerStatistics;
}

export type ToolCategory = 'scanner' | 'decoder' | 'forensics' | 'stealth' | 'analysis';

export interface GameTool {
  readonly id: string;
  readonly name: string;
  readonly category: ToolCategory;
  readonly description: string;
  readonly cost: number;
  /** Multiplies detection cost while equipped. Below 1 is stealthier. */
  readonly detectionMultiplier: number;
  readonly requiredLevel: number;
}
