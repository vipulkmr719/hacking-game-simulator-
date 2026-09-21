/**
 * Command registry.
 *
 * A closed allowlist built once at startup. Lookup is the only way text
 * becomes a command, so an unregistered token has no path into the engine at
 * all — there is no fallthrough, no dynamic dispatch, and no string-to-handler
 * construction anywhere in this module.
 *
 * Duplicate names fail loudly at construction rather than silently shadowing,
 * because a shadowed command would be a gap in an allowlist we rely on.
 */
import type { CommandRegistry, CommandSpec } from './types';

export class DuplicateCommandError extends Error {
  constructor(token: string) {
    super(`Command token "${token}" is registered twice.`);
    this.name = 'DuplicateCommandError';
  }
}

function normalize(token: string): string {
  return token.trim().toLowerCase();
}

export function createCommandRegistry(specs: readonly CommandSpec[]): CommandRegistry {
  const byToken = new Map<string, CommandSpec>();
  const byId = new Map<string, CommandSpec>();

  for (const spec of specs) {
    if (byId.has(spec.id)) {
      throw new DuplicateCommandError(spec.id);
    }
    byId.set(spec.id, spec);

    for (const token of [spec.name, ...spec.aliases]) {
      const key = normalize(token);
      if (byToken.has(key)) {
        throw new DuplicateCommandError(key);
      }
      byToken.set(key, spec);
    }
  }

  const all = [...specs].sort((a, b) => a.name.localeCompare(b.name));

  return {
    all,
    resolve: (token) => byToken.get(normalize(token)) ?? null,
    byId: (id) => byId.get(id) ?? null,
  };
}
