/**
 * Mission lifecycle, tested against the engine directly rather than through
 * the terminal, so a failure points at the rule and not at a command.
 */
import { describe, expect, it } from 'vitest';
import { firstConnection, multiStageOperation } from '../../data/missions';
import { createInitialPlayerState } from '../progression/progression';
import type { PlayerState } from '../progression/types';
import { EMPTY_REWARD } from '../rewards/rewards';
import {
  canExtract,
  completeMission,
  evaluateObjectives,
  failMission,
  isObjectiveComplete,
  outstandingObjectives,
  requiredObjectives,
} from './engine';
import { createMissionRuntimeState } from './types';
import type { Mission, MissionRuntimeState } from './types';

const player: PlayerState = createInitialPlayerState();

/** A deliberately tiny mission, so ordering tests are unambiguous. */
const chained: Mission = {
  ...firstConnection,
  id: 'chained',
  objectives: [
    {
      id: 'first',
      description: 'First.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'acme-edge-01' }],
    },
    {
      id: 'second',
      description: 'Second.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'first' },
        { type: 'host-scanned', hostId: 'acme-app-02' },
      ],
    },
  ],
  reward: { ...EMPTY_REWARD, xp: 100, credits: 200, reputation: 3 },
};

function withHosts(mission: Mission, hostIds: readonly string[]): MissionRuntimeState {
  const runtime = createMissionRuntimeState(mission);
  return { ...runtime, discovered: { ...runtime.discovered, hostIds } };
}

describe('mission initialization', () => {
  it('starts active with nothing discovered', () => {
    const runtime = createMissionRuntimeState(firstConnection);
    expect(runtime.missionId).toBe('first-connection');
    expect(runtime.status).toBe('active');
    expect(runtime.detection).toBe(0);
    expect(runtime.accessLevel).toBe('none');
    expect(runtime.discovered.hostIds).toEqual([]);
    expect(runtime.discovered.retrievedFileIds).toEqual([]);
    expect(runtime.puzzleAttempts).toEqual({});
    expect(runtime.failureReason).toBeNull();
  });

  it('creates one runtime entry per declared objective, all incomplete', () => {
    const runtime = createMissionRuntimeState(firstConnection);
    expect(runtime.objectives).toHaveLength(firstConnection.objectives.length);
    expect(runtime.objectives.every((entry) => !entry.complete)).toBe(true);
  });

  it('starts a fresh runtime each time, discarding prior progress', () => {
    const dirty = withHosts(firstConnection, ['acme-edge-01']);
    expect(createMissionRuntimeState(firstConnection).discovered.hostIds).toEqual([]);
    expect(dirty.discovered.hostIds).toEqual(['acme-edge-01']);
  });
});

describe('objective completion', () => {
  it('completes an objective when its conditions hold', () => {
    const result = evaluateObjectives(chained, withHosts(chained, ['acme-edge-01']), player);
    expect(isObjectiveComplete(result.runtime, 'first')).toBe(true);
    expect(result.completed.map((t) => t.objectiveId)).toEqual(['first']);
  });

  it('reports nothing when no objective changes', () => {
    const result = evaluateObjectives(chained, createMissionRuntimeState(chained), player);
    expect(result.completed).toEqual([]);
    expect(result.regressed).toEqual([]);
  });

  it('does not complete an objective that declares no conditions', () => {
    const empty: Mission = {
      ...chained,
      objectives: [{ id: 'nothing', description: 'x', optional: false, completedWhen: [] }],
    };
    const result = evaluateObjectives(empty, createMissionRuntimeState(empty), player);
    expect(isObjectiveComplete(result.runtime, 'nothing')).toBe(false);
  });

  it('requires every condition, not just one', () => {
    const result = evaluateObjectives(chained, withHosts(chained, ['acme-app-02']), player);
    expect(isObjectiveComplete(result.runtime, 'second')).toBe(false);
  });

});

