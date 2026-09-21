import { info, output, system } from '../../terminal/types';
import type { CommandOutcome, CommandContext, CommandSpec } from '../types';

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function describeAll(context: CommandContext): CommandOutcome {
  const width = Math.max(...context.registry.all.map((spec) => spec.name.length)) + 2;
  return {
    state: context.state,
    outputs: [
      system('AVAILABLE COMMANDS'),
      ...context.registry.all.map((spec) => output(`  ${pad(spec.name, width)}${spec.summary}`)),
      info('Type "help <command>" for usage.'),
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
    const spec = context.registry.resolve(topic);
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
