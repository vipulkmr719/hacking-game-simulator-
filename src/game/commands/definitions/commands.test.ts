import { describe, expect, it } from 'vitest';
import { executeCommand } from '../../actions';
import { createInitialGameState } from '../../state/initial';
import { step } from '../../state/reducer';
import { createMissionRuntimeState } from '../../missions/types';
import { firstConnection } from '../../../data/missions';
import { TOOLS } from '../../../data/tools';
import { createMissionCatalog } from '../../missions/catalog';
import { createDefaultRegistry } from './index';

const registry = createDefaultRegistry();
const deps = { registry, missions: createMissionCatalog([firstConnection]), tools: TOOLS };
const run = (command: string, args: readonly string[] = [], state = createInitialGameState()) =>
  step(state, executeCommand(command, args), deps);

describe('help', () => {
  it('lists every registered command', () => {
    const text = run('help').outputs.map((line) => line.text).join('\n');
    for (const spec of registry.all) {
      expect(text).toContain(spec.name);
    }
  });

  it('describes a single command with its usage', () => {
    const text = run('help', ['status']).outputs.map((line) => line.text).join('\n');
    expect(text).toContain('STATUS');
    expect(text).toContain('Usage: status');
  });

  it('resolves a help topic given by alias', () => {
    const text = run('help', ['cls']).outputs.map((line) => line.text).join('\n');
    expect(text).toContain('CLEAR');
  });

  it('reports an unknown topic without failing', () => {
    const text = run('help', ['nmap']).outputs.map((line) => line.text).join('\n');
    expect(text).toContain('No help entry for "nmap".');
  });
});

describe('clear', () => {
  it('emits the cleared event and no output', () => {
    const result = run('clear');
    expect(result.outputs).toEqual([]);
    expect(result.events).toContainEqual({ type: 'TERMINAL_CLEARED' });
  });

  it('leaves game state unchanged apart from the command count', () => {
    const before = createInitialGameState();
    const after = run('clear', [], before).state;
    expect(after.player.credits).toBe(before.player.credits);
    expect(after.activeMission).toBeNull();
    expect(after.player.statistics.commandsExecuted).toBe(1);
  });
});

describe('status', () => {
  it('reports operator figures', () => {
    const text = run('status').outputs.map((line) => line.text).join('\n');
    expect(text).toContain('OPERATOR STATUS');
    expect(text).toContain('Level        1');
    expect(text).toContain('Credits      500');
  });

  it('says so when no mission is active', () => {
    const text = run('status').outputs.map((line) => line.text).join('\n');
    expect(text).toContain('No active mission.');
  });

  it('reports mission trace when a mission is active', () => {
    const state = {
      ...createInitialGameState(),
      activeMission: {
        ...createMissionRuntimeState(firstConnection),
        detection: 42,
      },
    };
    const text = run('status', [], state).outputs.map((line) => line.text).join('\n');
    expect(text).toContain('ACTIVE MISSION');
    expect(text).toContain('TRACE: 42%');
  });
});
