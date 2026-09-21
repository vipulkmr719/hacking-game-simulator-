/**
 * Save file shape.
 *
 * Only progression and settings are persisted. An in-flight contract is not:
 * it is a session, and restoring one mid-run would mean trusting a stored
 * position on a target the player may have edited.
 */

/** Bumped whenever the shape below changes incompatibly. */
export const SAVE_VERSION = 1;

export interface SavedSettings {
  readonly muted: boolean;
}

export interface SavedStatistics {
  readonly commandsExecuted: number;
  readonly missionsAttempted: number;
  readonly missionsCompleted: number;
  readonly missionsFailed: number;
  readonly creditsSpent: number;
  readonly toolsPurchased: number;
}

export interface SavedPlayer {
  readonly level: number;
  readonly xp: number;
  readonly credits: number;
  readonly reputation: number;
  readonly unlockedToolIds: readonly string[];
  readonly completedMissionIds: readonly string[];
  readonly achievementIds: readonly string[];
  readonly statistics: SavedStatistics;
}

export interface SaveFile {
  readonly version: number;
  readonly player: SavedPlayer;
  readonly settings: SavedSettings;
}

export type LoadFailureReason =
  | 'empty'
  | 'unreadable'
  | 'not-an-object'
  | 'missing-version'
  | 'unsupported-version'
  | 'malformed-player';

export type LoadResult =
  | { readonly ok: true; readonly save: SaveFile; readonly repaired: boolean }
  | { readonly ok: false; readonly reason: LoadFailureReason; readonly detail: string };
