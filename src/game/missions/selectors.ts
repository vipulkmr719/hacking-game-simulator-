/**
 * Read models for the UI.
 *
 * Components render these and nothing else. Every derived fact — whether an
 * objective is done, whether the player can extract, why a mission is locked —
 * is computed here, so no rule is ever duplicated inside a component.
 */
import { STEALTH_ACTIONS_PER_CONTRACT } from '../detection/detection';
import { threatBandFor } from '../detection/threat';
import type { ThreatLevel } from '../detection/threat';
import type { EngineDeps } from '../deps';
import type { GameState } from '../state/types';
import type { AccessLevel } from '../simulation/types';
import { canExtract, isObjectiveComplete, outstandingObjectives } from './engine';
import { resolveSession } from './session';
import { evaluateAvailability } from './unlock';
import type { MissionDifficulty, MissionStatus } from './types';

export interface ObjectiveView {
  readonly id: string;
  readonly description: string;
  readonly optional: boolean;
  readonly complete: boolean;
}

export interface ActiveMissionView {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly difficulty: MissionDifficulty;
  readonly briefing: string;
  readonly status: MissionStatus;
  readonly detection: number;
  readonly threatLevel: ThreatLevel;
  readonly threatLabel: string;
  readonly threatDescription: string;
  readonly stealthActionsLeft: number;
  readonly accessLevel: AccessLevel;
  readonly objectives: readonly ObjectiveView[];
  readonly readyToExtract: boolean;
  readonly outstandingCount: number;
  readonly failed: boolean;
  readonly failureReason: string | null;
}

export interface MissionRewardView {
  readonly xp: number;
  readonly credits: number;
  readonly reputation: number;
}

export interface MissionListEntry {
  /** Position in the campaign, one-based, for display. */
  readonly number: number;
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly difficulty: MissionDifficulty;
  readonly status: 'locked' | 'available' | 'completed';
  /** Why it is locked, in the player's words. Empty when it is not. */
  readonly blockers: readonly string[];
  readonly reward: MissionRewardView;
  readonly isActive: boolean;
}

export function selectActiveMission(
  state: GameState,
  deps: EngineDeps,
): ActiveMissionView | null {
  const session = resolveSession(state, deps);
  if (session === null) {
    return null;
  }

  const { mission, runtime } = session;
  const band = threatBandFor(runtime.detection);

  return {
    id: mission.id,
    title: mission.title,
    organization: mission.organization,
    difficulty: mission.difficulty,
    briefing: mission.briefing,
    status: runtime.status,
    detection: runtime.detection,
    threatLevel: band.level,
    threatLabel: band.label,
    threatDescription: band.description,
    stealthActionsLeft: Math.max(0, STEALTH_ACTIONS_PER_CONTRACT - runtime.stealthActionsUsed),
    accessLevel: runtime.accessLevel,
    objectives: mission.objectives.map((objective) => ({
      id: objective.id,
      description: objective.description,
      optional: objective.optional,
      complete: isObjectiveComplete(runtime, objective.id),
    })),
    readyToExtract: canExtract(mission, runtime),
    outstandingCount: outstandingObjectives(mission, runtime).length,
    failed: runtime.status === 'failed',
    failureReason: runtime.failureReason,
  };
}

export function selectMissionList(
  state: GameState,
  deps: EngineDeps,
): readonly MissionListEntry[] {
  const activeId = state.activeMission?.missionId ?? null;

  return deps.missions.all.map((mission, index) => {
    const availability = evaluateAvailability(mission, state.player);
    return {
      number: index + 1,
      id: mission.id,
      title: mission.title,
      organization: mission.organization,
      difficulty: mission.difficulty,
      status: availability.status,
      blockers: availability.blockers,
      reward: {
        xp: mission.reward.xp,
        credits: mission.reward.credits,
        reputation: mission.reward.reputation,
      },
      isActive: mission.id === activeId,
    };
  });
}
