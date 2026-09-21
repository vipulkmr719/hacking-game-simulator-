/**
 * Mission lifecycle driven through the terminal, the way a player drives it.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createGameDeps, createTrainingGameState } from '../../src/data/bootstrap';
import { executeCommandLine } from '../../src/game/engine';
import type { GameState } from '../../src/game/engine';
import { grantMissionReward } from '../../src/game/rewards/rewards';
import { encryptedArchive, hiddenService, openPorts } from '../../src/data/missions';

const deps = createGameDeps();
let state: GameState;

function run(input: string): readonly string[] {
  const result = executeCommandLine(state, input, deps);
  state = result.state;
  return result.outputs.map((line) => line.text);
}

const text = (lines: readonly string[]) => lines.join('\n');

beforeEach(() => {
  state = createTrainingGameState();
});

describe('taking a contract', () => {
  it('lists contracts with their lock state', () => {
    const out = text(run('missions'));
    expect(out).toContain('first-connection');
    expect(out).toContain('final-operation');
    expect(out).toContain('LOCKED');
    expect(out).toContain('requires mission "first-connection"');
  });

  it('refuses a locked contract and says why', () => {
    const out = text(run('start open-ports'));
    expect(out).toContain('"open-ports" is locked.');
    expect(out).toContain('requires mission "first-connection"');
    expect(state.activeMission?.missionId).toBe('first-connection');
  });

  it('refuses a contract that does not exist', () => {
    expect(text(run('start not-a-contract'))).toContain('No such contract: not-a-contract');
  });

  it('loads a contract the player has earned', () => {
    state = {
      ...state,
      player: grantMissionReward(state.player, 'first-connection', { xp: 0, credits: 0, reputation: 0, toolIds: [], achievementIds: [] }).player,
    };
    const out = text(run('start open-ports'));
    expect(out).toContain('CONTRACT  Open Ports');
    expect(out).toContain('novabank.sim');
    expect(state.activeMission?.missionId).toBe('open-ports');
    expect(state.activeMission?.detection).toBe(0);
  });

  it('counts the attempt', () => {
    run('start first-connection');
    expect(state.player.statistics.missionsAttempted).toBe(1);
  });
});

describe('brief', () => {
  it('shows objectives and marks progress as it happens', () => {
    expect(text(run('brief'))).toContain('[ ] Sweep the target for hosts.');
    run('scan');
    expect(text(run('brief'))).toContain('[x] Sweep the target for hosts.');
  });

  it('reports what is still outstanding', () => {
    run('scan');
    expect(text(run('brief'))).toContain('1 objective(s) outstanding.');
  });

  it('says when extraction is available', () => {
    run('scan');
    run('ports acme-edge-01');
    run('analyze 443');
    expect(text(run('brief'))).toContain('All objectives met. Run "escape" to close the contract.');
  });
});

describe('objective completion through commands', () => {
  it('announces an objective as it completes', () => {
    expect(text(run('scan'))).toContain('OBJECTIVE · Sweep the target for hosts.');
  });

  it('respects ordering: the gated objective waits for its predecessor', () => {
    // identify-service is gated on map-perimeter, so a fresh runtime with the
    // service already known must not complete it.
    const fresh = createTrainingGameState();
    const seeded: GameState = {
      ...fresh,
      activeMission:
        fresh.activeMission === null
          ? null
          : {
              ...fresh.activeMission,
              discovered: { ...fresh.activeMission.discovered, serviceIds: ['acme-gateway'] },
            },
    };
    state = seeded;
    const out = text(run('status'));
    expect(out).not.toContain('OBJECTIVE · Identify the gateway service.');
  });

  it('marks the bonus objective while the run is quiet', () => {
    run('scan');
    expect(text(run('brief'))).toContain('[x] Extract with trace below 50%.');
  });

  it('loses the bonus objective when the run gets loud', () => {
    run('scan');
    const mission = state.activeMission;
    state = mission === null ? state : { ...state, activeMission: { ...mission, detection: 70 } };
    expect(text(run('status'))).toContain('OBJECTIVE LOST · Extract with trace below 50%.');
    expect(text(run('brief'))).toContain('[ ] Extract with trace below 50%.');
  });
});

describe('extraction', () => {
  it('refuses while objectives are outstanding and lists them', () => {
    const out = text(run('escape'));
    expect(out).toContain('Objectives outstanding. Extraction refused.');
    expect(out).toContain('[ ] Sweep the target for hosts.');
    expect(state.activeMission?.status).toBe('active');
  });

  it('completes the contract and pays out', () => {
    run('scan');
    run('ports acme-edge-01');
    run('analyze 443');
    const out = text(run('escape'));

    expect(out).toContain('EXTRACTED  First Connection');
    expect(out).toContain('XP          +120');
    expect(out).toContain('Credits     +250');
    expect(state.activeMission?.status).toBe('completed');
    // 120 from the contract, plus the First Contract achievement it earns.
    expect(state.player.xp).toBe(120 + 60);
    expect(state.player.achievementIds).toContain('first-contract');
    expect(state.player.completedMissionIds).toContain('first-connection');
    expect(state.player.statistics.missionsCompleted).toBe(1);
  });

  it('reports the bonus objective it met', () => {
    run('scan');
    run('ports acme-edge-01');
    run('analyze 443');
    expect(text(run('escape'))).toContain('Bonus objectives met: 1');
  });

  it('unlocks the next contract', () => {
    run('scan');
    run('ports acme-edge-01');
    run('analyze 443');
    run('escape');
    expect(text(run('missions'))).not.toContain('requires mission "first-connection"');
    expect(text(run('start open-ports'))).toContain('CONTRACT  Open Ports');
  });

  it('does not pay the same contract twice', () => {
    const finish = () => {
      run('scan');
      run('ports acme-edge-01');
      run('analyze 443');
      return text(run('escape'));
    };
    finish();
    const xpAfterFirst = state.player.xp;

    run('start first-connection');
    const second = finish();

    expect(second).toContain('Contract already paid out. No further reward.');
    expect(state.player.xp).toBe(xpAfterFirst);
  });
});

describe('mission failure', () => {
  function crankTrace() {
    const mission = state.activeMission;
    if (mission !== null) {
      state = { ...state, activeMission: { ...mission, detection: 96 } };
    }
  }

  it('fails the contract when trace reaches 100', () => {
    crankTrace();
    const out = text(run('scan'));

    expect(out).toContain('MISSION FAILED — trace reached 100%.');
    expect(state.activeMission?.status).toBe('failed');
    expect(state.activeMission?.failureReason).toBe('Trace reached 100%.');
    expect(state.player.statistics.missionsFailed).toBe(1);
  });

  it('refuses extraction after a failure', () => {
    crankTrace();
    run('scan');
    expect(text(run('escape'))).toContain('Contract is failed. Run "start first-connection" to retry.');
  });

  it('pays nothing for a failed contract', () => {
    crankTrace();
    const before = state.player.credits;
    run('scan');

    expect(state.player.completedMissionIds).toEqual([]);
    expect(state.player.credits).toBe(before);
    expect(state.player.reputation).toBe(0);
    // The contract pays nothing. The Persistent achievement is a separate
    // award for the failure itself.
    expect(state.player.xp).toBe(40);
    expect(state.player.achievementIds).toEqual(['persistent']);
  });

  it('allows a retry from a clean runtime', () => {
    crankTrace();
    run('scan');
    run('start first-connection');

    expect(state.activeMission?.status).toBe('active');
    expect(state.activeMission?.detection).toBe(0);
    expect(state.activeMission?.discovered.hostIds).toEqual([]);
  });

  it('counts the failure only once', () => {
    crankTrace();
    run('scan');
    run('status');
    run('brief');
    expect(state.player.statistics.missionsFailed).toBe(1);
  });
});

describe('abort', () => {
  it('drops the contract and leaves no session', () => {
    run('scan');
    expect(text(run('abort'))).toContain('Dropped "First Connection". Progress discarded.');
    expect(state.activeMission).toBeNull();
  });

  it('gates session-only commands once aborted', () => {
    run('abort');
    expect(text(run('scan'))).toContain('No active session. No target is loaded.');
  });
});

describe('puzzles', () => {
  beforeEach(() => {
    let player = state.player;
    for (const mission of [
      { id: 'first-connection', reward: { xp: 400, credits: 0, reputation: 0, toolIds: [], achievementIds: [] } },
      { id: openPorts.id, reward: openPorts.reward },
      { id: hiddenService.id, reward: hiddenService.reward },
    ]) {
      player = grantMissionReward(player, mission.id, mission.reward).player;
    }
    state = { ...state, player };
    run(`start ${encryptedArchive.id}`);
    run('scan');
    run('ports orion-vault-01');
    run('analyze 9443');
  });

  it('accepts the right answer', () => {
    expect(text(run('solve orion-cipher three'))).toContain('Correct. Cipher cleared.');
    expect(state.activeMission?.discovered.solvedPuzzleIds).toContain('orion-cipher');
  });

  it('is case insensitive', () => {
    expect(text(run('solve orion-cipher THREE'))).toContain('Correct.');
  });

  it('costs trace and an attempt when wrong', () => {
    const before = state.activeMission?.detection ?? 0;
    const out = text(run('solve orion-cipher wrong'));

    expect(out).toContain('Incorrect.');
    expect(out).toContain('Attempts left  3');
    expect(state.activeMission?.detection).toBeGreaterThan(before);
    expect(state.activeMission?.puzzleAttempts['orion-cipher']).toBe(1);
  });

  it('runs out of attempts', () => {
    for (let i = 0; i < 4; i += 1) {
      run('solve orion-cipher wrong');
    }
    expect(text(run('solve orion-cipher three'))).toContain('No attempts left on "orion-cipher".');
  });

  it('blocks download of an encrypted file until solved', () => {
    run('inspect orion-vault-01');
    const out = text(run('download sealed.arc'));
    expect(out).toContain('"sealed.arc" is encrypted.');
    expect(out).toContain('Run "solve orion-cipher <answer>" first.');
  });

  it('allows download once solved', () => {
    run('inspect orion-vault-01');
    run('solve orion-cipher three');
    expect(text(run('download sealed.arc'))).toContain('Retrieved.');
    expect(state.activeMission?.discovered.retrievedFileIds).toContain('orion-sealed');
  });
});
