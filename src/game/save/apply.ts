/**
 * Folding a validated save back into game state.
 *
 * Takes a fresh initial state and overwrites only the persisted fields, so
 * anything the save does not cover — the RNG, the active contract — comes from
 * the new game rather than from storage.
 */
import type { GameState } from '../state/types';
import type { SaveFile } from './types';

export function applySave(base: GameState, save: SaveFile): GameState {
  const { player } = save;

  return {
    ...base,
    player: {
      ...base.player,
      level: player.level,
      xp: player.xp,
      credits: player.credits,
      reputation: player.reputation,
      unlockedToolIds: [...player.unlockedToolIds],
      completedMissionIds: [...player.completedMissionIds],
      achievementIds: [...player.achievementIds],
      statistics: { ...player.statistics },
    },
  };
}
