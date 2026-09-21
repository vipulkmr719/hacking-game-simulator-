import { beginMission } from '../../missions/engine';
import { resolveSession } from '../../missions/session';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * Restarts the current contract from a clean runtime.
 *
 * A failed contract must have an obvious way out or the player is stuck
 * looking at a dead screen. `start <id>` already did this, but only if you
 * remembered the id — the point of this command is that recovery does not
 * depend on remembering anything.
 */
export const retryCommand: CommandSpec = {
  id: 'retry',
  name: 'retry',
  aliases: ['restart'],
  summary: 'Run the current contract again from the beginning.',
  usage: 'retry',
  args: [],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    if (session === null) {
      return {
        state: context.state,
        outputs: [error('No contract to retry.'), info('Run "missions" to take one.')],
        events: [],
      };
    }

    const { mission, runtime } = session;
    const wasFailed = runtime.status === 'failed';

    return {
      state: {
        ...context.state,
        activeMission: beginMission(mission, context.state.player),
        player: {
          ...context.state.player,
          statistics: {
            ...context.state.player.statistics,
            missionsAttempted: context.state.player.statistics.missionsAttempted + 1,
          },
        },
      },
      outputs: [
        system(`RESTARTED  ${mission.title}`),
        output(`  Target  ${mission.target.domain}`),
        output('  Trace   0%  SAFE'),
        ...(wasFailed
          ? [success('Clean slate. Security has lost you again.')]
          : [info('Progress discarded.')]),
      ],
      events: [{ type: 'MISSION_STARTED', missionId: mission.id }],
    };
  },
};
