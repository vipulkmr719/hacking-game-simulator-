/**
 * Terminal to engine, end to end.
 *
 * Exercises the path a player actually drives: raw text in, parsed, stepped,
 * lines out — with no component layer involved.
 */
import { describe, expect, it } from 'vitest';
import { executeCommandLine } from '../../src/game/engine';
import type { GameState } from '../../src/game/engine';
import { createGameDeps, createTrainingGameState } from '../../src/data/bootstrap';
import { createInitialGameState } from '../../src/game/state/initial';

const deps = createGameDeps();

function play(inputs: readonly string[], seed = 2024) {
  let state: GameState = createInitialGameState(seed);
  const transcript: string[] = [];
  for (const input of inputs) {
    const result = executeCommandLine(state, input, deps);
    state = result.state;
    transcript.push(...result.outputs.map((line) => line.text));
  }
  return { state, transcript };
}

describe('terminal flow', () => {
  it('boots, lists help, and reports status', () => {
    const { state, transcript } = play(['help', 'status']);
    expect(transcript.join('\n')).toContain('AVAILABLE COMMANDS');
    expect(transcript.join('\n')).toContain('OPERATOR STATUS');
    expect(state.player.statistics.commandsExecuted).toBe(2);
  });

  it('rejects an unregistered command with the standard message', () => {
    const { transcript } = play(['xyzzy plugh']);
    expect(transcript).toEqual([
      'Command not recognized.',
      'Type "help" for available commands.',
    ]);
  });

  it('never executes a real tool name, and names the game equivalent', () => {
    const { transcript, state } = play(['nmap acme.local']);
    expect(transcript).toEqual([
      '"nmap" is not part of this simulation.',
      'This simulation uses "scan".',
      'Type "help" for available commands.',
    ]);
    expect(state.player.statistics.commandsExecuted).toBe(0);
  });

  it('does not count an unrecognized command as executed', () => {
    const { state } = play(['nmap acme.local', 'sudo su', 'curl https://example.com']);
    expect(state.player.statistics.commandsExecuted).toBe(0);
  });

  it('runs the whole recon chain against the training target', () => {
    let state = createTrainingGameState(7);
    const transcript: string[] = [];
    for (const input of ['scan', 'ports edge-gateway', 'analyze 443', 'logs edge-gateway']) {
      const result = executeCommandLine(state, input, deps);
      state = result.state;
      transcript.push(...result.outputs.map((line) => line.text));
    }
    const text = transcript.join('\n');
    expect(text).toContain('3 host(s) mapped.');
    expect(text).toContain('perimeter-gateway');
    expect(text).toContain('session token reuse observed from internal range');
    expect(state.player.statistics.commandsExecuted).toBe(4);
  });

  it('produces nothing for blank input', () => {
    const { transcript, state } = play(['', '   ']);
    expect(transcript).toEqual([]);
    expect(state.player.statistics.commandsExecuted).toBe(0);
  });

  it('accepts aliases and mixed case', () => {
    const { state } = play(['?', 'CLS', 'Stat']);
    expect(state.player.statistics.commandsExecuted).toBe(3);
  });

  it('replays identically from the same seed', () => {
    const script = ['help', 'status', 'nmap x', 'clear', 'help status'];
    expect(play(script, 99).state).toEqual(play(script, 99).state);
  });

  it('survives a long hostile session without throwing', () => {
    const hostile = [
      'help; rm -rf /',
      '$(curl https://example.com)',
      '<script>alert(1)</script>',
      '../../../../etc/passwd',
      'x'.repeat(5000),
      '\u0000\u001b[2J',
      'help '.repeat(100),
    ];
    expect(() => play(hostile)).not.toThrow();
    expect(play(hostile).state.activeMission).toBeNull();
  });
});
