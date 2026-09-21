import { describe, expect, it } from 'vitest';
import { createDefaultRegistry } from './definitions';
import { MAX_INPUT_LENGTH, parseCommandLine, sanitizeInput, tokenize } from './parse';

const registry = createDefaultRegistry();

describe('input sanitization', () => {
  it('strips C0 control characters', () => {
    expect(sanitizeInput('he\u0000l\u0007lp')).toBe('hellp');
  });

  it('strips the delete character and C1 range', () => {
    expect(sanitizeInput('help\u007f\u0090')).toBe('help');
  });

  it('collapses runs of whitespace', () => {
    expect(sanitizeInput('  help   me  ')).toBe('help me');
  });

  it('strips ANSI escape introducers along with their control byte', () => {
    expect(sanitizeInput('\u001b[31mhelp\u001b[0m')).toBe('[31mhelp[0m');
  });

  it('leaves ordinary text alone', () => {
    expect(sanitizeInput('help status')).toBe('help status');
  });
});

describe('tokenize', () => {
  it('returns no tokens for blank input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('    ')).toEqual([]);
    expect(tokenize('\u0000\u0001')).toEqual([]);
  });

  it('splits on whitespace', () => {
    expect(tokenize('help status')).toEqual(['help', 'status']);
  });
});

describe('parseCommandLine', () => {
  it('resolves a known command', () => {
    const result = parseCommandLine('help', registry);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.id).toBe('help');
      expect(result.args).toEqual([]);
    }
  });

  it('passes arguments through', () => {
    const result = parseCommandLine('help status', registry);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.args).toEqual(['status']);
    }
  });

  it('reports empty input without an error message', () => {
    const result = parseCommandLine('   ', registry);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('empty');
      expect(result.error.lines).toEqual([]);
    }
  });

  it('returns the exact unrecognized-command message', () => {
    const result = parseCommandLine('nmap acme.local', registry);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('unknown-command');
      expect(result.error.lines.map((line) => line.text)).toEqual([
        'Command not recognized.',
        'Type "help" for available commands.',
      ]);
    }
  });

  it('rejects input beyond the length limit', () => {
    const result = parseCommandLine('h'.repeat(MAX_INPUT_LENGTH + 1), registry);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('input-too-long');
    }
  });

  it('rejects too many arguments', () => {
    const result = parseCommandLine('help a b c', registry);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('too-many-arguments');
    }
  });

  it.each([
    ['shell metacharacters', 'help; rm -rf /'],
    ['command substitution', 'help $(whoami)'],
    ['backtick substitution', 'help `id`'],
    ['template injection', 'help ${process.env}'],
    ['path traversal', '../../etc/passwd'],
    ['script markup', '<script>alert(1)</script>'],
    ['event handler markup', '<img src=x onerror=alert(1)>'],
    ['prototype pollution key', '__proto__'],
    ['constructor lookup', 'constructor'],
    ['sql fragment', "help' OR '1'='1"],
    ['null byte', 'help\u0000status'],
    ['javascript url', 'javascript:alert(1)'],
  ])('treats %s as ordinary text and never throws', (_label, input) => {
    expect(() => parseCommandLine(input, registry)).not.toThrow();
    const result = parseCommandLine(input, registry);
    if (result.ok) {
      // If it parsed at all, it resolved to a registered command and the rest
      // is inert argument text.
      expect(registry.byId(result.command.id)).not.toBeNull();
    } else {
      expect(['unknown-command', 'too-many-arguments', 'missing-argument']).toContain(
        result.error.code,
      );
    }
  });

  it('does not resolve a command via a prototype key', () => {
    expect(registry.resolve('__proto__')).toBeNull();
    expect(registry.resolve('constructor')).toBeNull();
    expect(registry.resolve('toString')).toBeNull();
  });
});
