/**
 * Public engine entry point.
 *
 * The UI imports from here and nowhere deeper. Parsing and stepping stay
 * separate so each can be tested alone; `executeCommandLine` is the convenience
 * that joins them for the terminal.
 */
import { executeCommand } from './actions';
import { parseCommandLine } from './commands/parse';
import type { CommandRegistry } from './commands/types';
import { step, type StepResult } from './state/reducer';
import type { GameState } from './state/types';
import { echo } from './terminal/types';

export function executeCommandLine(
  state: GameState,
  rawInput: string,
  registry: CommandRegistry,
): StepResult {
  const parsed = parseCommandLine(rawInput, registry);

  if (!parsed.ok) {
    return { state, outputs: parsed.error.lines, events: [] };
  }

  return step(state, executeCommand(parsed.command.id, parsed.args), registry);
}

export { echo };
export { step } from './state/reducer';
export type { StepResult } from './state/reducer';
export { createInitialGameState, DEFAULT_SEED } from './state/initial';
export { createDefaultRegistry } from './commands/definitions';
export { parseCommandLine } from './commands/parse';
export type { GameState } from './state/types';
export type { GameEvent } from './events';
export type { TerminalLine } from './terminal/types';
