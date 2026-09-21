import { formatTable } from '../../terminal/format';
import { info, output, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * Lists gameplay tools.
 *
 * Locked entries are shown so progression is legible, but they are plainly
 * marked rather than presented as usable — the UI rules forbid controls that
 * look available and are not.
 */
export const inventoryCommand: CommandSpec = {
  id: 'inventory',
  name: 'inventory',
  aliases: ['inv'],
  summary: 'List owned and locked tools.',
  usage: 'inventory',
  args: [],
  requiresActiveMission: false,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const tools = context.deps.tools;
    const owned = context.state.player.unlockedToolIds;
    const unlocked = tools.filter((tool) => owned.includes(tool.id));
    const locked = tools.filter((tool) => !owned.includes(tool.id));

    const unlockedRows = formatTable(
      unlocked.map((tool) => [tool.name, tool.category, `x${String(tool.detectionMultiplier)}`]),
    );

    const lockedRows = formatTable(
      locked.map((tool) => [
        tool.id,
        `${String(tool.cost)} CR`,
        `lvl ${String(tool.requiredLevel)}`,
      ]),
    );

    return {
      state: context.state,
      outputs: [
        system(`INVENTORY  ${String(unlocked.length)}/${String(tools.length)}`),
        ...(unlocked.length === 0
          ? [info('  No tools owned.')]
          : unlockedRows.map((row) => output(`  ${row}`))),
        ...(locked.length === 0
          ? []
          : [
              system('LOCKED'),
              ...lockedRows.map((row) => info(`  ${row}`)),
              info('Buy with "buy <id>".'),
            ]),
      ],
      events: [],
    };
  },
};
