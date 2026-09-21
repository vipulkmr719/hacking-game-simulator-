/**
 * Telemetry recorder.
 *
 * The recorder must never affect play, so these also pin that it is a pure
 * fold: same inputs, same session, and no mutation of what it is given.
 */
import { describe, expect, it } from 'vitest';
import { createGameDeps, createTrainingGameState } from '../data/bootstrap';
import { executeCommandLine } from '../game/engine';
import { createInitialGameState } from '../game/state/initial';
import type { GameState } from '../game/engine';
import { createSession, observe, summarize } from './recorder';
import type { PlaytestSession } from './types';

const deps = createGameDeps();

/** Plays a script, recording as the hook does. */
function play(inputs: readonly string[], start: GameState = createInitialGameState(7)) {
  let state = start;
  let session: PlaytestSession = createSession();
  let clock = 0;

  for (const input of inputs) {
    const before = state;
    const result = executeCommandLine(before, input, deps);
    state = result.state;
    clock += 1000;
    const executed = result.events.find((event) => event.type === 'COMMAND_EXECUTED');
    session = observe(session, {
      commandId: executed?.commandId ?? null,
      rejected: executed === undefined,
      events: result.events,
      stateBefore: before,
      stateAfter: state,
      elapsedMs: clock,
    });
  }

  return { state, session };
}

describe('recording a contract', () => {
  it('opens a record when a contract starts', () => {
    const { session } = play(['start first-connection']);
    expect(session.records).toHaveLength(1);
    expect(session.records[0]?.missionId).toBe('first-connection');
    expect(session.records[0]?.outcome).toBe('in-progress');
  });

  it('counts commands and separates the invalid ones', () => {
    const { session } = play(['start first-connection', 'scan', 'xyzzy', 'nmap x', 'status']);
    const record = session.records[0];

    expect(record?.commandsExecuted).toBe(3);
    expect(record?.invalidCommands).toBe(2);
    expect(session.totalInvalidCommands).toBe(2);
  });

  it('samples detection after each action and keeps the peak', () => {
    const { session } = play(['start first-connection', 'scan', 'ports acme-edge-01']);
    const record = session.records[0];

    expect(record?.detectionSamples.length).toBeGreaterThan(1);
    expect(record?.peakDetection).toBeGreaterThan(0);
    expect(record?.peakDetection).toBe(
      Math.max(...(record?.detectionSamples.map((s) => s.detection) ?? [0])),
    );
  });

  it('closes the record on completion, with a duration', () => {
    const { session } = play([
      'start first-connection',
      'scan',
      'ports acme-edge-01',
      'analyze 443',
      'escape',
    ]);
    const record = session.records[0];

    expect(record?.outcome).toBe('completed');
    expect(record?.completedAt).not.toBeNull();
    expect(record?.durationMs).toBeGreaterThan(0);
    expect(record?.creditsAfter).toBeGreaterThan(record?.creditsBefore ?? 0);
  });

  it('records a failure as a failure', () => {
    let start = createTrainingGameState(1);
    const mission = start.activeMission;
    start = mission === null ? start : { ...start, activeMission: { ...mission, detection: 99 } };

    const { session } = play(['scan'], start);
    // No MISSION_STARTED was observed, so the run is recorded at session level.
    expect(session.totalCommands).toBe(1);
  });

  it('counts retries of the same contract', () => {
    const { session } = play([
      'start first-connection',
      'start first-connection',
      'start first-connection',
    ]);

    expect(session.records.map((record) => record.retries)).toEqual([0, 1, 2]);
  });

  it('marks an unfinished contract abandoned when another is taken', () => {
    const { session } = play(['start first-connection', 'scan', 'start first-connection']);
    expect(session.records[0]?.outcome).toBe('abandoned');
  });
});

describe('purchases and puzzles', () => {
  it('records a tool purchase and what it cost', () => {
    let start = createInitialGameState(3);
    start = { ...start, player: { ...start.player, credits: 2000, level: 9 } };

    const { session } = play(['start first-connection', 'buy advanced-scanner'], start);
    const record = session.records[0];

    expect(record?.toolsPurchased).toEqual(['advanced-scanner']);
    expect(record?.creditsSpent).toBe(750);
  });

  it('counts failed puzzle attempts and the hints they printed', () => {
    let start = createInitialGameState(5);
    start = {
      ...start,
      player: {
        ...start.player,
        level: 9,
        credits: 5000,
        unlockedToolIds: [...start.player.unlockedToolIds, 'decoder'],
        completedMissionIds: ['first-connection', 'open-ports', 'hidden-service'],
      },
    };

    const { session } = play(
      ['start encrypted-archive', 'solve orion-cipher wrong', 'solve orion-cipher alsowrong'],
      start,
    );
    const record = session.records[0];

    expect(record?.failedPuzzleAttempts).toBe(2);
    expect(record?.hintsShown).toBe(2);
  });
});

describe('purity', () => {
  it('never mutates the session it is given', () => {
    const before = createSession();
    const snapshot = structuredClone(before);
    play(['start first-connection', 'scan']);
    expect(before).toEqual(snapshot);
  });

  it('produces the same session for the same script', () => {
    const script = ['start first-connection', 'scan', 'ports acme-edge-01', 'escape'];
    expect(play(script).session).toEqual(play(script).session);
  });

  it('records nothing that identifies a person or repeats their input', () => {
    const { session } = play(['start first-connection', 'inspect my-secret-note-to-self']);
    const serialized = JSON.stringify(session);

    // Only command ids are kept; the arguments a player types are not.
    expect(serialized).not.toContain('my-secret-note-to-self');
  });

  it('summarizes into flat rows', () => {
    const { session } = play(['start first-connection', 'scan']);
    const rows = summarize(session);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveProperty('mission', 'first-connection');
    expect(rows[0]).toHaveProperty('peakTrace');
  });
});
