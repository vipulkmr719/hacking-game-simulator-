/**
 * Command-name completion.
 *
 * Completes the first token only. Arguments are not completed: they name game
 * entities, and suggesting one the player has not discovered would leak the
 * target's contents ahead of the recon that is supposed to reveal it.
 *
 * Aliases are excluded so completion teaches the canonical vocabulary — a
 * player who types "?" already knows the shortcut.
 */
import type { CommandRegistry } from './types';

export interface CompletionResult {
  /** Every command name matching the prefix, alphabetically. */
  readonly matches: readonly string[];
  /** Text the input should become, or null to leave it untouched. */
  readonly completed: string | null;
  /** True when several commands matched and the player must narrow it. */
  readonly ambiguous: boolean;
}

export const NO_COMPLETION: CompletionResult = {
  matches: [],
  completed: null,
  ambiguous: false,
};

function longestCommonPrefix(values: readonly string[]): string {
  const [first, ...rest] = values;
  if (first === undefined) {
    return '';
  }

  let prefix = first;
  for (const value of rest) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') {
        return '';
      }
    }
  }
  return prefix;
}

export function completeCommandLine(input: string, registry: CommandRegistry): CompletionResult {
  // Once a space is typed the player has committed to a command, so there is
  // nothing left to complete.
  if (input.trim() === '' || /\s/.test(input.trim())) {
    return NO_COMPLETION;
  }

  const prefix = input.trim().toLowerCase();
  const matches = registry.all
    .map((spec) => spec.name)
    .filter((name) => name.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));

  if (matches.length === 0) {
    return NO_COMPLETION;
  }

  if (matches.length === 1) {
    const [only] = matches;
    return { matches, completed: `${only ?? ''} `, ambiguous: false };
  }

  const shared = longestCommonPrefix(matches);
  return {
    matches,
    completed: shared.length > prefix.length ? shared : null,
    ambiguous: true,
  };
}
