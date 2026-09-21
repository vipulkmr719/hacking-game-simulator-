/**
 * Condition evaluation.
 *
 * The one place mission data becomes a yes or no. Every branch reads state and
 * returns a boolean — nothing here mutates, calls out, or evaluates a string.
 * The switch is exhaustive against the closed union, so adding a condition
 * type without handling it fails the build rather than silently returning
 * false and leaving an objective permanently incomplete.
 */
import type { PlayerState } from '../progression/types';
import { meetsAccessLevel } from '../simulation/types';
import type { MissionCondition, MissionRuntimeState } from './types';

export interface ConditionContext {
  readonly runtime: MissionRuntimeState;
  readonly player: PlayerState;
}

export function evaluateCondition(
  condition: MissionCondition,
  context: ConditionContext,
): boolean {
  const { runtime, player } = context;
  const { discovered } = runtime;

  switch (condition.type) {
    case 'host-scanned':
      return discovered.hostIds.includes(condition.hostId);
    case 'port-discovered':
      return discovered.portIds.includes(condition.portId);
    case 'service-identified':
      return discovered.serviceIds.includes(condition.serviceId);
    case 'vulnerability-found':
      return discovered.vulnerabilityIds.includes(condition.vulnerabilityId);
    case 'puzzle-solved':
      return discovered.solvedPuzzleIds.includes(condition.puzzleId);
    case 'file-retrieved':
      return discovered.retrievedFileIds.includes(condition.fileId);
    case 'access-level-at-least':
      return meetsAccessLevel(runtime.accessLevel, condition.level);
    case 'detection-below':
      return runtime.detection < condition.value;
    case 'objective-complete':
      return runtime.objectives.some(
        (objective) => objective.objectiveId === condition.objectiveId && objective.complete,
      );
    case 'tool-unlocked':
      return player.unlockedToolIds.includes(condition.toolId);
  }
}

export function evaluateAll(
  conditions: readonly MissionCondition[],
  context: ConditionContext,
): boolean {
  // An objective with no conditions would otherwise complete instantly, which
  // is never what a mission author means.
  if (conditions.length === 0) {
    return false;
  }
  return conditions.every((condition) => evaluateCondition(condition, context));
}

/** Human-readable form, used to explain what an objective is still waiting on. */
export function describeCondition(condition: MissionCondition): string {
  switch (condition.type) {
    case 'host-scanned':
      return `scan host ${condition.hostId}`;
    case 'port-discovered':
      return `enumerate port ${condition.portId}`;
    case 'service-identified':
      return `identify service ${condition.serviceId}`;
    case 'vulnerability-found':
      return `surface weakness ${condition.vulnerabilityId}`;
    case 'puzzle-solved':
      return `solve ${condition.puzzleId}`;
    case 'file-retrieved':
      return `retrieve ${condition.fileId}`;
    case 'access-level-at-least':
      return `reach ${condition.level} access`;
    case 'detection-below':
      return `keep trace below ${String(condition.value)}%`;
    case 'objective-complete':
      return `complete ${condition.objectiveId}`;
    case 'tool-unlocked':
      return `own ${condition.toolId}`;
  }
}
