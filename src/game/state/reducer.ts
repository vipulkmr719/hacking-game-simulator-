/**
 * The engine step function.
 *
 * `step` is pure: same state plus same action always yields the same result.
 * It performs no I/O, reads no clock, and calls no global RNG — every input
 * arrives through GameState, which is what makes runs reproducible from a seed
 * and lets the whole engine be tested without a DOM.
 *
 * Cross-cutting concerns (permission gates, detection cost, statistics,
 * mission failure) live here rather than in individual commands, so a new
 * command cannot forget to apply them.
 */
import type { GameAction } from '../actions';
import { applyDetectionDelta, isTraceCritical } from '../detection/detection';
import type { CommandSpec } from '../commands/types';
import type { EngineDeps } from '../deps';
import type { GameEvent } from '../events';
import type { MissionRuntimeState } from '../missions/types';
import { meetsAccessLevel } from '../simulation/types';
import { error, warning, type TerminalLine } from '../terminal/types';
import type { GameState } from './types';

export interface StepResult {
  readonly state: GameState;
  readonly outputs: readonly TerminalLine[];
  readonly events: readonly GameEvent[];
}

interface Rejection {
  readonly line: TerminalLine;
  readonly reason: string;
}

function rejected(state: GameState, commandId: string, rejection: Rejection): StepResult {
  return {
    state,
    outputs: [rejection.line],
    events: [{ type: 'COMMAND_REJECTED', commandId, reason: rejection.reason }],
  };
}

/**
 * Checks a command's requirements against current state.
 * Returns null when the command may run.
 */
function checkGates(state: GameState, spec: CommandSpec): Rejection | null {
  const mission = state.activeMission;

  if (spec.requiresActiveMission && mission === null) {
    return {
      line: error('No active session. No target is loaded.'),
      reason: 'no-active-session',
    };
  }

  if (spec.requiredToolId !== null && !state.player.unlockedToolIds.includes(spec.requiredToolId)) {
    return {
      line: error(`Requires tool: ${spec.requiredToolId}`),
      reason: 'missing-tool',
    };
  }

  if (spec.requiredAccessLevel !== 'none') {
    const current = mission?.accessLevel ?? 'none';
    if (!meetsAccessLevel(current, spec.requiredAccessLevel)) {
      return {
        line: error(`Insufficient access. Requires: ${spec.requiredAccessLevel}`),
        reason: 'insufficient-access',
      };
    }
  }

  return null;
}

function withDetection(mission: MissionRuntimeState, delta: number): MissionRuntimeState {
  return { ...mission, detection: applyDetectionDelta(mission.detection, delta) };
}

/**
 * Applies one action.
 *
 * GameAction is a single-member union today, so this dispatches directly.
 * When a second action type lands, destructuring a field that no longer exists
 * on every member becomes a compile error here — which is the prompt to turn
 * this into an exhaustive switch.
 */
export function step(state: GameState, action: GameAction, deps: EngineDeps): StepResult {
  const { commandId, args } = action;
  return executeCommandAction(state, commandId, args, deps);
}

function executeCommandAction(
  state: GameState,
  commandId: string,
  args: readonly string[],
  deps: EngineDeps,
): StepResult {
  const spec = deps.registry.byId(commandId);
  if (spec === null) {
    // Reachable only if a caller hand-builds an action; parsing cannot produce
    // an unregistered id.
    return rejected(state, commandId, {
      line: error('Command not recognized.'),
      reason: 'unregistered-command',
    });
  }

  const gate = checkGates(state, spec);
  if (gate !== null) {
    return rejected(state, commandId, gate);
  }

  const events: GameEvent[] = [];
  let working: GameState = {
    ...state,
    player: {
      ...state.player,
      statistics: {
        ...state.player.statistics,
        commandsExecuted: state.player.statistics.commandsExecuted + 1,
      },
    },
  };

  // Phase 2 will let a mission's detectionRules override this per command.
  const mission = working.activeMission;
  if (mission !== null && spec.detectionCost !== 0) {
    const raised = withDetection(mission, spec.detectionCost);
    if (raised.detection !== mission.detection) {
      events.push({
        type: 'DETECTION_CHANGED',
        previous: mission.detection,
        current: raised.detection,
      });
    }
    working = { ...working, activeMission: raised };
  }

  const outcome = spec.run({ state: working, args, deps });
  const outputs: TerminalLine[] = [...outcome.outputs];
  events.push({ type: 'COMMAND_EXECUTED', commandId: spec.id }, ...outcome.events);

  let nextState = outcome.state;
  const resulting = nextState.activeMission;
  if (resulting !== null && resulting.status === 'active' && isTraceCritical(resulting.detection)) {
    const reason = 'Trace reached 100%.';
    nextState = {
      ...nextState,
      activeMission: { ...resulting, status: 'failed', failureReason: reason },
      player: {
        ...nextState.player,
        statistics: {
          ...nextState.player.statistics,
          missionsFailed: nextState.player.statistics.missionsFailed + 1,
        },
      },
    };
    outputs.push(warning('MISSION FAILED — trace reached 100%.'));
    events.push({ type: 'MISSION_FAILED', missionId: resulting.missionId, reason });
  }

  return { state: nextState, outputs, events };
}
