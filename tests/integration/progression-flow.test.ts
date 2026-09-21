/**
 * Progression driven through the terminal: earning, spending, unlocking.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createGameDeps, createTrainingGameState } from '../../src/data/bootstrap';
import { TOOLS } from '../../src/data/tools';
import { executeCommandLine } from '../../src/game/engine';
import type { GameState } from '../../src/game/engine';
import { xpRequiredForLevel } from '../../src/game/progression/progression';

const deps = createGameDeps();
let state: GameState;

function run(input: string): readonly string[] {
  const result = executeCommandLine(state, input, deps);
  state = result.state;
  return result.outputs.map((line) => line.text);
}

const text = (lines: readonly string[]) => lines.join('\n');

function giveCredits(amount: number) {
  state = { ...state, player: { ...state.player, credits: amount } };
}

function giveLevel(level: number) {
  const xp = xpRequiredForLevel(level);
  state = { ...state, player: { ...state.player, xp, level } };
}

beforeEach(() => {
  state = createTrainingGameState();
});

describe('status readout', () => {
  it('shows the opening figures', () => {
    const out = text(run('status'));
    expect(out).toContain('Level        1');
    expect(out).toContain('Credits      500');
    expect(out).toContain('Reputation   0');
    expect(out).toContain('Achievements 0');
  });

  it('shows xp against the current level band, not a flat number', () => {
    giveLevel(3);
    const out = text(run('status'));
    // Level 3 costs 400 XP to leave.
    expect(out).toContain('/400');
  });
});

describe('buying tools', () => {
  it('refuses a tool that does not exist', () => {
    expect(text(run('buy nonexistent'))).toContain('No such tool: nonexistent');
  });

  it('refuses a tool already owned', () => {
    expect(text(run('buy basic-scanner'))).toContain('You already own Basic Scanner.');
  });

  it('refuses on level and says which level', () => {
    // Reads the requirement from the catalog: this asserts the gate and the
    // message, not a balance number that is meant to be tuned.
    const stealth = TOOLS.find((tool) => tool.id === 'stealth-module')!;
    expect(stealth.requiredLevel).toBeGreaterThan(1);

    giveCredits(99999);
    const out = text(run('buy stealth-module'));
    expect(out).toContain(`Stealth Module requires level ${String(stealth.requiredLevel)}.`);
    expect(out).toContain('You are level 1.');
  });

  it('refuses on credits and says the price and the balance', () => {
    giveLevel(9);
    giveCredits(100);
    const out = text(run('buy advanced-scanner'));
    expect(out).toContain('Advanced Scanner costs 750 CR.');
    expect(out).toContain('You hold 100 CR.');
  });

  it('does not charge for a refused purchase', () => {
    giveCredits(100);
    run('buy advanced-scanner');
    expect(state.player.credits).toBe(100);
    expect(state.player.unlockedToolIds).not.toContain('advanced-scanner');
  });

  it('buys a tool the player can afford', () => {
    giveLevel(3);
    giveCredits(1000);
    const out = text(run('buy advanced-scanner'));

    expect(out).toContain('ACQUIRED  Advanced Scanner');
    expect(out).toContain('Paid       750 CR');
    expect(out).toContain('Remaining  250 CR');
    expect(state.player.credits).toBe(250);
    expect(state.player.unlockedToolIds).toContain('advanced-scanner');
  });

  it('records the purchase in statistics', () => {
    giveLevel(3);
    giveCredits(1000);
    run('buy advanced-scanner');
    expect(state.player.statistics.toolsPurchased).toBe(1);
    expect(state.player.statistics.creditsSpent).toBe(750);
  });

  it('takes the id, and inventory shows the id to type', () => {
    giveLevel(3);
    giveCredits(1000);
    expect(text(run('inventory'))).toContain('advanced-scanner');
    expect(text(run('buy advanced-scanner'))).toContain('ACQUIRED');
  });

  it('shows the new tool in inventory', () => {
    giveLevel(3);
    giveCredits(1000);
    run('buy advanced-scanner');
    const out = text(run('inventory'));
    expect(out).toContain('INVENTORY  2/6');
    expect(out).toContain('Advanced Scanner');
  });

  it('lets a player buy out the whole catalog', () => {
    giveLevel(10);
    giveCredits(20000);
    for (const tool of TOOLS) {
      run(`buy ${tool.id}`);
    }
    expect(state.player.unlockedToolIds).toHaveLength(TOOLS.length);
    expect(text(run('inventory'))).toContain('INVENTORY  6/6');
  });
});

describe('achievements through play', () => {
  it('announces an achievement as it is earned', () => {
    run('scan');
    run('ports acme-edge-01');
    run('analyze 443');
    const out = text(run('escape'));
    expect(out).toContain('ACHIEVEMENT · First Contract (+60 XP)');
    expect(state.player.achievementIds).toContain('first-contract');
  });

  it('pays achievement xp on top of the contract reward', () => {
    run('scan');
    run('ports acme-edge-01');
    run('analyze 443');
    run('escape');
    expect(state.player.xp).toBe(120 + 60);
  });

  it('earns the tool achievement by buying', () => {
    giveLevel(10);
    giveCredits(20000);
    run('buy advanced-scanner');
    run('buy decoder');
    const out = text(run('buy forensic-kit'));
    expect(out).toContain('ACHIEVEMENT · Well Equipped');
    expect(state.player.achievementIds).toContain('well-equipped');
  });

  it('earns the credit achievement by holding credits', () => {
    giveCredits(3000);
    expect(text(run('status'))).toContain('ACHIEVEMENT · Solvent');
  });

  it('earns the failure achievement by losing a contract', () => {
    const mission = state.activeMission;
    state = mission === null ? state : { ...state, activeMission: { ...mission, detection: 99 } };
    const out = text(run('scan'));
    expect(out).toContain('MISSION FAILED');
    expect(out).toContain('ACHIEVEMENT · Persistent');
  });

  it('never awards the same achievement twice', () => {
    giveCredits(3000);
    run('status');
    const xpAfter = state.player.xp;
    run('status');
    run('status');
    expect(state.player.xp).toBe(xpAfter);
    expect(state.player.achievementIds.filter((id) => id === 'solvent')).toHaveLength(1);
  });
});

describe('levelling', () => {
  it('announces a level as it is reached', () => {
    // One XP short of level 2.
    state = {
      ...state,
      player: { ...state.player, xp: xpRequiredForLevel(2) - 120, level: 1 },
    };
    run('scan');
    run('ports acme-edge-01');
    run('analyze 443');
    const out = text(run('escape'));
    expect(out).toContain('LEVEL 2');
    expect(state.player.level).toBeGreaterThanOrEqual(2);
  });

  it('keeps level and xp in agreement after every command', () => {
    giveCredits(3000);
    for (const input of ['status', 'scan', 'ports acme-edge-01', 'analyze 443', 'escape']) {
      run(input);
      const { xp, level } = state.player;
      expect(level, `level disagreed with ${String(xp)} xp`).toBe(
        [...Array(30).keys()]
          .map((i) => i + 1)
          .filter((candidate) => xpRequiredForLevel(candidate) <= xp)
          .at(-1),
      );
    }
  });
});
