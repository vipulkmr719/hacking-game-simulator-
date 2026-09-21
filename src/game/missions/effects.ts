/**
 * Effect application.
 *
 * The mirror of conditions: the one place mission data becomes a state change.
 * Each branch returns a new runtime; none of them can express anything outside
 * this closed union, which is what keeps mission content from becoming an
 * execution surface.
 */
import { applyDetectionDelta } from '../detection/detection';
import {
  revealFiles,
  revealHosts,
  revealPorts,
  revealService,
} from '../simulation/discovery';
import type { MissionEffect, MissionRuntimeState } from './types';

export function applyEffect(
  effect: MissionEffect,
  runtime: MissionRuntimeState,
): MissionRuntimeState {
  switch (effect.type) {
    case 'reveal-host':
      return { ...runtime, discovered: revealHosts(runtime.discovered, [effect.hostId]) };
    case 'reveal-port':
      return { ...runtime, discovered: revealPorts(runtime.discovered, [effect.portId]) };
    case 'reveal-service':
      return {
        ...runtime,
        discovered: revealService(runtime.discovered, effect.serviceId, []),
      };
    case 'reveal-vulnerability':
      return {
        ...runtime,
        discovered: {
          ...runtime.discovered,
          vulnerabilityIds: [
            ...new Set([...runtime.discovered.vulnerabilityIds, effect.vulnerabilityId]),
          ],
        },
      };
    case 'reveal-file':
      return { ...runtime, discovered: revealFiles(runtime.discovered, [effect.fileId]) };
    case 'set-access-level':
      return { ...runtime, accessLevel: effect.level };
    case 'adjust-detection':
      return { ...runtime, detection: applyDetectionDelta(runtime.detection, effect.delta) };
    case 'complete-objective':
      // Recorded as forced rather than written onto the objective, which the
      // next evaluation would recompute away.
      return {
        ...runtime,
        forcedObjectiveIds: [...new Set([...runtime.forcedObjectiveIds, effect.objectiveId])],
      };
    case 'fail-mission':
      return { ...runtime, status: 'failed', failureReason: effect.reason };
  }
}

export function applyEffects(
  effects: readonly MissionEffect[],
  runtime: MissionRuntimeState,
): MissionRuntimeState {
  return effects.reduce((current, effect) => applyEffect(effect, current), runtime);
}
