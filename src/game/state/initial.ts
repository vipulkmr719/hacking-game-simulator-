import { createInitialPlayerState } from '../progression/progression';
import { createRng } from '../rng';
import { SCHEMA_VERSION } from './types';
import type { GameState } from './types';

export const DEFAULT_SEED = 0x5eed;

/**
 * Builds a fresh game. The seed is an explicit argument rather than something
 * derived from the clock so that a test, a replay and a real session can all
 * start from identical state.
 */
export function createInitialGameState(seed: number = DEFAULT_SEED): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    rng: createRng(seed),
    player: createInitialPlayerState(),
    activeMission: null,
  };
}
