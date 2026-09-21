import { createCommandRegistry } from '../registry';
import type { CommandRegistry, CommandSpec } from '../types';
import { abortCommand } from './abort';
import { analyzeCommand } from './analyze';
import { briefCommand } from './brief';
import { buyCommand } from './buy';
import { clearCommand } from './clear';
import { connectCommand } from './connect';
import { downloadCommand } from './download';
import { escapeCommand } from './escape';
import { helpCommand } from './help';
import { inspectCommand } from './inspect';
import { inventoryCommand } from './inventory';
import { logsCommand } from './logs';
import { missionsCommand } from './missions';
import { portsCommand } from './ports';
import { retryCommand } from './retry';
import { scanCommand } from './scan';
import { solveCommand } from './solve';
import { startCommand } from './start';
import { statusCommand } from './status';
import { waitCommand } from './wait';

/**
 * The complete command allowlist.
 *
 * Nothing outside this array can be executed. Ordered by the loop a player
 * follows: orient, take a contract, recon, infiltrate, retrieve, leave.
 */
export const COMMAND_SPECS: readonly CommandSpec[] = [
  helpCommand,
  clearCommand,
  statusCommand,
  inventoryCommand,
  buyCommand,
  missionsCommand,
  startCommand,
  briefCommand,
  retryCommand,
  abortCommand,
  scanCommand,
  portsCommand,
  analyzeCommand,
  inspectCommand,
  logsCommand,
  connectCommand,
  solveCommand,
  downloadCommand,
  waitCommand,
  escapeCommand,
];

export function createDefaultRegistry(): CommandRegistry {
  return createCommandRegistry(COMMAND_SPECS);
}

export {
  abortCommand,
  analyzeCommand,
  briefCommand,
  buyCommand,
  clearCommand,
  connectCommand,
  downloadCommand,
  escapeCommand,
  helpCommand,
  inspectCommand,
  inventoryCommand,
  logsCommand,
  missionsCommand,
  portsCommand,
  retryCommand,
  scanCommand,
  solveCommand,
  startCommand,
  statusCommand,
  waitCommand,
};
