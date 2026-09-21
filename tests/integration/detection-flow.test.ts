/**
 * The detection system driven through the terminal.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createGameDeps, createTrainingGameState } from '../../src/data/bootstrap';
import {
  ACTION_TRACE_COST,
  STEALTH_ACTIONS_PER_CONTRACT,
  STEALTH_TRACE_RECOVERY,
} from '../../src/game/detection/detection';
import { executeCommandLine } from '../../src/game/engine';
import type { GameState } from '../../src/game/engine';

const deps = createGameDeps();
let state: GameState;

function run(input: string): readonly string[] {
  const result = executeCommandLine(state, input, deps);
  state = result.state;
  return result.outputs.map((line) => line.text);
}

const text = (lines: readonly string[]) => lines.join('\n');
const trace = () => state.activeMission?.detection ?? -1;
const band = () => state.activeMission?.threatLevel;

function setTrace(value: number) {
  const mission = state.activeMission;
  if (mission !== null) {
    state = { ...state, activeMission: { ...mission, detection: value } };
  }
}

beforeEach(() => {
  state = createTrainingGameState();
});

describe('action costs', () => {
  it('charges the published rate for each action', () => {
    run('scan');
    expect(trace()).toBe(ACTION_TRACE_COST.scan);

    run('ports edge-gateway');
    expect(trace()).toBe(ACTION_TRACE_COST.scan + ACTION_TRACE_COST.ports);

    run('inspect edge-gateway');
    expect(trace()).toBe(
      ACTION_TRACE_COST.scan + ACTION_TRACE_COST.ports + ACTION_TRACE_COST.inspect,
    );
  });

  it('charges nothing for orientation commands', () => {
    const before = trace();
    run('status');
    run('brief');
    run('missions');
    run('inventory');
    expect(trace()).toBe(before);
  });

  it('keeps the meter on whole numbers throughout', () => {
    for (const input of ['scan', 'ports edge-gateway', 'analyze 443', 'inspect edge-gateway']) {
      run(input);
      expect(Number.isInteger(trace())).toBe(true);
    }
  });

  it('never exceeds the maximum', () => {
    setTrace(98);
    run('scan');
    expect(trace()).toBe(100);
  });
});

describe('threat bands', () => {
  it('starts safe and says nothing', () => {
    expect(band()).toBe('safe');
    expect(text(run('status'))).not.toContain('SECURITY POSTURE');
  });

  it('announces the crossing into suspicious', () => {
    setTrace(24);
    const out = text(run('scan'));
    expect(out).toContain('SECURITY POSTURE → SUSPICIOUS');
    expect(out).toContain('Something has been noticed.');
    expect(band()).toBe('suspicious');
  });

  it('announces alert and critical as they are reached', () => {
    setTrace(48);
    expect(text(run('scan'))).toContain('SECURITY POSTURE → ALERT');
    setTrace(73);
    expect(text(run('scan'))).toContain('SECURITY POSTURE → CRITICAL');
    expect(text(run('brief'))).toBeDefined();
  });

  it('warns that the next action ends the run at critical', () => {
    setTrace(74);
    expect(text(run('scan'))).toContain('One more flagged action will end the run.');
  });

  it('announces a band only when it changes', () => {
    setTrace(30);
    run('inspect edge-gateway');
    const second = text(run('status'));
    expect(second).not.toContain('SECURITY POSTURE');
  });

  it('emits security chatter on escalation', () => {
    setTrace(24);
    const out = text(run('scan'));
    expect(out).toMatch(/\[SUSPICIOUS] /);
  });

  it('keeps talking on every rise once at alert', () => {
    setTrace(55);
    run('scan');
    const out = text(run('inspect edge-gateway'));
    expect(out).toMatch(/\[ALERT] /);
  });

  it('is reproducible: the same seed produces the same chatter', () => {
    const play = () => {
      let local = createTrainingGameState(31337);
      const transcript: string[] = [];
      const mission = local.activeMission;
      local =
        mission === null ? local : { ...local, activeMission: { ...mission, detection: 48 } };
      for (const input of ['scan', 'inspect edge-gateway', 'ports edge-gateway']) {
        const result = executeCommandLine(local, input, deps);
        local = result.state;
        transcript.push(...result.outputs.map((line) => line.text));
      }
      return transcript;
    };
    expect(play()).toEqual(play());
  });
});

describe('stealth action', () => {
  it('lowers the trace', () => {
    run('scan');
    const before = trace();
    const out = text(run('wait'));

    expect(out).toContain('GOING QUIET');
    expect(trace()).toBe(before - STEALTH_TRACE_RECOVERY);
  });

  it('reports the band it dropped to', () => {
    setTrace(30);
    const out = text(run('wait'));
    expect(out).toContain('30% → 25%');
    expect(out).toContain('SAFE');
  });

  it('announces a de-escalation', () => {
    // The band is synced by the reducer after each command, so the run has to
    // actually reach SUSPICIOUS before dropping out of it means anything.
    setTrace(28);
    expect(text(run('status'))).toContain('SECURITY POSTURE → SUSPICIOUS');
    expect(band()).toBe('suspicious');

    expect(text(run('wait'))).toContain('SECURITY POSTURE → SAFE');
    expect(band()).toBe('safe');
  });

  it('is capped per contract', () => {
    setTrace(90);
    for (let i = 0; i < STEALTH_ACTIONS_PER_CONTRACT; i += 1) {
      expect(text(run('wait'))).toContain('GOING QUIET');
    }
    expect(text(run('wait'))).toContain('No stealth actions left on this contract.');
  });

  it('counts down the remaining uses', () => {
    setTrace(50);
    expect(text(run('wait'))).toContain(`Remaining  ${String(STEALTH_ACTIONS_PER_CONTRACT - 1)}`);
  });

  it('refuses when there is nothing to cool', () => {
    expect(text(run('wait'))).toContain('Trace is already at zero.');
    expect(state.activeMission?.stealthActionsUsed).toBe(0);
  });

  it('never drives the meter below zero', () => {
    setTrace(2);
    run('wait');
    expect(trace()).toBe(0);
  });

  it('resets its budget on a new contract', () => {
    setTrace(50);
    run('wait');
    run('wait');
    run('retry');
    expect(state.activeMission?.stealthActionsUsed).toBe(0);
  });
});

describe('failure at 100', () => {
  function pushToFailure() {
    setTrace(98);
    return text(run('scan'));
  }

  it('presents a clear failure block', () => {
    const out = pushToFailure();
    expect(out).toContain('════ MISSION FAILED ════');
    expect(out).toContain('Trace reached 100%. The target resolved your origin.');
    expect(out).toContain('Run "retry" to run the contract again from a clean slate.');
  });

  it('records the failed state', () => {
    pushToFailure();
    expect(state.activeMission?.status).toBe('failed');
    expect(state.activeMission?.failureReason).toBe('Trace reached 100%.');
    expect(state.activeMission?.detection).toBe(100);
    expect(state.player.statistics.missionsFailed).toBe(1);
  });

  it('refuses extraction afterwards', () => {
    pushToFailure();
    expect(text(run('escape'))).toContain('Contract is failed.');
  });
});

describe('retry flow', () => {
  it('restarts from a clean slate after a failure', () => {
    setTrace(98);
    run('scan');
    const out = text(run('retry'));

    expect(out).toContain('RESTARTED  First Connection');
    expect(out).toContain('Clean slate. Security has lost you again.');
    expect(trace()).toBe(0);
    expect(band()).toBe('safe');
    expect(state.activeMission?.status).toBe('active');
    expect(state.activeMission?.discovered.hostIds).toEqual([]);
  });

  it('counts the retry as a fresh attempt', () => {
    const before = state.player.statistics.missionsAttempted;
    run('retry');
    expect(state.player.statistics.missionsAttempted).toBe(before + 1);
  });

  it('works on a contract that has not failed, discarding progress', () => {
    run('scan');
    const out = text(run('retry'));
    expect(out).toContain('Progress discarded.');
    expect(state.activeMission?.discovered.hostIds).toEqual([]);
  });

  it('keeps what the player earned', () => {
    setTrace(98);
    run('scan');
    const credits = state.player.credits;
    run('retry');
    expect(state.player.credits).toBe(credits);
  });

  it('is playable again after retrying', () => {
    setTrace(98);
    run('scan');
    run('retry');
    run('scan');
    run('ports edge-gateway');
    run('analyze 443');
    expect(text(run('escape'))).toContain('EXTRACTED  First Connection');
  });

  it('refuses with no contract loaded', () => {
    run('abort');
    expect(text(run('retry'))).toContain('No active session.');
  });
});
