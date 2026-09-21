import { selectMissionList } from '../../missions/selectors';
import { formatTable } from '../../terminal/format';
import { info, output, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

const STATUS_LABEL = {
  available: 'OPEN',
  locked: 'LOCKED',
  completed: 'DONE',
} as const;

export const missionsCommand: CommandSpec = {
  id: 'missions',
  name: 'missions',
  aliases: ['contracts'],
  summary: 'List contracts and why any are locked.',
  usage: 'missions',
  args: [],
  requiresActiveMission: false,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const entries = selectMissionList(context.state, context.deps);

    const rows = formatTable(
      entries.map((entry) => [
        entry.isActive ? '>' : ' ',
        entry.id,
        entry.title,
        entry.difficulty,
        STATUS_LABEL[entry.status],
      ]),
    );

    const blockerLines = entries
      .filter((entry) => entry.blockers.length > 0)
      .map((entry) => info(`  ${entry.id}: ${entry.blockers.join(', ')}`));

    // Tools are bought, never awarded, and nothing else in the game says so.
    // This appears only when a tool is actually what is blocking someone.
    const blockedOnTool = entries.some((entry) =>
      entry.blockers.some((blocker) => blocker.startsWith('requires tool')),
    );

    return {
      state: context.state,
      outputs: [
        system('CONTRACTS'),
        ...rows.map((row) => output(`  ${row}`)),
        ...(blockerLines.length === 0 ? [] : [system('LOCKED BECAUSE'), ...blockerLines]),
        ...(blockedOnTool
          ? [info('  Tools are bought with credits — run "inventory" to see prices.')]
          : []),
        info('Use "start <id>" to take a contract, "brief" to read the current one.'),
      ],
      events: [],
    };
  },
};
