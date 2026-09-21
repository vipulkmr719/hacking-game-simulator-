/**
 * Command model.
 *
 * A CommandSpec is source code, not mission data: `run` is written by us and
 * reviewed like any other module. What a player types never becomes a command;
 * it is only ever *matched against* the registry's closed set. That is the
 * boundary the whole terminal rests on.
 */
import type { GameEvent } from '../events';
import type { AccessLevel } from '../simulation/types';
import type { GameState } from '../state/types';
import type { TerminalLine } from '../terminal/types';

export interface ArgSpec {
  readonly name: string;
  readonly required: boolean;
  readonly description: string;
}

export interface CommandOutcome {
  readonly state: GameState;
  readonly outputs: readonly TerminalLine[];
  readonly events: readonly GameEvent[];
}

export interface CommandContext {
  readonly state: GameState;
  readonly args: readonly string[];
  /** Supplied so commands such as `help` can describe the registry. */
  readonly registry: CommandRegistry;
}

export interface CommandSpec {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly summary: string;
  readonly usage: string;
  readonly args: readonly ArgSpec[];
  readonly requiresActiveMission: boolean;
  readonly requiredAccessLevel: AccessLevel;
  readonly requiredToolId: string | null;
  /** Base detection added when this command runs inside a mission. */
  readonly detectionCost: number;
  readonly run: (context: CommandContext) => CommandOutcome;
}

export interface CommandRegistry {
  readonly all: readonly CommandSpec[];
  /** Resolves a name or alias. Returns null for anything unregistered. */
  readonly resolve: (token: string) => CommandSpec | null;
  readonly byId: (id: string) => CommandSpec | null;
}
