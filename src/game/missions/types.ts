/**
 * Mission data model.
 *
 * Missions are DATA, never code. A mission cannot contain a function, an
 * expression, or anything else the engine would evaluate — it can only
 * reference members of the two closed unions below.
 *
 * That restriction is the whole point. If missions could carry executable
 * logic, "mission content" would become an unaudited scripting surface inside
 * a game whose core rule is that nothing executes. Both unions are handled by
 * exhaustive switches (see conditions.ts / effects.ts in Phase 3), so adding a
 * variant without handling it is a compile error rather than a runtime hole.
 */
import type { ThreatLevel } from '../detection/threat';
import type { MissionReward } from '../rewards/types';
import type { AccessLevel, SimulatedTarget } from '../simulation/types';

export const MISSION_STATUSES = ['locked', 'available', 'active', 'completed', 'failed'] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_DIFFICULTIES = ['trivial', 'low', 'moderate', 'high', 'severe'] as const;
export type MissionDifficulty = (typeof MISSION_DIFFICULTIES)[number];

/** Closed set of things a mission may test. No arbitrary predicates. */
export type MissionCondition =
  | { readonly type: 'host-scanned'; readonly hostId: string }
  | { readonly type: 'port-discovered'; readonly portId: string }
  | { readonly type: 'service-identified'; readonly serviceId: string }
  | { readonly type: 'vulnerability-found'; readonly vulnerabilityId: string }
  | { readonly type: 'puzzle-solved'; readonly puzzleId: string }
  | { readonly type: 'file-retrieved'; readonly fileId: string }
  | { readonly type: 'access-level-at-least'; readonly level: AccessLevel }
  | { readonly type: 'detection-below'; readonly value: number }
  | { readonly type: 'objective-complete'; readonly objectiveId: string }
  | { readonly type: 'tool-unlocked'; readonly toolId: string };

/** Closed set of things a mission may change. No arbitrary mutations. */
export type MissionEffect =
  | { readonly type: 'reveal-host'; readonly hostId: string }
  | { readonly type: 'reveal-port'; readonly portId: string }
  | { readonly type: 'reveal-service'; readonly serviceId: string }
  | { readonly type: 'reveal-vulnerability'; readonly vulnerabilityId: string }
  | { readonly type: 'reveal-file'; readonly fileId: string }
  | { readonly type: 'set-access-level'; readonly level: AccessLevel }
  | { readonly type: 'adjust-detection'; readonly delta: number }
  | { readonly type: 'complete-objective'; readonly objectiveId: string }
  | { readonly type: 'fail-mission'; readonly reason: string };

export interface MissionObjective {
  readonly id: string;
  readonly description: string;
  readonly optional: boolean;
  readonly completedWhen: readonly MissionCondition[];
}

export type PuzzleKind = 'cipher' | 'sequence' | 'pattern' | 'keypad';

/**
 * A fictional puzzle. `solution` is a game answer checked by string compare —
 * it is not a credential and unlocks nothing outside the simulation.
 */
export interface MissionPuzzle {
  readonly id: string;
  readonly kind: PuzzleKind;
  readonly prompt: string;
  readonly solution: string;
  readonly hint: string | null;
  readonly attemptsAllowed: number;
  readonly failureDetectionCost: number;
}

export interface DetectionRule {
  readonly commandId: string;
  readonly cost: number;
}

export interface MissionUnlockRequirements {
  readonly minimumLevel: number;
  readonly requiredMissionIds: readonly string[];
  readonly requiredToolIds: readonly string[];
}

export interface Mission {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly difficulty: MissionDifficulty;
  readonly briefing: string;
  readonly objectives: readonly MissionObjective[];
  readonly target: SimulatedTarget;
  readonly availableCommandIds: readonly string[];
  readonly requiredToolIds: readonly string[];
  readonly puzzles: readonly MissionPuzzle[];
  readonly detectionRules: readonly DetectionRule[];
  readonly reward: MissionReward;
  readonly unlock: MissionUnlockRequirements;
}

export interface ObjectiveRuntimeState {
  readonly objectiveId: string;
  readonly complete: boolean;
}

/**
 * What the player has uncovered.
 *
 * `fileIds` are files whose existence is known; `retrievedFileIds` are files
 * actually pulled down. Objectives distinguish the two, because listing an
 * archive is not the same as walking out with it.
 */
export interface DiscoveredState {
  readonly hostIds: readonly string[];
  readonly portIds: readonly string[];
  readonly serviceIds: readonly string[];
  readonly vulnerabilityIds: readonly string[];
  readonly fileIds: readonly string[];
  readonly retrievedFileIds: readonly string[];
  readonly solvedPuzzleIds: readonly string[];
}

export const EMPTY_DISCOVERED_STATE: DiscoveredState = {
  hostIds: [],
  portIds: [],
  serviceIds: [],
  vulnerabilityIds: [],
  fileIds: [],
  retrievedFileIds: [],
  solvedPuzzleIds: [],
};

export interface MissionRuntimeState {
  readonly missionId: string;
  readonly status: MissionStatus;
  readonly detection: number;
  readonly accessLevel: AccessLevel;
  readonly objectives: readonly ObjectiveRuntimeState[];
  readonly discovered: DiscoveredState;
  /** Failed attempts per puzzle, keyed by puzzle id. */
  readonly puzzleAttempts: Readonly<Record<string, number>>;
  /** Stealth actions spent this contract, capped by the detection rules. */
  readonly stealthActionsUsed: number;
  /** Threat band at the end of the last command, for spotting escalation. */
  readonly threatLevel: ThreatLevel;
  /**
   * Objectives completed by a `complete-objective` effect rather than by their
   * own conditions. Held separately because objective completion is derived
   * from current state, not latched, so a forced completion needs somewhere to
   * live that a re-evaluation will not discard.
   */
  readonly forcedObjectiveIds: readonly string[];
  readonly failureReason: string | null;
}

export function createMissionRuntimeState(mission: Mission): MissionRuntimeState {
  return {
    missionId: mission.id,
    status: 'active',
    detection: 0,
    accessLevel: 'none',
    objectives: mission.objectives.map((objective) => ({
      objectiveId: objective.id,
      complete: false,
    })),
    discovered: EMPTY_DISCOVERED_STATE,
    puzzleAttempts: {},
    stealthActionsUsed: 0,
    threatLevel: 'safe',
    forcedObjectiveIds: [],
    failureReason: null,
  };
}
