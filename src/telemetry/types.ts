/**
 * Playtest telemetry — internal, local, and temporary.
 *
 * Exists to answer "is this campaign playable" with numbers instead of
 * guesses. It records nothing about a person: no identifiers, no input text,
 * no timestamps tied to a wall clock beyond elapsed milliseconds within the
 * session. Nothing is sent anywhere, and there is no analytics dependency to
 * remove later because none was added.
 *
 * To remove the whole feature: delete src/telemetry/ and the four lines in
 * useGameEngine.ts that reference it. To switch it off without deleting,
 * set PLAYTEST_ENABLED to false.
 */

/**
 * The single switch. Everything in this folder is inert when false.
 *
 * On during development, and off in a production build unless that build was
 * made explicitly for a playtest (VITE_PLAYTEST=true). "Developer-only" ought
 * to mean the instrumentation cannot reach a player by accident, not merely
 * that nobody remembered to turn it off.
 */
export const PLAYTEST_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_PLAYTEST === 'true';

/** Where a developer finds the session in a browser console. */
export const PLAYTEST_GLOBAL_KEY = '__CHS_PLAYTEST__';

export type MissionOutcome = 'in-progress' | 'completed' | 'failed' | 'abandoned';

export interface DetectionSample {
  /** The command that moved it, by id. Player arguments are never recorded. */
  readonly commandId: string;
  readonly detection: number;
}

export interface MissionRecord {
  readonly missionId: string;
  /** Milliseconds since the session began, not a wall-clock time. */
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly durationMs: number | null;
  readonly commandsExecuted: number;
  readonly invalidCommands: number;
  readonly failedPuzzleAttempts: number;
  readonly hintsShown: number;
  readonly detectionSamples: readonly DetectionSample[];
  readonly peakDetection: number;
  readonly creditsBefore: number;
  readonly creditsAfter: number | null;
  readonly creditsSpent: number;
  readonly toolsPurchased: readonly string[];
  readonly outcome: MissionOutcome;
  /** How many times this contract was restarted after the first attempt. */
  readonly retries: number;
}

export interface PlaytestSession {
  readonly records: readonly MissionRecord[];
  readonly totalCommands: number;
  readonly totalInvalidCommands: number;
}

export const EMPTY_SESSION: PlaytestSession = {
  records: [],
  totalCommands: 0,
  totalInvalidCommands: 0,
};