describe('objective ordering', () => {
  it('holds a gated objective closed until its predecessor completes', () => {
    // The second objective's own condition is already satisfied here; only the
    // ordering gate keeps it shut.
    const result = evaluateObjectives(chained, withHosts(chained, ['acme-app-02']), player);
    expect(isObjectiveComplete(result.runtime, 'first')).toBe(false);
    expect(isObjectiveComplete(result.runtime, 'second')).toBe(false);
  });

  it('resolves a whole chain in one evaluation once the gate opens', () => {
    const result = evaluateObjectives(
      chained,
      withHosts(chained, ['acme-edge-01', 'acme-app-02']),
      player,
    );
    expect(result.completed.map((t) => t.objectiveId)).toEqual(['first', 'second']);
  });

  it('completes in declaration order, not condition order', () => {
    const reversed: Mission = { ...chained, objectives: [...chained.objectives].reverse() };
    const result = evaluateObjectives(
      reversed,
      withHosts(reversed, ['acme-edge-01', 'acme-app-02']),
      player,
    );
    // Declared second-then-first, the fixpoint loop still settles with both
    // complete and reports "first" before the objective that depends on it.
    expect(isObjectiveComplete(result.runtime, 'first')).toBe(true);
    expect(isObjectiveComplete(result.runtime, 'second')).toBe(true);
    expect(result.completed.map((t) => t.objectiveId)).toEqual(['first', 'second']);
  });

  it('gates every stage of the multi-stage contract on its predecessor', () => {
    const { objectives } = multiStageOperation;
    expect(objectives.length).toBeGreaterThan(1);

    for (const [index, objective] of objectives.entries()) {
      const previous = objectives[index - 1];
      if (previous === undefined) {
        continue;
      }
      const gates = objective.completedWhen.filter(
        (condition) =>
          condition.type === 'objective-complete' && condition.objectiveId === previous.id,
      );
      expect(gates).toHaveLength(1);
    }
  });

  it('cannot skip to the last stage of the multi-stage contract', () => {
    // Hand it everything the final stage asks for except the chain before it.
    const runtime = createMissionRuntimeState(multiStageOperation);
    const cheating = {
      ...runtime,
      discovered: { ...runtime.discovered, retrievedFileIds: ['sable-rotation'] },
    };
    const result = evaluateObjectives(multiStageOperation, cheating, player);
    expect(isObjectiveComplete(result.runtime, 'stage-5-retrieve')).toBe(false);
    expect(canExtract(multiStageOperation, result.runtime)).toBe(false);
  });
});

describe('objective regression', () => {
  const quiet: Mission = {
    ...chained,
    objectives: [
      {
        id: 'stay-quiet',
        description: 'Stay below 50%.',
        optional: false,
        completedWhen: [{ type: 'detection-below', value: 50 }],
      },
    ],
  };

  it('completes while trace is low', () => {
    const result = evaluateObjectives(quiet, createMissionRuntimeState(quiet), player);
    expect(isObjectiveComplete(result.runtime, 'stay-quiet')).toBe(true);
  });

  it('loses the objective when trace rises past the threshold', () => {
    const started = evaluateObjectives(quiet, createMissionRuntimeState(quiet), player);
    const loud = { ...started.runtime, detection: 60 };
    const result = evaluateObjectives(quiet, loud, player);

    expect(isObjectiveComplete(result.runtime, 'stay-quiet')).toBe(false);
    expect(result.regressed.map((t) => t.objectiveId)).toEqual(['stay-quiet']);
  });

  it('blocks extraction once a required objective is lost', () => {
    const loud = evaluateObjectives(quiet, { ...createMissionRuntimeState(quiet), detection: 60 }, player);
    expect(canExtract(quiet, loud.runtime)).toBe(false);
  });
});

