/**
 * Game-integrity invariants, exercised by fuzzing.
 *
 * Written during the pre-release audit. Individual behaviours are covered by
 * their own suites; this asserts the properties that must hold no matter what
 * a player types — that nothing throws, no figure goes negative or non-finite,
 * detection stays inside its range, and a reward cannot be claimed twice.
 */
import { describe, expect, it } from 'vitest';
import { createGameDeps, createTrainingGameState } from '../../src/data/bootstrap';
import { MISSIONS } from '../../src/data/missions';
import { TOOLS } from '../../src/data/tools';
import { executeCommandLine } from '../../src/game/engine';
import { createRng, nextInt } from '../../src/game/rng';
import { levelForXp } from '../../src/game/progression/progression';
import type { GameState } from '../../src/game/engine';

const deps = createGameDeps();

const VOCAB = [
  'help', 'clear', 'status', 'inventory', 'missions', 'brief', 'abort', 'retry',
  'scan', 'ports', 'analyze', 'inspect', 'logs', 'connect', 'solve', 'download',
  'wait', 'escape', 'buy', 'start',
  'edge-gateway', 'acme-edge-01', '192.0.2.10', '443', '22', 'welcome.txt',
  'orion-cipher', 'three', 'advanced-scanner', 'first-connection', 'final-operation',
  '__proto__', 'constructor', 'prototype', 'toString', 'valueOf',
  '<script>', '${x}', '`id`', ';rm -rf /', '../../etc/passwd', 'javascript:alert(1)',
  '-1', '0', 'NaN', 'Infinity', '1e999', '999999999999999999999',
  '\u0000', '\u001b[2J', '😀', 'ÅÄÖ', "'", '"', '\\', '%s', '%n',
  'a'.repeat(300), '', ' ', '\t',
];

function violations(state: GameState): string[] {
  const problems: string[] = [];
  const p = state.player;

  if (!Number.isFinite(p.xp) || p.xp < 0 || !Number.isInteger(p.xp)) problems.push(`xp=${String(p.xp)}`);
  if (!Number.isFinite(p.credits) || p.credits < 0 || !Number.isInteger(p.credits)) problems.push(`credits=${String(p.credits)}`);
  if (!Number.isFinite(p.reputation) || p.reputation < 0) problems.push(`rep=${String(p.reputation)}`);
  if (p.level !== levelForXp(p.xp)) problems.push(`level=${String(p.level)} but xp=${String(p.xp)} implies ${String(levelForXp(p.xp))}`);
  if (p.level < 1) problems.push(`level=${String(p.level)}`);

  for (const [k, v] of Object.entries(p.statistics)) {
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) problems.push(`stat ${k}=${String(v)}`);
  }

  if (new Set(p.completedMissionIds).size !== p.completedMissionIds.length) problems.push('duplicate completedMissionIds');
  if (new Set(p.unlockedToolIds).size !== p.unlockedToolIds.length) problems.push('duplicate unlockedToolIds');
  if (new Set(p.achievementIds).size !== p.achievementIds.length) problems.push('duplicate achievementIds');

  const m = state.activeMission;
  if (m !== null) {
    if (!Number.isFinite(m.detection) || m.detection < 0 || m.detection > 100 || !Number.isInteger(m.detection)) {
      problems.push(`detection=${String(m.detection)}`);
    }
    if (m.stealthActionsUsed < 0 || !Number.isInteger(m.stealthActionsUsed)) problems.push(`stealth=${String(m.stealthActionsUsed)}`);
    for (const [k, v] of Object.entries(m.puzzleAttempts)) {
      if (!Number.isInteger(v) || v < 0) problems.push(`puzzleAttempts ${k}=${String(v)}`);
    }
  }
  return problems;
}

describe('engine invariants', () => {
  it('survives random command sequences with every invariant intact', () => {
    let rng = createRng(20260921);
    const failures: string[] = [];

    for (let run = 0; run < 400; run += 1) {
      let state = createTrainingGameState(run);
      for (let step = 0; step < 40; step += 1) {
        const pick = nextInt(rng, 0, VOCAB.length - 1);
        rng = pick.next;
        const argPick = nextInt(rng, 0, VOCAB.length - 1);
        rng = argPick.next;
        const joinPick = nextInt(rng, 0, 2);
        rng = joinPick.next;

        const head = VOCAB[pick.value] ?? '';
        const arg = VOCAB[argPick.value] ?? '';
        const input = joinPick.value === 0 ? head : `${head} ${arg}`;

        try {
          state = executeCommandLine(state, input, deps).state;
        } catch (error) {
          failures.push(`THREW on ${JSON.stringify(input)}: ${String(error)}`);
          break;
        }

        const bad = violations(state);
        if (bad.length > 0) {
          failures.push(`after ${JSON.stringify(input)}: ${bad.join(', ')}`);
          break;
        }
      }
    }

    expect(failures.slice(0, 10)).toEqual([]);
  });

  it('cannot pay a contract twice however it is replayed', () => {
    let state = createTrainingGameState(7);
    const script = ['scan', 'ports acme-edge-01', 'analyze 443', 'escape'];
    let xpAfterFirst = 0;

    for (let round = 0; round < 6; round += 1) {
      for (const input of [...script, 'retry']) {
        state = executeCommandLine(state, input, deps).state;
      }
      if (round === 0) xpAfterFirst = state.player.xp;
    }

    expect(state.player.xp).toBe(xpAfterFirst);
    expect(state.player.completedMissionIds.filter((id) => id === 'first-connection')).toHaveLength(1);
  });

  it('cannot buy a tool twice or overdraw', () => {
    let state = createTrainingGameState(3);
    state = { ...state, player: { ...state.player, credits: 800, level: 9 } };
    for (let i = 0; i < 10; i += 1) {
      state = executeCommandLine(state, 'buy advanced-scanner', deps).state;
    }
    expect(state.player.credits).toBe(50);
    expect(state.player.unlockedToolIds.filter((id) => id === 'advanced-scanner')).toHaveLength(1);

    for (const tool of TOOLS) {
      state = executeCommandLine(state, `buy ${tool.id}`, deps).state;
    }
    expect(state.player.credits).toBeGreaterThanOrEqual(0);
  });

  it('every mission id referenced anywhere exists', () => {
    const ids = new Set(MISSIONS.map((m) => m.id));
    for (const mission of MISSIONS) {
      for (const required of mission.unlock.requiredMissionIds) {
        expect(ids.has(required), `${mission.id} requires missing ${required}`).toBe(true);
      }
    }
  });
});
