/**
 * Engine events.
 *
 * `step` reports what happened as data rather than reaching out to do it. The
 * UI decides how to react — clearing scrollback, playing a sound, animating a
 * meter — which keeps those side effects out of the pure engine.
 */

import type { ThreatLevel } from './detection/threat';

export type GameEvent =
  | { readonly type: 'COMMAND_EXECUTED'; readonly commandId: string }
  | { readonly type: 'COMMAND_REJECTED'; readonly commandId: string; readonly reason: string }
  | { readonly type: 'TERMINAL_CLEARED' }
  | {
      readonly type: 'DETECTION_CHANGED';
      readonly previous: number;
      readonly current: number;
    }
  | { readonly type: 'MISSION_STARTED'; readonly missionId: string }
  | {
      readonly type: 'OBJECTIVE_COMPLETED';
      readonly missionId: string;
      readonly objectiveId: string;
      readonly optional: boolean;
    }
  | {
      readonly type: 'MISSION_COMPLETED';
      readonly missionId: string;
      readonly rewarded: boolean;
    }
  | { readonly type: 'MISSION_FAILED'; readonly missionId: string; readonly reason: string }
  | {
      readonly type: 'THREAT_LEVEL_CHANGED';
      readonly previous: ThreatLevel;
      readonly current: ThreatLevel;
      readonly detection: number;
    }
  | { readonly type: 'SECURITY_EVENT'; readonly level: ThreatLevel; readonly message: string }
  | { readonly type: 'TOOL_UNLOCKED'; readonly toolId: string; readonly purchased: boolean }
  | { readonly type: 'ACHIEVEMENT_UNLOCKED'; readonly achievementId: string }
  | { readonly type: 'LEVEL_REACHED'; readonly level: number };
