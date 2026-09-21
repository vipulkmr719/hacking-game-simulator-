/**
 * The engine step function.
 *
 * `step` is pure: same state plus same action always yields the same result.
 * It performs no I/O, reads no clock, and calls no global RNG — every input
 * arrives through GameState, which is what makes runs reproducible from a seed
 * and lets the whole engine be tested without a DOM.
 *
 * Cross-cutting concerns live here rather than in individual commands, so a
 * new command cannot forget them: permission gates, detection cost, mission
 * objective evaluation, and mission failure.
 */
import type { GameAction } from '../actions';
import { evaluateAchievements } from '../achievements/engine';
import { applyDetectionDelta, isTraceCritical, resolveDetectionCost } from '../detection/detection';
import { drawSecurityEvent, formatSecurityEvent } from '../detection/securityEvents';
import { isEscalation, threatBandFor, threatLevelFor } from '../detection/threat';
import type { CommandSpec } from '../commands/types';
import type { EngineDeps } from '../deps';
import type { GameEvent } from '../events';
import { evaluateObjectives, failMission } from '../missions/engine';
import { resolveSession } from '../missions/session';
import type { MissionRuntimeState } from '../missions/types';
import type { GameTool } from '../progression/types';
import { meetsAccessLevel } from '../simulation/types';
import { error, info, success, system, warning, type TerminalLine } from '../terminal/types';
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

