import { describe, expect, it } from 'vitest';
import { createDefaultRegistry } from './definitions';
import { DuplicateCommandError, createCommandRegistry } from './registry';
import type { CommandSpec } from './types';

function spec(id: string, name: string, aliases: readonly string[] = []): CommandSpec {
  return {
    id,
    name,
    aliases,
    summary: 'test',
    usage: name,
    args: [],
    requiresActiveMission: false,
    requiredAccessLevel: 'none',
    requiredToolId: null,
    detectionCost: 0,
    run: (context) => ({ state: context.state, outputs: [], events: [] }),
  };
}

describe('command registry', () => {
  it('resolves by name and by alias', () => {
    const registry = createCommandRegistry([spec('a', 'alpha', ['al'])]);
    expect(registry.resolve('alpha')?.id).toBe('a');
    expect(registry.resolve('al')?.id).toBe('a');
    expect(registry.byId('a')?.name).toBe('alpha');
  });

  it('resolves case-insensitively and ignores surrounding whitespace', () => {
    const registry = createCommandRegistry([spec('a', 'alpha')]);
    expect(registry.resolve('ALPHA')?.id).toBe('a');
    expect(registry.resolve('  Alpha  ')?.id).toBe('a');
  });

  it('returns null for anything unregistered', () => {
    const registry = createCommandRegistry([spec('a', 'alpha')]);
    expect(registry.resolve('nmap')).toBeNull();
    expect(registry.resolve('')).toBeNull();
    expect(registry.byId('nope')).toBeNull();
  });

  it('rejects a duplicate name rather than shadowing it', () => {
    expect(() => createCommandRegistry([spec('a', 'alpha'), spec('b', 'alpha')])).toThrow(
      DuplicateCommandError,
    );
  });

  it('rejects an alias that collides with another command name', () => {
    expect(() => createCommandRegistry([spec('a', 'alpha'), spec('b', 'beta', ['alpha'])])).toThrow(
      DuplicateCommandError,
    );
  });

  it('rejects a duplicate id', () => {
    expect(() => createCommandRegistry([spec('a', 'alpha'), spec('a', 'beta')])).toThrow(
      DuplicateCommandError,
    );
  });

  it('builds the default registry without collisions', () => {
    const registry = createDefaultRegistry();
    expect(registry.all.map((command) => command.name)).toEqual([
      'analyze',
      'clear',
      'help',
      'inspect',
      'inventory',
      'logs',
      'ports',
      'scan',
      'status',
    ]);
  });
});
