import { canExtract, completeMission, outstandingObjectives } from '../../missions/engine';
import { resolveSession } from '../../missions/session';
import { formatTrace } from '../../detection/detection';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * Closes the contract.
 *
 * Extraction is deliberate rather than automatic: with trace rising on every
 * action, deciding when to leave is the decision the loop is built around.
 */
export const escapeCommand: CommandSpec = {
  id: 'escape',
  name: 'escape',
  aliases: ['extract'],
  summary: 'Close the contract and claim the reward.',
  usage: 'escape',
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

    const { mission, runtime } = session;

    if (runtime.status !== 'active') {
      return {
        state: context.state,
        outputs: [error(`Contract is ${runtime.status}. Run "start ${mission.id}" to retry.`)],
        events: [],
      };
    }

    if (!canExtract(mission, runtime)) {
      const outstanding = outstandingObjectives(mission, runtime);
      return {
        state: context.state,
        outputs: [
          error('Objectives outstanding. Extraction refused.'),
          ...outstanding.map((objective) => output(`  [ ] ${objective.description}`)),
        ],
        events: [],
      };
    }

    const result = completeMission(mission, runtime, context.state.player);
    const { reward } = mission;

    return {
      state: { ...context.state, activeMission: result.runtime, player: result.player },
      outputs: [
        system(`EXTRACTED  ${mission.title}`),
        output(`  ${formatTrace(runtime.detection)} at extraction`),
        ...(result.bonusObjectiveIds.length === 0
          ? []
          : [success(`Bonus objectives met: ${String(result.bonusObjectiveIds.length)}`)]),
        ...(result.rewarded
          ? [
              system('REWARD'),
              output(`  XP          +${String(reward.xp)}`),
              output(`  Credits     +${String(reward.credits)}`),
              output(`  Reputation  +${String(reward.reputation)}`),
              ...reward.toolIds.map((id) => success(`  Tool unlocked: ${id}`)),
              success(`Level ${String(result.player.level)}.`),
            ]
          : [info('Contract already paid out. No further reward.')]),
        info('Run "missions" for what is open now.'),
      ],
      events: [
        { type: 'MISSION_COMPLETED', missionId: mission.id, rewarded: result.rewarded },
      ],
    };
  },
};
