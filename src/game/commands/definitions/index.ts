import { createCommandRegistry } from '../registry';
import type { CommandRegistry, CommandSpec } from '../types';
import { analyzeCommand } from './analyze';
import { clearCommand } from './clear';
import { helpCommand } from './help';
import { inspectCommand } from './inspect';
import { inventoryCommand } from './inventory';
import { logsCommand } from './logs';
import { portsCommand } from './ports';
import { scanCommand } from './scan';
import { statusCommand } from './status';

/**
 * The complete command allowlist.
 *
 * Nothing outside this array can be executed. Infiltration commands (connect,
 * decrypt, download, escape) arrive with the mission engine in a later phase.
 */
export const COMMAND_SPECS: readonly CommandSpec[] = [
  helpCommand,
  clearCommand,
  statusCommand,
  inventoryCommand,
  scanCommand,
  portsCommand,
  analyzeCommand,
  inspectCommand,
  logsCommand,
];

export function createDefaultRegistry(): CommandRegistry {
  return createCommandRegistry(COMMAND_SPECS);
}

export {
  analyzeCommand,
  clearCommand,
  helpCommand,
  inspectCommand,
  inventoryCommand,
  logsCommand,
  portsCommand,
  scanCommand,
  statusCommand,
};
