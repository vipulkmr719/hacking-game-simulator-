/**
 * Every shipped contract is winnable.
 *
 * Rather than a hand-written script per mission, a generic driver plays each
 * one through the real terminal: it reads the objectives to work out what the
 * contract actually asks for, then issues the commands a competent player
 * would. If a mission gates a file behind access it never grants, hides a
 * puzzle answer nowhere, or costs more trace than the ceiling allows, the
 * mission fails here rather than in front of a player.
 */
import { describe, expect, it } from 'vitest';
import { createGameDeps } from '../../src/data/bootstrap';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { MISSIONS } from '../../src/data/missions';
import { executeCommandLine } from '../../src/game/engine';
import { createInitialGameState } from '../../src/game/state/initial';
import type { GameState } from '../../src/game/engine';
import type { Mission } from '../../src/game/missions/types';
import { grantMissionReward } from '../../src/game/rewards/rewards';

const deps = createGameDeps();

interface Run {
  state: GameState;
  transcript: string[];
}

function send(run: Run, input: string): Run {
  const result = executeCommandLine(run.state, input, deps);
  return {
    state: result.state,
    transcript: [...run.transcript, `> ${input}`, ...result.outputs.map((line) => line.text)],
  };
}

/** What the mission's objectives actually demand, read off the condition data. */
function demands(mission: Mission) {
  const conditions = mission.objectives.flatMap((objective) => objective.completedWhen);
  return {
    files: conditions.flatMap((c) => (c.type === 'file-retrieved' ? [c.fileId] : [])),
    puzzles: conditions.flatMap((c) => (c.type === 'puzzle-solved' ? [c.puzzleId] : [])),
    needsAccess: conditions.some((c) => c.type === 'access-level-at-least'),
  };
}

/**
 * A player who has finished everything before this contract, and bought the
 * tools it requires.
 *
 * Tools are purchase-only, so the equipment a contract demands has to come out
 * of what the earlier ones paid. Buying goes through the real `buy` command,
 * which means this also proves the economy is solvable: if the campaign ever
 * asks for a tool the player cannot afford by then, the contract simply will
 * not start and the suite fails.
 */
function playerAt(index: number): GameState {
  let state = createInitialGameState(1234);

  for (const mission of MISSIONS.slice(0, index)) {
    const grant = grantMissionReward(state.player, mission.id, mission.reward);
    state = { ...state, player: grant.player };
  }

  // Equipment accumulates: a player who bought the Decoder for contract four
  // still owns it at contract nine.
  for (const mission of MISSIONS.slice(0, index + 1)) {
    for (const toolId of mission.unlock.requiredToolIds) {
      if (!state.player.unlockedToolIds.includes(toolId)) {
        state = executeCommandLine(state, `buy ${toolId}`, deps).state;
      }
    }
  }

  return state;
}

function play(mission: Mission, index: number): Run {
  const want = demands(mission);
  let run: Run = { state: playerAt(index), transcript: [] };

  run = send(run, `start ${mission.id}`);
  run = send(run, 'scan');

  for (const host of mission.target.hosts) {
    run = send(run, `ports ${host.id}`);
  }

  // Only ports that actually expose something are worth the trace.
  for (const host of mission.target.hosts) {
    for (const port of host.ports) {
      if (port.serviceId !== null) {
        run = send(run, `analyze ${port.id}`);
      }
    }
  }

  if (want.needsAccess) {
    for (const host of mission.target.hosts) {
      if (host.vulnerabilities.length > 0) {
        run = send(run, `connect ${host.id}`);
      }
    }
  }

  // Inspecting a host is what lists its files, so only visit hosts holding one
  // the contract asks for.
  for (const host of mission.target.hosts) {
    if (host.files.some((file) => want.files.includes(file.id))) {
      run = send(run, `inspect ${host.id}`);
    }
  }

  for (const puzzleId of want.puzzles) {
    const puzzle = mission.puzzles.find((candidate) => candidate.id === puzzleId);
    if (puzzle !== undefined) {
      run = send(run, `solve ${puzzle.id} ${puzzle.solution}`);
    }
  }

  for (const fileId of want.files) {
    run = send(run, `download ${fileId}`);
  }

  return send(run, 'escape');
}

