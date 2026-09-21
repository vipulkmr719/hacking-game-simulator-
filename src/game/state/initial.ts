import { createMissionRuntimeState } from '../missions/types';
import type { Mission } from '../missions/types';
import { createInitialPlayerState } from '../progression/progression';
import { createRng } from '../rng';
import { SCHEMA_VERSION } from './types';
import type { GameState } from './types';

export const DEFAULT_SEED = 0x5eed;

/**
 * Builds a fresh game. The seed is an explicit argument rather than something
 * derived from the clock so that a test, a replay and a real session can all
 * start from identical state.
 *
 * `startingMission` loads a session immediately. The engine does not choose
 * one itself: which mission a player begins in is content, composed at the
 * app edge (see src/data/bootstrap.ts).
 */
export function createInitialGameState(
  seed: number = DEFAULT_SEED,
  startingMission?: Mission,
): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    rng: createRng(seed),
    player: createInitialPlayerState(),
    activeMission:
      startingMission === undefined ? null : createMissionRuntimeState(startingMission),
  };
}
