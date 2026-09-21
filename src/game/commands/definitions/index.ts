import { createCommandRegistry } from '../registry';
import type { CommandRegistry, CommandSpec } from '../types';
import { clearCommand } from './clear';
import { helpCommand } from './help';
import { statusCommand } from './status';

/**
 * The complete command allowlist for Phase 1.
 *
 * Recon and infiltration commands (scan, ports, analyze, connect, …) arrive in
 * later phases. Nothing outside this array can be executed.
 */
export const COMMAND_SPECS: readonly CommandSpec[] = [helpCommand, clearCommand, statusCommand];

export function createDefaultRegistry(): CommandRegistry {
  return createCommandRegistry(COMMAND_SPECS);
}

export { clearCommand, helpCommand, statusCommand };