describe('mission completion', () => {
  it('refuses extraction while a required objective is outstanding', () => {
    const runtime = evaluateObjectives(chained, withHosts(chained, ['acme-edge-01']), player).runtime;
    expect(canExtract(chained, runtime)).toBe(false);
    expect(outstandingObjectives(chained, runtime).map((o) => o.id)).toEqual(['second']);
  });

  it('allows extraction once every required objective is met', () => {
    const runtime = evaluateObjectives(
      chained,
      withHosts(chained, ['acme-edge-01', 'acme-app-02']),
      player,
    ).runtime;
    expect(canExtract(chained, runtime)).toBe(true);
    expect(outstandingObjectives(chained, runtime)).toEqual([]);
  });

  it('ignores optional objectives when deciding extraction', () => {
    expect(requiredObjectives(firstConnection).map((o) => o.id)).toEqual([
      'map-perimeter',
      'identify-service',
    ]);
    const runtime = evaluateObjectives(
      firstConnection,
      withHosts(firstConnection, ['acme-edge-01']),
      player,
    ).runtime;
    const withService = {
      ...runtime,
      discovered: { ...runtime.discovered, serviceIds: ['acme-gateway'] },
    };
    expect(canExtract(firstConnection, evaluateObjectives(firstConnection, withService, player).runtime)).toBe(
      true,
    );
  });

  it('marks the mission completed', () => {
    const runtime = evaluateObjectives(
      chained,
      withHosts(chained, ['acme-edge-01', 'acme-app-02']),
      player,
    ).runtime;
    expect(completeMission(chained, runtime, player).runtime.status).toBe('completed');
  });

  it('records which optional objectives were met', () => {
    const runtime = evaluateObjectives(
      firstConnection,
      withHosts(firstConnection, ['acme-edge-01']),
      player,
    ).runtime;
    const result = completeMission(firstConnection, runtime, player);
    expect(result.bonusObjectiveIds).toEqual(['stay-quiet']);
  });
});

describe('mission failure', () => {
  it('marks the mission failed and records the reason', () => {
    const result = failMission(createMissionRuntimeState(chained), player, 'Trace reached 100%.');
    expect(result.runtime.status).toBe('failed');
    expect(result.runtime.failureReason).toBe('Trace reached 100%.');
  });

  it('counts the failure against the player', () => {
    const result = failMission(createMissionRuntimeState(chained), player, 'x');
    expect(result.player.statistics.missionsFailed).toBe(1);
  });

  it('does not award anything on failure', () => {
    const result = failMission(createMissionRuntimeState(chained), player, 'x');
    expect(result.player.xp).toBe(player.xp);
    expect(result.player.credits).toBe(player.credits);
    expect(result.player.completedMissionIds).toEqual([]);
  });
});

describe('rewards', () => {
  const finished = () =>
    evaluateObjectives(chained, withHosts(chained, ['acme-edge-01', 'acme-app-02']), player).runtime;

  it('pays out on first completion', () => {
    const result = completeMission(chained, finished(), player);
    expect(result.rewarded).toBe(true);
    expect(result.player.xp).toBe(100);
    expect(result.player.credits).toBe(player.credits + 200);
    expect(result.player.reputation).toBe(3);
    expect(result.player.completedMissionIds).toContain('chained');
  });

  it('refuses to pay the same contract twice', () => {
    const first = completeMission(chained, finished(), player);
    const second = completeMission(chained, finished(), first.player);

    expect(second.rewarded).toBe(false);
    expect(second.player.xp).toBe(first.player.xp);
    expect(second.player.credits).toBe(first.player.credits);
  });

  it('still marks the replay completed even when it does not pay', () => {
    const first = completeMission(chained, finished(), player);
    const second = completeMission(chained, finished(), first.player);
    expect(second.runtime.status).toBe('completed');
  });

  it('unlocks the tools a mission grants', () => {
    const withTool: Mission = {
      ...chained,
      id: 'grants-tool',
      reward: { ...EMPTY_REWARD, toolIds: ['decoder'] },
    };
    const runtime = evaluateObjectives(
      withTool,
      withHosts(withTool, ['acme-edge-01', 'acme-app-02']),
      player,
    ).runtime;
    expect(completeMission(withTool, runtime, player).player.unlockedToolIds).toContain('decoder');
  });
});
