/**
 * Injection and lookup-safety regression tests.
 *
 * Written during the pre-release audit. The terminal takes arbitrary text from
 * a player and uses it to index a plain object in the hint table and to match
 * against several catalogs. These pin the guards that make that safe, so a
 * later refactor that drops one fails here rather than in the wild.
 */
import { describe, expect, it } from 'vitest';
import { createGameDeps, createTrainingGameState } from '../../src/data/bootstrap';
import { lookupCommandHint } from '../../src/game/commands/hints';
import { createDefaultRegistry } from '../../src/game/commands/definitions';
import { executeCommandLine, parseCommandLine } from '../../src/game/engine';

const deps = createGameDeps();
const registry = createDefaultRegistry();

const PROTOTYPE_KEYS = [
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  '__defineGetter__',
  'isPrototypeOf',
];

const HOSTILE = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '"><svg/onload=alert(1)>',
  '{{7*7}}',
  '${process.env}',
  '`id`',
  '$(whoami)',
  '; rm -rf /',
  '| cat /etc/passwd',
  '../../../../etc/passwd',
  "' OR '1'='1",
  '\u0000\u0001\u001b[2J',
  '‮evil',
  'A'.repeat(5000),
];

describe('prototype-chain lookups', () => {
  it.each(PROTOTYPE_KEYS)('does not resolve %s as a hint', (key) => {
    // hints.ts indexes a plain object with player text; Object.hasOwn is what
    // keeps an inherited property from answering.
    expect(lookupCommandHint(key)).toBeNull();
  });

  it.each(PROTOTYPE_KEYS)('does not resolve %s as a command', (key) => {
    expect(registry.resolve(key)).toBeNull();
    expect(registry.byId(key)).toBeNull();
  });

  it.each(PROTOTYPE_KEYS)('does not resolve %s as a contract', (key) => {
    expect(deps.missions.byId(key)).toBeNull();
  });

  it.each(PROTOTYPE_KEYS)('does not resolve %s as an achievement', (key) => {
    expect(deps.achievements.byId(key)).toBeNull();
  });

  it('does not pollute the prototype when such a token is played', () => {
    let state = createTrainingGameState(1);
    for (const key of PROTOTYPE_KEYS) {
      for (const verb of ['start', 'buy', 'solve', 'inspect', 'download', 'connect']) {
        state = executeCommandLine(state, `${verb} ${key}`, deps).state;
      }
    }

    const probe: Record<string, unknown> = {};
    expect(probe.polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(state.activeMission).not.toBeNull();
  });
});

describe('hostile terminal input', () => {
  it.each(HOSTILE)('parses %j without throwing', (input) => {
    expect(() => parseCommandLine(input, registry)).not.toThrow();
  });

  it.each(HOSTILE)('executes %j without throwing or changing the contract', (input) => {
    const before = createTrainingGameState(2);
    const after = executeCommandLine(before, input, deps);

    expect(after.state.activeMission?.status).toBe('active');
    expect(after.state.player.credits).toBe(before.player.credits);
  });

  it('never emits a line containing raw markup it was not given as an argument', () => {
    // Markup echoed back as an argument is inert text; what must never happen
    // is the engine synthesising markup of its own.
    const state = createTrainingGameState(3);
    const result = executeCommandLine(state, 'xyzzy', deps);
    for (const line of result.outputs) {
      expect(line.text).not.toMatch(/<[a-z!/]/i);
    }
  });

  it('caps a very long line rather than processing it', () => {
    const result = parseCommandLine('A'.repeat(100000), registry);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('input-too-long');
    }
  });
});

describe('terminal output shape', () => {
  it('only ever produces the declared line kinds', () => {
    const kinds = new Set<string>();
    let state = createTrainingGameState(4);
    for (const input of [
      'help', 'scan', 'ports edge-gateway', 'analyze 443', 'inspect edge-gateway',
      'logs edge-gateway', 'wait', 'escape', 'nmap x', 'sudo rm -rf /', 'xyzzy', '',
    ]) {
      const result = executeCommandLine(state, input, deps);
      state = result.state;
      for (const line of result.outputs) {
        kinds.add(line.kind);
      }
    }

    for (const kind of kinds) {
      expect(['info', 'success', 'warning', 'error', 'system', 'command', 'output']).toContain(kind);
    }
  });

  it('produces only strings, never objects that could render as markup', () => {
    const state = createTrainingGameState(5);
    const result = executeCommandLine(state, 'help', deps);
    for (const line of result.outputs) {
      expect(typeof line.text).toBe('string');
    }
  });
});
