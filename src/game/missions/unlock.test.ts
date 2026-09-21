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

    // One per unmet requirement: the level, the prior contract, and each tool.
    expect(availability.blockers).toHaveLength(
      1 + finalOperation.unlock.requiredMissionIds.length + finalOperation.unlock.requiredToolIds.length,
    );
    expect(availability.blockers).toContain('requires level 8');
    for (const toolId of finalOperation.unlock.requiredToolIds) {
      expect(availability.blockers).toContain(`requires tool "${toolId}"`);
    }
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

  it('forms an unbroken chain on the levels the rewards actually pay', () => {
    /*
     * Walks the campaign on the real reward path, equipping whatever each
     * contract demands. Tools are bought rather than granted now, and whether
     * they are affordable at the right moment is proven by the campaign
     * suite; what this checks is the other half — that no contract asks for a
     * level the contracts before it never reach.
     */
    let player = fresh;

    for (const mission of MISSIONS) {
      player = {
        ...player,
        unlockedToolIds: [
          ...new Set([...player.unlockedToolIds, ...mission.unlock.requiredToolIds]),
        ],
      };

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
