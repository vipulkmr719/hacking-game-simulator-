/**
 * Composition root.
 *
 * The engine defines structure; this file supplies content. Keeping the wiring
 * here is what lets `src/game` stay free of any import from `src/data`, so the
 * engine can be tested against fixtures rather than the shipped catalog.
 */
import { createAchievementCatalog } from '../game/achievements/catalog';
import { createDefaultRegistry } from '../game/commands/definitions';
import type { EngineDeps } from '../game/deps';
import { createMissionCatalog } from '../game/missions/catalog';
import { createInitialGameState, DEFAULT_SEED } from '../game/state/initial';
import type { GameState } from '../game/state/types';
import { ACHIEVEMENTS } from './achievements';
import { FIRST_MISSION, MISSIONS } from './missions';
import { TOOLS } from './tools';

export function createGameDeps(): EngineDeps {
  return {
    registry: createDefaultRegistry(),
    missions: createMissionCatalog(MISSIONS),
    tools: TOOLS,
    achievements: createAchievementCatalog(ACHIEVEMENTS),
  };
}

/**
 * A new game with no contract loaded.
 *
 * What the application boots into. Opening the game is not the same as
 * agreeing to a job: the player arrives at the menu, looks at their profile
 * and the board, and takes a contract deliberately. Auto-loading one was a
 * stopgap from when the terminal was the only screen that existed.
 */
export function createFreshGameState(seed: number = DEFAULT_SEED): GameState {
  return createInitialGameState(seed);
}

/**
 * A new game with the first contract already loaded.
 *
 * Kept for tests that need a session without walking the menu to get one.
 * The application does not use it.
 */
export function createTrainingGameState(seed: number = DEFAULT_SEED): GameState {
  return createInitialGameState(seed, FIRST_MISSION);
}
