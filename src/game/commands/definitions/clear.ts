import type { CommandSpec } from '../types';

/**
 * Scrollback lives in the UI, so this command cannot clear it directly.
 * It emits TERMINAL_CLEARED and the terminal component acts on it — the engine
 * stays pure and the UI keeps ownership of its own buffer.
 */
export const clearCommand: CommandSpec = {
  id: 'clear',
  name: 'clear',
  aliases: ['cls'],
  summary: 'Clear the terminal display.',
  usage: 'clear',
  args: [],
  requiresActiveMission: false,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => ({
    state: context.state,
    outputs: [],
    events: [{ type: 'TERMINAL_CLEARED' }],
  }),
};
