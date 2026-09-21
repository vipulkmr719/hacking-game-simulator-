/**
 * Player figures.
 *
 * Every total a player carries is written through this module, so the rules
 * that no balance goes negative and no level disagrees with its XP hold
 * wherever the numbers are touched. The curve itself lives in levels.ts.
 */
import { EMPTY_STATISTICS } from './constants';
import { levelForXp, sanitizeXp } from './levels';
import type { PlayerState } from './types';

export const STARTING_CREDITS = 500;
export const STARTING_TOOL_ID = 'basic-scanner';

/**
 * Tools the engine checks for by name.
 *
 * Two commands change what they report depending on what the operator owns.
 * The ids live here rather than inline so the coupling between a tool and the
 * command it affects is findable from one place.
 */
export const ADVANCED_SCANNER_TOOL_ID = 'advanced-scanner';
export const DECODER_TOOL_ID = 'decoder';

export function sanitizeCredits(credits: number): number {
  if (!Number.isFinite(credits) || credits < 0) {
    return 0;
  }
  return Math.floor(credits);
}

export function sanitizeReputation(reputation: number): number {
  if (!Number.isFinite(reputation) || reputation < 0) {
    return 0;
  }
  return Math.floor(reputation);
}

export function createInitialPlayerState(): PlayerState {
  return {
    level: 1,
    xp: 0,
    credits: STARTING_CREDITS,
    reputation: 0,
    unlockedToolIds: [STARTING_TOOL_ID],
    completedMissionIds: [],
    achievementIds: [],
    statistics: EMPTY_STATISTICS,
  };
}

/** Adds XP and brings the level into agreement with it. */
export function awardXp(player: PlayerState, amount: number): PlayerState {
  const xp = sanitizeXp(player.xp) + sanitizeXp(amount);
  return { ...player, xp, level: levelForXp(xp) };
}

export function canAfford(player: PlayerState, cost: number): boolean {
  return sanitizeCredits(player.credits) >= sanitizeCredits(cost);
}

/**
 * Deducts credits. Refuses rather than clamping: silently charging a player
 * less than the price would be a worse bug than the purchase failing.
 */
export function spendCredits(
  player: PlayerState,
  cost: number,
): { player: PlayerState; spent: boolean } {
  const price = sanitizeCredits(cost);
  if (!canAfford(player, price)) {
    return { player, spent: false };
  }

  return {
    player: {
      ...player,
      credits: sanitizeCredits(player.credits) - price,
      statistics: {
        ...player.statistics,
        creditsSpent: player.statistics.creditsSpent + price,
      },
    },
    spent: true,
  };
}

export function ownsTool(player: PlayerState, toolId: string): boolean {
  return player.unlockedToolIds.includes(toolId);
}

export function unlockTool(player: PlayerState, toolId: string): PlayerState {
  if (ownsTool(player, toolId)) {
    return player;
  }
  return { ...player, unlockedToolIds: [...player.unlockedToolIds, toolId] };
}

export {
  LEVEL_BASE_XP,
  LEVEL_STEP_XP,
  MAX_LEVEL,
  levelForXp,
  levelProgress,
  sanitizeXp,
  xpForCurrentLevel,
  xpIntoCurrentLevel,
  xpRequiredForLevel,
  xpToAdvanceFrom,
  xpUntilNextLevel,
} from './levels';
