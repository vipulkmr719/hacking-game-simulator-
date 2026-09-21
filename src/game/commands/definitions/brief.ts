import { selectActiveMission } from '../../missions/selectors';
import { formatTrace } from '../../detection/detection';
import { error, info, output, success, system, warning } from '../../terminal/types';
import type { CommandSpec } from '../types';

export const briefCommand: CommandSpec = {
  id: 'brief',
  name: 'brief',
  aliases: ['objectives'],
  summary: 'Show the current contract and objective progress.',
  usage: 'brief',
  args: [],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const view = selectActiveMission(context.state, context.deps);
    if (view === null) {
      return { state: context.state, outputs: [error('No active contract.')], events: [] };
    }

    return {
      state: context.state,
      outputs: [
        system(`BRIEF  ${view.title}`),
        output(`  Client     ${view.organization}`),
        output(`  Status     ${view.status}`),
        output(`  Access     ${view.accessLevel}`),
        output(`  ${formatTrace(view.detection)}`),
        output(''),
        output(`  ${view.briefing}`),
        system('OBJECTIVES'),
        ...view.objectives.map((objective) => {
          const mark = objective.complete ? '[x]' : '[ ]';
          const tag = objective.optional ? ' (bonus)' : '';
          return output(`  ${mark} ${objective.description}${tag}`);
        }),
        ...(view.status === 'failed'
          ? [warning(`FAILED — ${view.failureReason ?? 'unknown reason'}`), info('Run "start" again to retry.')]
          : view.readyToExtract
            ? [success('All objectives met. Run "escape" to close the contract.')]
            : [info(`${String(view.outstandingCount)} objective(s) outstanding.`)]),
      ],
      events: [],
    };
  },
};
