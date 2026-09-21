import { resolveSession } from '../../missions/session';
import { error, info, warning } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * Leaves the current contract without completing it.
 *
 * Present so a failed or unwanted mission is never a dead end — the UI rules
 * forbid a state the player cannot get out of.
 */
export const abortCommand: CommandSpec = {
  id: 'abort',
  name: 'abort',
  aliases: ['disconnect'],
  summary: 'Drop the current contract without completing it.',
  usage: 'abort',
  args: [],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    if (session === null) {
      return { state: context.state, outputs: [error('No active contract.')], events: [] };
    }

    return {
      state: { ...context.state, activeMission: null },
      outputs: [
        warning(`Dropped "${session.mission.title}". Progress discarded.`),
        info('Run "missions" to pick another.'),
      ],
      events: [],
    };
  },
};
