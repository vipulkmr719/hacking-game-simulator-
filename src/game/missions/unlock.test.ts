import { describe, expect, it } from 'vitest';
import { MISSIONS, firstConnection, finalOperation, openPorts } from '../../data/missions';
import { createInitialPlayerState } from '../progression/progression';
import { grantMissionReward } from '../rewards/rewards';
import type { PlayerState } from '../progression/types';
import { evaluateAvailability, isUnlocked } from './unlock';

const fresh = createInitialPlayerState();

function playerWith(overrides: Partial<PlayerState>): PlayerState {
  return { ...fresh, ...overrides };
}

describe('prerequisites', () => {
  it('opens the first contract to a brand new operator', () => {
    const availability = evaluateAvailability(firstConnection, fresh);
    expect(availability.status).toBe('available');
    expect(availability.blockers).toEqual([]);
  });

  it('locks a contract whose prior mission is unfinished', () => {
    const availability = evaluateAvailability(openPorts, fresh);
    expect(availability.status).toBe('locked');
    expect(availability.blockers).toEqual(['requires mission "first-connection"']);
  });

  it('opens it once the prior mission is complete', () => {
    const player = playerWith({ completedMissionIds: ['first-connection'] });
    expect(evaluateAvailability(openPorts, player).status).toBe('available');
  });

  it('locks on level and says which level', () => {
    const player = playerWith({
      completedMissionIds: ['multi-stage-operation'],
      unlockedToolIds: ['analysis-toolkit'],
      level: 3,
    });
    const availability = evaluateAvailability(finalOperation, player);
    expect(availability.status).toBe('locked');
    expect(availability.blockers).toContain('requires level 8');
  });

  it('locks on a missing tool and names it', () => {
    const player = playerWith({
      level: 9,
      completedMissionIds: ['multi-stage-operation'],
      unlockedToolIds: ['basic-scanner'],
    });
    expect(evaluateAvailability(finalOperation, player).blockers).toContain(
      'requires tool "analysis-toolkit"',
    );
  });

  it('reports every blocker at once rather than one at a time', () => {
    const availability = evaluateAvailability(finalOperation, fresh);
    expect(availability.blockers).toHaveLength(3);
  });

  it('marks a finished contract completed rather than available', () => {
    const player = playerWith({ completedMissionIds: ['first-connection'] });
    expect(evaluateAvailability(firstConnection, player).status).toBe('completed');
  });

  it('treats a completed contract as still unlocked, so it can be replayed', () => {
    const player = playerWith({ completedMissionIds: ['first-connection'] });
    expect(isUnlocked(firstConnection, player)).toBe(true);
  });

  it('leaves exactly one contract open at the start of the campaign', () => {
    const open = MISSIONS.filter((mission) => isUnlocked(mission, fresh));
    expect(open.map((mission) => mission.id)).toEqual(['first-connection']);
  });

  it('forms an unbroken chain on the rewards it actually pays', () => {
    // Walks the campaign using the real reward path, so this fails if any
    // contract demands a level or tool the ones before it never grant.
    let player = fresh;

    for (const mission of MISSIONS) {
      const availability = evaluateAvailability(mission, player);
      expect({
        id: mission.id,
        status: availability.status,
        blockers: availability.blockers,
      }).toEqual({ id: mission.id, status: 'available', blockers: [] });

      const grant = grantMissionReward(player, mission.id, mission.reward);
      expect(grant.granted).toBe(true);
      player = grant.player;
    }

    expect(player.completedMissionIds).toHaveLength(MISSIONS.length);
    expect(player.level).toBeGreaterThanOrEqual(finalOperation.unlock.minimumLevel);
  });
});
