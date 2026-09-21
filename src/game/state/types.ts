/**
 * Root game state.
 *
 * One immutable object holds everything the engine needs. It contains no
 * handles, no promises, no DOM nodes and no functions, which is what lets it
 * be snapshotted, diffed in tests, and (from Phase 6) serialized to a save.
 *
 * Terminal scrollback deliberately lives OUTSIDE this object, in the UI layer:
 * it is presentation, it would bloat every save file, and keeping it out means
 * the engine stays a pure state machine over game facts.
 */
import type { MissionRuntimeState } from '../missions/types';
import type { PlayerState } from '../progression/types';
import type { RngState } from '../rng';

export const SCHEMA_VERSION = 1;

export interface GameState {
  /** Incremented when the shape changes; drives save migration in Phase 6. */
  readonly schemaVersion: number;
  readonly rng: RngState;
  readonly player: PlayerState;
  readonly activeMission: MissionRuntimeState | null;
}
