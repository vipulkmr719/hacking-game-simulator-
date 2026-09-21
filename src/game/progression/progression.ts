/**
 * XP and level rules.
 *
 * A flat threshold keeps the curve readable and the tests exact. It is a
 * balance value, not a structural choice: change XP_PER_LEVEL freely.
 */
import { EMPTY_STATISTICS } from './constants';
import type { PlayerState } from './types';

export const XP_PER_LEVEL = 250;
export const STARTING_CREDITS = 500;

export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) {
    return 1;
  }
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpIntoCurrentLevel(xp: number): number {
  return sanitizeXp(xp) % XP_PER_LEVEL;
}

export function xpUntilNextLevel(xp: number): number {
  return XP_PER_LEVEL - xpIntoCurrentLevel(xp);
}

export function sanitizeXp(xp: number): number {
  if (!Number.isFinite(xp) || xp < 0) {
    return 0;
  }
  return Math.floor(xp);
}

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
    unlockedToolIds: ['basic-scanner'],
    completedMissionIds: [],
    achievementIds: [],
    statistics: EMPTY_STATISTICS,
  };
}