function checkGates(state: GameState, spec: CommandSpec): Rejection | null {
  const mission = state.activeMission;

  if (spec.requiresActiveMission && mission === null) {
    return {
      line: error('No active session. No target is loaded.'),
      reason: 'no-active-session',
    };
  }

  if (spec.requiredToolId !== null && !state.player.unlockedToolIds.includes(spec.requiredToolId)) {
    return { line: error(`Requires tool: ${spec.requiredToolId}`), reason: 'missing-tool' };
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

/**
 * The trace a command costs right now.
 *
 * A mission's detectionRules override the command's base cost, so a hardened
 * target can make the same action riskier without changing the command. Owned
 * tools then scale the result; the best multiplier the player owns applies,
 * since there is no equip step yet.
 */
function detectionCostFor(
  state: GameState,
  deps: EngineDeps,
  spec: CommandSpec,
  tools: readonly GameTool[],
): number {
  const session = resolveSession(state, deps);
  const rule = session?.mission.detectionRules.find((entry) => entry.commandId === spec.id);
  const base = rule?.cost ?? spec.detectionCost;

  const owned = tools.filter((tool) => state.player.unlockedToolIds.includes(tool.id));
  const multiplier =
    owned.length === 0 ? 1 : Math.min(...owned.map((tool) => tool.detectionMultiplier));

  return resolveDetectionCost({ cost: base, multiplier });
}

function withDetection(mission: MissionRuntimeState, delta: number): MissionRuntimeState {
  return { ...mission, detection: applyDetectionDelta(mission.detection, delta) };
}

/**
 * Reports what the target's security is doing about the current trace.
 *
 * Escalating into a higher band always speaks up, because crossing 51% or 76%
 * changes what the player should do next. Above that, every further rise
 * speaks up too: at ALERT and CRITICAL, silence would read as safety.
 * Chatter is drawn from the seeded RNG, so a run's messages are reproducible.
 */
function reportThreat(
  state: GameState,
  detectionBefore: number,
  outputs: TerminalLine[],
  events: GameEvent[],
): GameState {
  const runtime = state.activeMission;
  if (runtime === null) {
    return state;
  }

  const previous = runtime.threatLevel;
  const current = threatLevelFor(runtime.detection);
  const escalated = isEscalation(previous, current);
  const rose = runtime.detection > detectionBefore;
  const tense = current === 'alert' || current === 'critical';

  let next: GameState = {
    ...state,
    activeMission: { ...runtime, threatLevel: current },
  };

  if (escalated) {
    const band = threatBandFor(runtime.detection);
    outputs.push(
      warning(`SECURITY POSTURE → ${band.label}  (${String(runtime.detection)}%)`),
      info(`  ${band.description}`),
    );
    events.push({
      type: 'THREAT_LEVEL_CHANGED',
      previous,
      current,
      detection: runtime.detection,
    });
  } else if (previous !== current) {
    // De-escalation is quieter, but still worth saying: it is the only
    // feedback that a stealth action achieved anything.
    outputs.push(success(`SECURITY POSTURE → ${threatBandFor(runtime.detection).label}`));
    events.push({
      type: 'THREAT_LEVEL_CHANGED',
      previous,
      current,
      detection: runtime.detection,
    });
  }

  if (escalated || (rose && tense)) {
    const draw = drawSecurityEvent(next.rng, current);
    next = { ...next, rng: draw.rng };
    outputs.push(system(formatSecurityEvent(draw.event)));
    events.push({
      type: 'SECURITY_EVENT',
      level: draw.event.level,
      message: draw.event.message,
    });
  }

  return next;
}

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

  const levelBeforeCommand = state.player.level;
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

  const cost = detectionCostFor(working, deps, spec, deps.tools);
  const mission = working.activeMission;
  if (mission !== null && cost !== 0) {
    const raised = withDetection(mission, cost);
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
  nextState = reportThreat(nextState, mission?.detection ?? 0, outputs, events);

  // Objectives are evaluated centrally so no command has to remember to.
  const session = resolveSession(nextState, deps);
  if (session !== null && session.runtime.status === 'active') {
    const evaluation = evaluateObjectives(session.mission, session.runtime, nextState.player);
    nextState = { ...nextState, activeMission: evaluation.runtime };

    for (const transition of evaluation.completed) {
      outputs.push(
        success(`OBJECTIVE ${transition.optional ? '(bonus) ' : ''}· ${transition.description}`),
      );
      events.push({
        type: 'OBJECTIVE_COMPLETED',
        missionId: session.mission.id,
        objectiveId: transition.objectiveId,
        optional: transition.optional,
      });
    }

    // Losing an objective is as important to surface as gaining one.
    for (const transition of evaluation.regressed) {
      outputs.push(warning(`OBJECTIVE LOST · ${transition.description}`));
    }
  }

  const resulting = nextState.activeMission;
  if (resulting !== null && resulting.status === 'active' && isTraceCritical(resulting.detection)) {
    const reason = 'Trace reached 100%.';
    const failed = failMission(resulting, nextState.player, reason);
    nextState = { ...nextState, activeMission: failed.runtime, player: failed.player };
    outputs.push(
      error('════ MISSION FAILED ════'),
      error('  Trace reached 100%. The target resolved your origin.'),
      info('  Run "retry" to run the contract again from a clean slate.'),
    );
    events.push({ type: 'MISSION_FAILED', missionId: resulting.missionId, reason });
  }

  /*
   * Achievements run last, after objectives and after the failure check, so a
   * trigger watching a lost contract fires on the command that lost it rather
   * than a command later.
   */
  const earned = evaluateAchievements(nextState.player, deps.achievements);
  if (earned.unlocked.length > 0) {
    nextState = { ...nextState, player: earned.player };
    for (const achievement of earned.unlocked) {
      outputs.push(success(`ACHIEVEMENT · ${achievement.name} (+${String(achievement.xp)} XP)`));
      events.push({ type: 'ACHIEVEMENT_UNLOCKED', achievementId: achievement.id });
    }
  }

  // Compared against the level on entry, so a level gained inside the command
  // — extraction paying out, say — is still announced.
  if (nextState.player.level > levelBeforeCommand) {
    outputs.push(success(`LEVEL ${String(nextState.player.level)}`));
    events.push({ type: 'LEVEL_REACHED', level: nextState.player.level });
  }

  return { state: nextState, outputs, events };
}