describe('campaign', () => {
  it('ships exactly ten contracts', () => {
    expect(MISSIONS).toHaveLength(10);
  });

  it('gives every contract a unique id', () => {
    const ids = MISSIONS.map((mission) => mission.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(MISSIONS.map((mission, index) => ({ mission, index, id: mission.id })))(
    '$id is winnable',
    ({ mission, index }) => {
      const run = play(mission, index);
      const runtime = run.state.activeMission;

      expect(
        runtime?.status,
        `"${mission.id}" did not complete. Transcript:\n${run.transcript.join('\n')}`,
      ).toBe('completed');
      expect(run.state.player.completedMissionIds).toContain(mission.id);
    },
  );

  it.each(MISSIONS.map((mission, index) => ({ mission, index, id: mission.id })))(
    '$id completes every required objective',
    ({ mission, index }) => {
      const run = play(mission, index);
      const runtime = run.state.activeMission;
      const incomplete = mission.objectives
        .filter((objective) => !objective.optional)
        .filter(
          (objective) =>
            !(runtime?.objectives ?? []).some(
              (entry) => entry.objectiveId === objective.id && entry.complete,
            ),
        )
        .map((objective) => objective.id);

      expect(incomplete).toEqual([]);
    },
  );

  it.each(MISSIONS.map((mission, index) => ({ mission, index, id: mission.id })))(
    '$id pays its reward once',
    ({ mission, index }) => {
      const run = play(mission, index);
      const before = playerAt(index).player;

      // XP is the contract's reward plus whatever achievements the run earned,
      // and nothing else.
      const earned = run.state.player.achievementIds.filter(
        (id) => !before.achievementIds.includes(id),
      );
      const achievementXp = earned.reduce(
        (total, id) => total + (ACHIEVEMENTS.find((a) => a.id === id)?.xp ?? 0),
        0,
      );

      expect(run.state.player.xp).toBe(before.xp + mission.reward.xp + achievementXp);
      expect(run.state.player.credits).toBe(before.credits + mission.reward.credits);
      expect(run.state.player.reputation).toBe(before.reputation + mission.reward.reputation);
      for (const toolId of mission.reward.toolIds) {
        expect(run.state.player.unlockedToolIds).toContain(toolId);
      }
    },
  );

  it('awards the contract achievements as their contracts close', () => {
    for (const [index, mission] of MISSIONS.entries()) {
      const expected = ACHIEVEMENTS.filter(
        (achievement) =>
          achievement.trigger.type === 'mission-completed' &&
          achievement.trigger.missionId === mission.id,
      ).map((achievement) => achievement.id);

      if (expected.length === 0) {
        continue;
      }

      const run = play(mission, index);
      for (const id of expected) {
        expect(run.state.player.achievementIds, `${mission.id} should award ${id}`).toContain(id);
      }
    }
  });

  it('is affordable: every required tool can be bought when it is needed', () => {
    // Walks the campaign paying for equipment out of earnings, asserting the
    // player is never short at the moment a contract demands a tool.
    let state = createInitialGameState(99);

    for (const mission of MISSIONS) {
      for (const toolId of mission.unlock.requiredToolIds) {
        if (!state.player.unlockedToolIds.includes(toolId)) {
          const before = state.player.credits;
          state = executeCommandLine(state, `buy ${toolId}`, deps).state;
          expect(
            state.player.unlockedToolIds,
            `could not afford ${toolId} for ${mission.id}: held ${String(before)} CR at level ${String(state.player.level)}`,
          ).toContain(toolId);
        }
      }

      expect(state.player.credits).toBeGreaterThanOrEqual(0);

      const grant = grantMissionReward(state.player, mission.id, mission.reward);
      expect(grant.granted, `${mission.id} did not pay`).toBe(true);
      state = { ...state, player: grant.player };
    }

    // Everything the campaign requires is owned by the end of it.
    for (const mission of MISSIONS) {
      for (const toolId of mission.unlock.requiredToolIds) {
        expect(state.player.unlockedToolIds).toContain(toolId);
      }
    }
  });

  it('no longer hands any tool over as a contract reward', () => {
    for (const mission of MISSIONS) {
      expect(mission.reward.toolIds, `${mission.id} grants a tool`).toEqual([]);
    }
  });

  it('keeps the whole campaign inside the trace ceiling', () => {
    for (const [index, mission] of MISSIONS.entries()) {
      const run = play(mission, index);
      expect(run.state.activeMission?.detection, `${mission.id} trace`).toBeLessThan(100);
    }
  });
});
