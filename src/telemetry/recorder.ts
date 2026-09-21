/**
 * Telemetry recorder.
 *
 * A pure fold over what the engine already reports, so it can be tested
 * without a browser and cannot affect play: it reads events and a state
 * snapshot and returns a new session. It never writes to game state, never
 * touches storage, and never reads the clock itself — elapsed time is passed
 * in, which is also what makes it deterministic under test.
 */
import type { GameEvent } from '../game/engine';
import type { GameState } from '../game/engine';
import { EMPTY_SESSION, type MissionRecord, type PlaytestSession } from './types';

export interface Observation {
  /** The command that ran, by id. Player-typed text is deliberately not kept. */
  readonly commandId: string | null;
  readonly rejected: boolean;
  readonly events: readonly GameEvent[];
  readonly stateBefore: GameState;
  readonly stateAfter: GameState;
  /** Milliseconds since the session began. */
  readonly elapsedMs: number;
}

function startRecord(
  missionId: string,
  credits: number,
  elapsedMs: number,
  retries: number,
): MissionRecord {
  return {
    missionId,
    startedAt: elapsedMs,
    completedAt: null,
    durationMs: null,
    commandsExecuted: 0,
    invalidCommands: 0,
    failedPuzzleAttempts: 0,
    hintsShown: 0,
    detectionSamples: [],
    peakDetection: 0,
    creditsBefore: credits,
    creditsAfter: null,
    creditsSpent: 0,
    toolsPurchased: [],
    outcome: 'in-progress',
    retries,
  };
}

function replaceLast(
  records: readonly MissionRecord[],
  next: MissionRecord,
): readonly MissionRecord[] {
  return [...records.slice(0, -1), next];
}

/**
 * A wrong puzzle answer is reported as a rejection-free command that reduced
 * the attempt budget, so it is counted from state rather than from an event —
 * the engine has no "puzzle failed" event and adding one for telemetry would
 * be the tail wagging the dog.
 */
function countFailedAttempts(state: GameState): number {
  const attempts = state.activeMission?.puzzleAttempts ?? {};
  return Object.values(attempts).reduce((total, value) => total + value, 0);
}

export function observe(session: PlaytestSession, observation: Observation): PlaytestSession {
  const { events, stateBefore, stateAfter, elapsedMs } = observation;
  let records = session.records;

  const started = events.find((event) => event.type === 'MISSION_STARTED');
  if (started !== undefined) {
    const priorAttempts = records.filter(
      (record) => record.missionId === started.missionId,
    ).length;
    // A contract left unfinished when another is taken is abandoned, not lost.
    const current = records.at(-1);
    if (current?.outcome === 'in-progress') {
      records = replaceLast(records, { ...current, outcome: 'abandoned' });
    }
    records = [
      ...records,
      startRecord(started.missionId, stateAfter.player.credits, elapsedMs, priorAttempts),
    ];
  }

  const current = records.at(-1);
  if (current === undefined) {
    return {
      records,
      totalCommands: session.totalCommands + (observation.rejected ? 0 : 1),
      totalInvalidCommands: session.totalInvalidCommands + (observation.rejected ? 1 : 0),
    };
  }

  const detection = stateAfter.activeMission?.detection ?? current.peakDetection;
  const spent =
    Math.max(0, stateBefore.player.credits - stateAfter.player.credits) + current.creditsSpent;

  const purchased = events.flatMap((event) =>
    event.type === 'TOOL_UNLOCKED' && event.purchased ? [event.toolId] : [],
  );

  const failedAttempts = countFailedAttempts(stateAfter);
  const newlyFailed = Math.max(0, failedAttempts - current.failedPuzzleAttempts);

  let updated: MissionRecord = {
    ...current,
    commandsExecuted: current.commandsExecuted + (observation.rejected ? 0 : 1),
    invalidCommands: current.invalidCommands + (observation.rejected ? 1 : 0),
    failedPuzzleAttempts: failedAttempts,
    // Every wrong answer prints the puzzle's hint, so the two move together.
    hintsShown: current.hintsShown + newlyFailed,
    detectionSamples:
      observation.commandId === null
        ? current.detectionSamples
        : [...current.detectionSamples, { commandId: observation.commandId, detection }],
    peakDetection: Math.max(current.peakDetection, detection),
    creditsSpent: spent,
    toolsPurchased: [...new Set([...current.toolsPurchased, ...purchased])],
  };

  const completed = events.find((event) => event.type === 'MISSION_COMPLETED');
  const failed = events.find((event) => event.type === 'MISSION_FAILED');
  if (completed !== undefined || failed !== undefined) {
    updated = {
      ...updated,
      outcome: completed !== undefined ? 'completed' : 'failed',
      completedAt: elapsedMs,
      durationMs: elapsedMs - updated.startedAt,
      creditsAfter: stateAfter.player.credits,
    };
  }

  return {
    records: replaceLast(records, updated),
    totalCommands: session.totalCommands + (observation.rejected ? 0 : 1),
    totalInvalidCommands: session.totalInvalidCommands + (observation.rejected ? 1 : 0),
  };
}

export function createSession(): PlaytestSession {
  return EMPTY_SESSION;
}

/** Flat rows, for reading in a console or pasting into a sheet. */
export function summarize(session: PlaytestSession): readonly Record<string, unknown>[] {
  return session.records.map((record) => ({
    mission: record.missionId,
    outcome: record.outcome,
    retries: record.retries,
    commands: record.commandsExecuted,
    invalid: record.invalidCommands,
    puzzleFails: record.failedPuzzleAttempts,
    hints: record.hintsShown,
    peakTrace: record.peakDetection,
    creditsBefore: record.creditsBefore,
    creditsAfter: record.creditsAfter,
    creditsSpent: record.creditsSpent,
    toolsBought: record.toolsPurchased.join(' '),
    durationMs: record.durationMs,
  }));
}
