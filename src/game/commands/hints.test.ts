import { describe, expect, it } from 'vitest';
import { hintLines, lookupCommandHint } from './hints';
import { createDefaultRegistry } from './definitions';

describe('command hints', () => {
  it('maps nmap to the game scan mechanic', () => {
    const hint = lookupCommandHint('nmap');
    expect(hint).toEqual({ kind: 'external-tool', equivalent: 'scan' });
  });

  it('is case insensitive and tolerates whitespace', () => {
    expect(lookupCommandHint('  NMAP ')?.equivalent).toBe('scan');
  });

  it('recognises shell builtins separately from external tools', () => {
    expect(lookupCommandHint('rm')?.kind).toBe('shell-builtin');
    expect(lookupCommandHint('curl')?.kind).toBe('external-tool');
  });

  it('returns null for tokens it does not know', () => {
    expect(lookupCommandHint('flibbertigibbet')).toBeNull();
    expect(lookupCommandHint('')).toBeNull();
  });

  it('does not shadow a real command name', () => {
    // If a hint existed for a registered command the registry would win, but
    // the tables should not contain one in the first place.
    const registry = createDefaultRegistry();
    for (const spec of registry.all) {
      expect(lookupCommandHint(spec.name)).toBeNull();
    }
  });

  it('points at the game equivalent when one exists', () => {
    const text = hintLines('nmap', { kind: 'external-tool', equivalent: 'scan' }).map((l) => l.text);
    expect(text).toEqual([
      '"nmap" is not part of this simulation.',
      'This simulation uses "scan".',
      'Type "help" for available commands.',
    ]);
  });

  it('says plainly that it is not a shell, without padding', () => {
    const text = hintLines('sudo', { kind: 'shell-builtin', equivalent: null }).map((l) => l.text);
    expect(text).toEqual([
      '"sudo" is not part of this simulation.',
      'This terminal is not a shell. It cannot reach your computer.',
      'Type "help" for available commands.',
    ]);
  });

  it('names the equivalent for a shell builtin that has one', () => {
    const text = hintLines('ls', { kind: 'shell-builtin', equivalent: 'inspect' }).map((l) => l.text);
    expect(text).toEqual([
      '"ls" is not part of this simulation.',
      'This terminal is not a shell. It cannot reach your computer.',
      'This simulation uses "inspect".',
      'Type "help" for available commands.',
    ]);
  });

  it('admits when nothing covers the ground yet', () => {
    const text = hintLines('ssh', { kind: 'external-tool', equivalent: null }).map((l) => l.text);
    expect(text).toContain('No command here covers that yet.');
  });
});
