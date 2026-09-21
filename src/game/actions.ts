/**
 * Engine actions.
 *
 * Parsing produces one of these — plain, serializable data, never a closure.
 * An action log is therefore replayable, which is what makes a seeded run
 * reproducible and will make save debugging tractable later.
 */

export interface ExecuteCommandAction {
  readonly type: 'EXECUTE_COMMAND';
  readonly commandId: string;
  readonly args: readonly string[];
}

export type GameAction = ExecuteCommandAction;

export function executeCommand(commandId: string, args: readonly string[]): ExecuteCommandAction {
  return { type: 'EXECUTE_COMMAND', commandId, args };
}
