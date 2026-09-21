import { describe, expect, it } from 'vitest';
import { completeCommandLine } from './autocomplete';
import { createDefaultRegistry } from './definitions';

const registry = createDefaultRegistry();
const complete = (input: string) => completeCommandLine(input, registry);

describe('command autocomplete', () => {
  it('completes a unique prefix and appends a space', () => {
    expect(complete('inv').completed).toBe('inventory ');
    expect(complete('sc').completed).toBe('scan ');
  });

  it('completes a full command name', () => {
    expect(complete('help').completed).toBe('help ');
  });

  it('is case insensitive', () => {
    expect(complete('INV').completed).toBe('inventory ');
  });

  it('ignores surrounding whitespace', () => {
    expect(complete('  inv  ').completed).toBe('inventory ');
  });

  it('reports every match when a prefix is ambiguous', () => {
    const result = complete('s');
    expect(result.ambiguous).toBe(true);
    expect(result.matches).toEqual(['scan', 'status']);
  });

  it('fills in the shared prefix of an ambiguous match', () => {
    // "inspect" and "inventory" share "in", so typing "i" advances to "in".
    const result = complete('i');
    expect(result.matches).toEqual(['inspect', 'inventory']);
    expect(result.completed).toBe('in');
  });

  it('does not advance when the shared prefix is already typed', () => {
    const result = complete('in');
    expect(result.ambiguous).toBe(true);
    expect(result.completed).toBeNull();
  });

  it('returns nothing for an unknown prefix', () => {
    const result = complete('nmap');
    expect(result.matches).toEqual([]);
    expect(result.completed).toBeNull();
  });

  it('returns nothing for empty input', () => {
    expect(complete('').completed).toBeNull();
    expect(complete('   ').matches).toEqual([]);
  });

  it('does not complete once an argument has been started', () => {
    expect(complete('ports edge').completed).toBeNull();
    expect(complete('help st').matches).toEqual([]);
  });

  it('completes names only, not aliases', () => {
    // "inv" is an alias of inventory and completes via the name; "?" does not
    // complete to anything because completion teaches canonical names.
    expect(complete('?').matches).toEqual([]);
  });

  it('returns matches in alphabetical order', () => {
    const result = complete('');
    expect(result.matches).toEqual([]);
    const sMatches = complete('s').matches;
    expect([...sMatches]).toEqual([...sMatches].sort((a, b) => a.localeCompare(b)));
  });
});
