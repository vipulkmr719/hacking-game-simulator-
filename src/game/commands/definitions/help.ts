import { formatTable } from '../../terminal/format';
import { info, output, system } from '../../terminal/types';
import { resolveSession } from '../../missions/session';
import type { CommandOutcome, CommandContext, CommandSpec } from '../types';

function describeAll(context: CommandContext): CommandOutcome {
  const session = resolveSession(context.state, context.deps);
  const available = session?.mission.availableCommandIds ?? null;

  const filtered =
    available === null
      ? context.deps.registry.all
      : context.deps.registry.all.filter((spec) => available.includes(spec.id));

  const rows = formatTable(filtered.map((spec) => [spec.name, spec.summary]));

  return {
    state: context.state,
    outputs: [
      system('AVAILABLE COMMANDS'),
      ...rows.map((row) => output(`  ${row}`)),
      info('Type "help <command>" for usage. Tab completes a command name.'),
    ],
    events: [],
  };
}

function describeOne(context: CommandContext, spec: CommandSpec): CommandOutcome {
  const lines = [
    system(spec.name.toUpperCase()),
    output(`  ${spec.summary}`),
    output(`  Usage: ${spec.usage}`),
  ];

  if (spec.aliases.length > 0) {
    lines.push(output(`  Aliases: ${spec.aliases.join(', ')}`));
  }
  for (const arg of spec.args) {
    const label = arg.required ? 'required' : 'optional';
    lines.push(output(`  <${arg.name}> (${label}) ${arg.description}`));
  }
  if (spec.requiredToolId !== null) {
    lines.push(info(`  Requires tool: ${spec.requiredToolId}`));
  }
  if (spec.detectionCost > 0) {
    lines.push(info(`  Trace cost: ${String(spec.detectionCost)}%`));
  }

  return { state: context.state, outputs: lines, events: [] };
}

export const helpCommand: CommandSpec = {
  id: 'help',
  name: 'help',
  aliases: ['?'],
  summary: 'List available commands, or explain one.',
  usage: 'help [command]',
  args: [{ name: 'command', required: false, description: 'Command to describe.' }],
  requiresActiveMission: false,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const [topic] = context.args;
    if (topic === undefined) {
      return describeAll(context);
    }
    const spec = context.deps.registry.resolve(topic);
    if (spec === null) {
      return {
        state: context.state,
        outputs: [output(`No help entry for "${topic}".`)],
        events: [],
      };
    }
    return describeOne(context, spec);
  },
};
