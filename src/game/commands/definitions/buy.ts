import { canAfford, ownsTool, spendCredits, unlockTool } from '../../progression/progression';
import { formatDetail } from '../../terminal/format';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * Buys a tool with credits.
 *
 * The only sink for credits, and the only way to own a tool a contract does
 * not hand over. Every refusal says which requirement failed, so the player is
 * never left guessing whether they are too poor or too junior.
 */
export const buyCommand: CommandSpec = {
  id: 'buy',
  name: 'buy',
  aliases: ['purchase'],
  summary: 'Buy a tool with credits.',
  usage: 'buy <tool>',
  args: [{ name: 'tool', required: true, description: 'Tool id from "inventory".' }],
  requiresActiveMission: false,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const [token] = context.args;
    if (token === undefined) {
      return { state: context.state, outputs: [error('Name a tool.')], events: [] };
    }

    // Matched on id only: tool names contain spaces, so a name could never
    // arrive here as a single argument.
    const key = token.trim().toLowerCase();
    const tool = context.deps.tools.find((candidate) => candidate.id.toLowerCase() === key);

    if (tool === undefined) {
      return {
        state: context.state,
        outputs: [error(`No such tool: ${token}`), info('Run "inventory" to list them.')],
        events: [],
      };
    }

    const { player } = context.state;

    if (ownsTool(player, tool.id)) {
      return { state: context.state, outputs: [info(`You already own ${tool.name}.`)], events: [] };
    }

    if (player.level < tool.requiredLevel) {
      return {
        state: context.state,
        outputs: [
          error(`${tool.name} requires level ${String(tool.requiredLevel)}.`),
          info(`You are level ${String(player.level)}.`),
        ],
        events: [],
      };
    }

    if (!canAfford(player, tool.cost)) {
      return {
        state: context.state,
        outputs: [
          error(`${tool.name} costs ${String(tool.cost)} CR.`),
          info(`You hold ${String(player.credits)} CR.`),
        ],
        events: [],
      };
    }

    const charged = spendCredits(player, tool.cost);
    if (!charged.spent) {
      return { state: context.state, outputs: [error('Purchase failed.')], events: [] };
    }

    const owner = unlockTool(charged.player, tool.id);

    return {
      state: {
        ...context.state,
        player: {
          ...owner,
          statistics: {
            ...owner.statistics,
            toolsPurchased: owner.statistics.toolsPurchased + 1,
          },
        },
      },
      outputs: [
        system(`ACQUIRED  ${tool.name}`),
        ...formatDetail([
          ['Category', tool.category],
          ['Paid', `${String(tool.cost)} CR`],
          ['Remaining', `${String(owner.credits)} CR`],
          ['Trace', `x${String(tool.detectionMultiplier)}`],
        ]).map(output),
        output(`  ${tool.description}`),
        success('Tool unlocked.'),
      ],
      events: [{ type: 'TOOL_UNLOCKED', toolId: tool.id, purchased: true }],
    };
  },
};
