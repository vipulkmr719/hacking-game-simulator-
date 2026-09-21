/**
 * Composition root.
 *
 * The engine defines structure; this file supplies content. Keeping the wiring
 * here is what lets `src/game` stay free of any import from `src/data`, so the
 * engine can be tested against fixtures rather than the shipped catalog.
 */
import { createDefaultRegistry } from '../game/commands/definitions';
import type { EngineDeps } from '../game/deps';
import { createMissionCatalog } from '../game/missions/catalog';
import { createInitialGameState, DEFAULT_SEED } from '../game/state/initial';
import type { GameState } from '../game/state/types';
import { MISSIONS, orientationMission } from './missions';

export function createGameDeps(): EngineDeps {
  return {
    registry: createDefaultRegistry(),
    missions: createMissionCatalog(MISSIONS),
  };
}

/**
 * A new game with the training target loaded.
 *
 * The player starts inside a session because the terminal is the only surface
 * that exists yet — there is no mission select screen to route through, and a
 * terminal with no target would be a dead end.
 */
export function createTrainingGameState(seed: number = DEFAULT_SEED): GameState {
  return createInitialGameState(seed, orientationMission);
}
