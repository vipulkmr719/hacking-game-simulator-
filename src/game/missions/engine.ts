/**
 * Mission lifecycle.
 *
 * Objective evaluation, completion and failure live here so no command and no
 * component has to know the rules. Commands change the world (a host is
 * scanned, a file is retrieved); this module decides what that means for the
 * mission.
 */
import { grantMissionReward } from '../rewards/rewards';
import type { PlayerState } from '../progression/types';
import { evaluateAll, type ConditionContext } from './conditions';
import { createMissionRuntimeState } from './types';
import type { Mission, MissionRuntimeState, ObjectiveRuntimeState } from './types';

/** Guards the fixpoint loop below against a cyclic objective graph. */
const MAX_EVALUATION_PASSES = 32;

export interface ObjectiveTransition {
  readonly objectiveId: string;
  readonly description: string;
  readonly optional: boolean;
}

export interface EvaluationResult {
  readonly runtime: MissionRuntimeState;
  /** Objectives that became complete during this evaluation, in order. */
  readonly completed: readonly ObjectiveTransition[];
  /**
   * Objectives that stopped being complete. Only reachable through conditions
   * that can turn false again — in practice `detection-below`, which is how a
   * "stay quiet" objective is lost by being loud.
   */
  readonly regressed: readonly ObjectiveTransition[];
}

function transitionOf(objective: Mission['objectives'][number]): ObjectiveTransition {
  return {
    objectiveId: objective.id,
    description: objective.description,
    optional: objective.optional,
  };
}

/**
 * Recomputes every objective from current state.
 *
 * Completion is derived, never latched. Latching would make a
 * `detection-below` objective complete at trace 0 and stay complete however
 * loud the player then got, so "finish quietly" would cost nothing.
 */
function evaluateOnce(
  mission: Mission,
  runtime: MissionRuntimeState,
  player: PlayerState,
): { runtime: MissionRuntimeState; completed: ObjectiveTransition[]; regressed: ObjectiveTransition[] } {
  const completed: ObjectiveTransition[] = [];
  const regressed: ObjectiveTransition[] = [];
  let objectives: readonly ObjectiveRuntimeState[] = runtime.objectives;

  for (const objective of mission.objectives) {
    const current = objectives.find((entry) => entry.objectiveId === objective.id);
    if (current === undefined) {
      continue;
    }

    // Each objective sees the runtime as updated by the ones before it, so a
    // chain declared in dependency order resolves in a single pass.
    const context: ConditionContext = { runtime: { ...runtime, objectives }, player };
    const next =
      runtime.forcedObjectiveIds.includes(objective.id) ||
      evaluateAll(objective.completedWhen, context);

    if (next === current.complete) {
      continue;
    }

    objectives = objectives.map((entry) =>
      entry.objectiveId === objective.id ? { ...entry, complete: next } : entry,
    );
    (next ? completed : regressed).push(transitionOf(objective));
  }

  return { runtime: { ...runtime, objectives }, completed, regressed };
}

/**
 * Re-evaluates objectives until nothing further completes.
 *
 * The loop exists for missions whose objectives are not declared in dependency
 * order: a single pass would leave an earlier objective waiting on a later one
 * until the next command, which reads as a stuck mission.
 */
export function evaluateObjectives(
  mission: Mission,
  runtime: MissionRuntimeState,
  player: PlayerState,
): EvaluationResult {
  let current = runtime;
  const completed: ObjectiveTransition[] = [];
  const regressed: ObjectiveTransition[] = [];

  for (let pass = 0; pass < MAX_EVALUATION_PASSES; pass += 1) {
    const result = evaluateOnce(mission, current, player);
    current = result.runtime;
    if (result.completed.length === 0 && result.regressed.length === 0) {
      break;
    }
    completed.push(...result.completed);
    regressed.push(...result.regressed);
  }

  return { runtime: current, completed, regressed };
}

/**
 * Creates a runtime and evaluates it once.
 *
 * Without the initial pass an objective that is true from the outset — a
 * "stay below 50%" at zero trace — would read as incomplete until the player
 * happened to run something, and then announce itself for no reason.
 */
export function beginMission(mission: Mission, player: PlayerState): MissionRuntimeState {
  return evaluateObjectives(mission, createMissionRuntimeState(mission), player).runtime;
}

export function requiredObjectives(mission: Mission) {
  return mission.objectives.filter((objective) => !objective.optional);
}

export function isObjectiveComplete(runtime: MissionRuntimeState, objectiveId: string): boolean {
  return runtime.objectives.some(
    (entry) => entry.objectiveId === objectiveId && entry.complete,
  );
}

/** True once every non-optional objective is done — the mission may be closed. */
export function canExtract(mission: Mission, runtime: MissionRuntimeState): boolean {
  return requiredObjectives(mission).every((objective) =>
    isObjectiveComplete(runtime, objective.id),
  );
}

export function outstandingObjectives(mission: Mission, runtime: MissionRuntimeState) {
  return requiredObjectives(mission).filter(
    (objective) => !isObjectiveComplete(runtime, objective.id),
  );
}

export interface CompletionResult {
  readonly runtime: MissionRuntimeState;
  readonly player: PlayerState;
  readonly rewarded: boolean;
  /** Optional objectives met, which the results summary calls out. */
  readonly bonusObjectiveIds: readonly string[];
}

/**
 * Closes a mission and pays out.
 *
 * The reward layer refuses a second claim, so replaying a finished mission is
 * allowed but cannot farm it.
 */
export function completeMission(
  mission: Mission,
  runtime: MissionRuntimeState,
  player: PlayerState,
): CompletionResult {
  const grant = grantMissionReward(player, mission.id, mission.reward);
  const bonusObjectiveIds = mission.objectives
    .filter((objective) => objective.optional && isObjectiveComplete(runtime, objective.id))
    .map((objective) => objective.id);

  return {
    runtime: { ...runtime, status: 'completed' },
    player: grant.player,
    rewarded: grant.granted,
    bonusObjectiveIds,
  };
}

export function failMission(
  runtime: MissionRuntimeState,
  player: PlayerState,
  reason: string,
): { runtime: MissionRuntimeState; player: PlayerState } {
  return {
    runtime: { ...runtime, status: 'failed', failureReason: reason },
    player: {
      ...player,
      statistics: { ...player.statistics, missionsFailed: player.statistics.missionsFailed + 1 },
    },
  };
}
