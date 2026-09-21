/**
 * Tool behaviour.
 *
 * Each of these proves a tool does what its catalog entry says, which is the
 * defect the pre-release audit found: descriptions promising mechanics that
 * were never implemented.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createGameDeps, createTrainingGameState } from '../../../data/bootstrap';
import { TOOLS } from '../../../data/tools';
import { ACTION_TRACE_COST } from '../../detection/detection';
import { executeCommandLine } from '../../engine';
import type { GameState } from '../../state/types';

const deps = createGameDeps();
let state: GameState;

function run(input: string): readonly string[] {
  const result = executeCommandLine(state, input, deps);
  state = result.state;
  return result.outputs.map((line) => line.text);
}

const text = (lines: readonly string[]) => lines.join('\n');

function giveTool(id: string) {
  state = {
    ...state,
    player: { ...state.player, unlockedToolIds: [...state.player.unlockedToolIds, id] },
  };
}

function withoutTools() {
  state = { ...state, player: { ...state.player, unlockedToolIds: ['basic-scanner'] } };
}

beforeEach(() => {
  state = createTrainingGameState(2026);
});

describe('Advanced Scanner', () => {
  it('Basic Scanner alone reports a service as unidentified', () => {
    withoutTools();
    run('scan');
    const out = text(run('ports edge-gateway'));

    expect(out).toContain('unidentified');
    expect(out).not.toContain('perimeter-gateway');
    expect(out).not.toContain('2.4.1');
  });

  it('Advanced Scanner names the service and version instead', () => {
    giveTool('advanced-scanner');
    run('scan');
    const out = text(run('ports edge-gateway'));

    expect(out).toContain('perimeter-gateway 2.4.1');
    expect(out).toContain('http-redirect 1.1.0');
    expect(out).not.toContain('unidentified');
  });

  it('still shows a dash for a port with nothing behind it', () => {
    giveTool('advanced-scanner');
    run('scan');
    // Port 22 is filtered and carries no service on either scanner.
    expect(text(run('ports edge-gateway'))).toContain('—');
  });

  it('does not record the service as identified: analyze is still required', () => {
    giveTool('advanced-scanner');
    run('scan');
    run('ports edge-gateway');

    expect(state.activeMission?.discovered.serviceIds).toEqual([]);
    expect(text(run('inspect perimeter-gateway'))).toContain('Nothing discovered matches');

    run('analyze 443');
    expect(state.activeMission?.discovered.serviceIds).toContain('acme-gateway');
  });

  it('says which scanner produced the reading', () => {
    withoutTools();
    run('scan');
    expect(text(run('ports edge-gateway'))).toContain('Use "analyze <port>" to identify a service.');

    state = createTrainingGameState(2026);
    giveTool('advanced-scanner');
    run('scan');
    expect(text(run('ports edge-gateway'))).toContain('Advanced Scanner resolved service versions.');
  });

  it('keeps the trace cost valid and inside the meter', () => {
    giveTool('advanced-scanner');
    run('scan');
    const before = state.activeMission?.detection ?? 0;
    run('ports edge-gateway');
    const after = state.activeMission?.detection ?? 0;

    expect(Number.isInteger(after)).toBe(true);
    expect(after).toBeGreaterThanOrEqual(0);
    expect(after).toBeLessThanOrEqual(100);
    // The tool's multiplier scales the published cost; it never removes it.
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeLessThanOrEqual(ACTION_TRACE_COST.ports);
  });

  it('charges less trace across a recon pass', () => {
    /*
     * The multiplier is applied per action and the meter is integral, so a
     * cheap action can round back to the same figure — scan at 5 and ports at
     * 4 both survive x0.9 untouched. The saving shows up over a pass that
     * includes the dearer actions, which is how a player experiences it.
     */
    const pass = ['scan', 'ports edge-gateway', 'analyze 443'];

    withoutTools();
    for (const input of pass) run(input);
    const basicCost = state.activeMission?.detection ?? 0;

    state = createTrainingGameState(2026);
    giveTool('advanced-scanner');
    for (const input of pass) run(input);
    const advancedCost = state.activeMission?.detection ?? 0;

    expect(advancedCost).toBeLessThan(basicCost);
  });

  it('never charges more than the Basic Scanner for any single action', () => {
    for (const action of ['scan', 'ports edge-gateway', 'analyze 443', 'inspect edge-gateway']) {
      withoutTools();
      state = createTrainingGameState(2026);
      run('scan');
      run('ports edge-gateway');
      const basicBefore = state.activeMission?.detection ?? 0;
      run(action);
      const basicDelta = (state.activeMission?.detection ?? 0) - basicBefore;

      state = createTrainingGameState(2026);
      giveTool('advanced-scanner');
      run('scan');
      run('ports edge-gateway');
      const advBefore = state.activeMission?.detection ?? 0;
      run(action);
      const advDelta = (state.activeMission?.detection ?? 0) - advBefore;

      expect(advDelta, `${action} cost more with the Advanced Scanner`).toBeLessThanOrEqual(
        basicDelta,
      );
    }
  });

  it('is deterministic: the same state gives the same reading every time', () => {
    const readTwice = () => {
      let local = createTrainingGameState(777);
      local = {
        ...local,
        player: {
          ...local.player,
          unlockedToolIds: [...local.player.unlockedToolIds, 'advanced-scanner'],
        },
      };
      local = executeCommandLine(local, 'scan', deps).state;
      const result = executeCommandLine(local, 'ports edge-gateway', deps);
      return { text: result.outputs.map((l) => l.text), state: result.state };
    };

    const first = readTwice();
    const second = readTwice();
    expect(first.text).toEqual(second.text);
    expect(first.state).toEqual(second.state);
  });
});

describe('Decoder', () => {
  it('a cipher cannot be attempted without it', () => {
    withoutTools();
    expect(text(run('solve orion-cipher three'))).toContain('Requires tool: decoder');
  });

  it('can be attempted with it', () => {
    giveTool('decoder');
    // No such puzzle on this contract, but the tool gate has been passed.
    expect(text(run('solve orion-cipher three'))).toContain('No such puzzle');
  });
});

describe('catalog integrity', () => {
  it('no tool is handed over by a contract', () => {
    for (const tool of TOOLS) {
      expect(state.player.unlockedToolIds.includes(tool.id) || tool.cost > 0).toBe(true);
    }
  });

  it('every purchasable tool costs something and states a level', () => {
    for (const tool of TOOLS.filter((t) => t.id !== 'basic-scanner')) {
      expect(tool.cost).toBeGreaterThan(0);
      expect(tool.requiredLevel).toBeGreaterThanOrEqual(1);
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it('every tool has a mechanical effect or is required by a contract', () => {
    const requiredSomewhere = new Set(
      deps.missions.all.flatMap((mission) => mission.unlock.requiredToolIds),
    );
    for (const tool of TOOLS) {
      const quiets = tool.detectionMultiplier < 1;
      const gatesACommand = tool.id === 'basic-scanner' || tool.id === 'decoder';
      expect(
        quiets || gatesACommand || requiredSomewhere.has(tool.id),
        `${tool.id} does nothing`,
      ).toBe(true);
    }
  });
});
