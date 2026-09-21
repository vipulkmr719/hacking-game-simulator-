import { describe, expect, it } from 'vitest';
import { executeCommand } from '../actions';
import { createCommandRegistry } from '../commands/registry';
import { COMMAND_SPECS, createDefaultRegistry } from '../commands/definitions';
import type { CommandRegistry, CommandSpec } from '../commands/types';
import type { EngineDeps } from '../deps';
import { createMissionCatalog } from '../missions/catalog';
import { createMissionRuntimeState } from '../missions/types';
import { orientationMission } from '../../data/missions/orientation';
import { createInitialGameState } from './initial';
import { step } from './reducer';
import type { GameState } from './types';

const catalog = createMissionCatalog([orientationMission]);
const withRegistry = (registry: CommandRegistry): EngineDeps => ({ registry, missions: catalog });
const deps = withRegistry(createDefaultRegistry());

function withMission(state: GameState): GameState {
  return { ...state, activeMission: createMissionRuntimeState(orientationMission) };
}

/** A synthetic command used to exercise the reducer's cross-cutting gates. */
function probe(overrides: Partial<CommandSpec>): CommandSpec {
  return {
    id: 'probe',
    name: 'probe',
    aliases: [],
    summary: 'test probe',
    usage: 'probe',
    args: [],
    requiresActiveMission: false,
    requiredAccessLevel: 'none',
    requiredToolId: null,
    detectionCost: 0,
    run: (context) => ({ state: context.state, outputs: [], events: [] }),
    ...overrides,
  };
}

describe('step', () => {
  it('runs a registered command and reports it', () => {
    const result = step(createInitialGameState(), executeCommand('status', []), deps);
    expect(result.outputs.length).toBeGreaterThan(0);
    expect(result.events).toContainEqual({ type: 'COMMAND_EXECUTED', commandId: 'status' });
  });

  it('counts only commands that actually executed', () => {
    const executed = step(createInitialGameState(), executeCommand('status', []), deps);
    expect(executed.state.player.statistics.commandsExecuted).toBe(1);

    const rejectedResult = step(
      createInitialGameState(),
      executeCommand('not-registered', []),
      deps,
    );
    expect(rejectedResult.state.player.statistics.commandsExecuted).toBe(0);
  });

  it('rejects an action naming an unregistered command', () => {
    const result = step(createInitialGameState(), executeCommand('nmap', []), deps);
    expect(result.outputs[0]?.text).toBe('Command not recognized.');
    expect(result.events).toContainEqual({
      type: 'COMMAND_REJECTED',
      commandId: 'nmap',
      reason: 'unregistered-command',
    });
  });

  it('never mutates the state it is given', () => {
    const state = createInitialGameState();
    const before = structuredClone(state);
    step(state, executeCommand('status', []), deps);
    expect(state).toEqual(before);
  });

  it('is deterministic for identical input', () => {
    const run = () => {
      let state = createInitialGameState(4242);
      for (const command of ['status', 'help', 'status']) {
        state = step(state, executeCommand(command, []), deps).state;
      }
      return state;
    };
    expect(run()).toEqual(run());
  });

  describe('gates', () => {
    it('blocks a mission-only command with no active mission', () => {
      const local = createCommandRegistry([
        ...COMMAND_SPECS,
        probe({ requiresActiveMission: true }),
      ]);
      const result = step(createInitialGameState(), executeCommand('probe', []), withRegistry(local));
      expect(result.outputs[0]?.text).toBe('No active session. No target is loaded.');
      expect(result.events).toContainEqual({
        type: 'COMMAND_REJECTED',
        commandId: 'probe',
        reason: 'no-active-session',
      });
    });

    it('blocks a command whose required tool is not unlocked', () => {
      const local = createCommandRegistry([
        ...COMMAND_SPECS,
        probe({ requiredToolId: 'forensic-kit' }),
      ]);
      const result = step(createInitialGameState(), executeCommand('probe', []), withRegistry(local));
      expect(result.outputs[0]?.text).toBe('Requires tool: forensic-kit');
    });

    it('allows a command whose required tool is unlocked', () => {
      const local = createCommandRegistry([
        ...COMMAND_SPECS,
        probe({ requiredToolId: 'basic-scanner' }),
      ]);
      const result = step(createInitialGameState(), executeCommand('probe', []), withRegistry(local));
      expect(result.events).toContainEqual({ type: 'COMMAND_EXECUTED', commandId: 'probe' });
    });

    it('blocks a command demanding more access than the mission has', () => {
      const local = createCommandRegistry([
        ...COMMAND_SPECS,
        probe({ requiredAccessLevel: 'root' }),
      ]);
      const result = step(withMission(createInitialGameState()), executeCommand('probe', []), withRegistry(local));
      expect(result.outputs[0]?.text).toBe('Insufficient access. Requires: root');
    });
  });

  describe('detection', () => {
    it('adds the command cost to the meter and reports the change', () => {
      const local = createCommandRegistry([...COMMAND_SPECS, probe({ detectionCost: 15 })]);
      const result = step(withMission(createInitialGameState()), executeCommand('probe', []), withRegistry(local));

      expect(result.state.activeMission?.detection).toBe(15);
      expect(result.events).toContainEqual({
        type: 'DETECTION_CHANGED',
        previous: 0,
        current: 15,
      });
    });

    it('ignores detection cost when no mission is active', () => {
      const local = createCommandRegistry([...COMMAND_SPECS, probe({ detectionCost: 15 })]);
      const result = step(createInitialGameState(), executeCommand('probe', []), withRegistry(local));
      expect(result.state.activeMission).toBeNull();
    });

    it('fails the mission when trace reaches 100', () => {
      const local = createCommandRegistry([...COMMAND_SPECS, probe({ detectionCost: 100 })]);
      const result = step(withMission(createInitialGameState()), executeCommand('probe', []), withRegistry(local));

      expect(result.state.activeMission?.status).toBe('failed');
      expect(result.state.activeMission?.detection).toBe(100);
      expect(result.state.activeMission?.failureReason).toBe('Trace reached 100%.');
      expect(result.state.player.statistics.missionsFailed).toBe(1);
      expect(result.outputs.at(-1)?.text).toBe('MISSION FAILED — trace reached 100%.');
      expect(result.events).toContainEqual({
        type: 'MISSION_FAILED',
        missionId: 'orientation',
        reason: 'Trace reached 100%.',
      });
    });

    it('never pushes the meter above the maximum', () => {
      const local = createCommandRegistry([...COMMAND_SPECS, probe({ detectionCost: 500 })]);
      const result = step(withMission(createInitialGameState()), executeCommand('probe', []), withRegistry(local));
      expect(result.state.activeMission?.detection).toBe(100);
    });

    it('does not fail an already-failed mission a second time', () => {
      const local = createCommandRegistry([...COMMAND_SPECS, probe({ detectionCost: 100 })]);
      const first = step(withMission(createInitialGameState()), executeCommand('probe', []), withRegistry(local));
      const second = step(first.state, executeCommand('probe', []), withRegistry(local));
      expect(second.state.player.statistics.missionsFailed).toBe(1);
    });
  });
});
