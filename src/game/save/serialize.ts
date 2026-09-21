/**
 * Turning game state into a save file.
 *
 * Builds the payload field by field rather than spreading state, so a future
 * field added to PlayerState is not persisted by accident — anything saved is
 * something someone decided to save.
 */
import type { GameState } from '../state/types';
import { SAVE_VERSION, type SaveFile, type SavedSettings } from './types';

export function toSaveFile(state: GameState, settings: SavedSettings): SaveFile {
  const { player } = state;

  return {
    version: SAVE_VERSION,
    player: {
      level: player.level,
      xp: player.xp,
      credits: player.credits,
      reputation: player.reputation,
      unlockedToolIds: [...player.unlockedToolIds],
      completedMissionIds: [...player.completedMissionIds],
      achievementIds: [...player.achievementIds],
      statistics: {
        commandsExecuted: player.statistics.commandsExecuted,
        missionsAttempted: player.statistics.missionsAttempted,
        missionsCompleted: player.statistics.missionsCompleted,
        missionsFailed: player.statistics.missionsFailed,
        creditsSpent: player.statistics.creditsSpent,
        toolsPurchased: player.statistics.toolsPurchased,
      },
    },
    settings: { muted: settings.muted },
  };
}

export function encodeSave(save: SaveFile): string {
  return JSON.stringify(save);
}
