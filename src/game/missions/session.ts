/**
 * Active session resolution.
 *
 * Recon commands need two halves: the runtime state (what has been discovered)
 * and the mission's data (the target itself). This joins them so each command
 * does not repeat the lookup, and returns null rather than throwing when there
 * is no session — the reducer's gate normally prevents that, but a command
 * should degrade into a message, never a crash.
 */
import type { EngineDeps } from '../deps';
import type { GameState } from '../state/types';
import type { SimulatedTarget } from '../simulation/types';
import type { Mission, MissionRuntimeState } from './types';

export interface ActiveSession {
  readonly runtime: MissionRuntimeState;
  readonly mission: Mission;
  readonly target: SimulatedTarget;
}

export function resolveSession(state: GameState, deps: EngineDeps): ActiveSession | null {
  const runtime = state.activeMission;
  if (runtime === null) {
    return null;
  }

  const mission = deps.missions.byId(runtime.missionId);
  if (mission === null) {
    return null;
  }

  return { runtime, mission, target: mission.target };
}

/** Rebuilds state with an updated session runtime. */
export function withSession(state: GameState, runtime: MissionRuntimeState): GameState {
  return { ...state, activeMission: runtime };
}
