/**
 * Command line parsing.
 *
 * Everything arriving here is untrusted text typed by a player. It is treated
 * as a string to be matched, never as something to evaluate: the parser
 * tokenizes, strips control characters, enforces length limits, and then looks
 * the first token up in the registry. Text that matches nothing produces an
 * error line and stops.
 *
 * No branch of this module builds a function, touches the DOM, or forwards the
 * input anywhere. Its only output is plain data.
 */
import { error, type TerminalLine } from '../terminal/types';
import type { CommandRegistry, CommandSpec } from './types';

export const MAX_INPUT_LENGTH = 256;
export const MAX_TOKEN_COUNT = 16;

export const UNKNOWN_COMMAND_LINES: readonly TerminalLine[] = [
  error('Command not recognized.'),
  error('Type "help" for available commands.'),
];

export type ParseErrorCode =
  | 'empty'
  | 'input-too-long'
  | 'too-many-arguments'
  | 'unknown-command'
  | 'missing-argument';

export interface ParseError {
  readonly code: ParseErrorCode;
  readonly lines: readonly TerminalLine[];
}

export type ParseResult =
  | { readonly ok: true; readonly command: CommandSpec; readonly args: readonly string[] }
  | { readonly ok: false; readonly error: ParseError };

/**
 * Removes C0/C1 control characters and collapses whitespace.
 *
 * Terminal output renders as text nodes, so this is not what prevents markup
 * injection — it prevents a pasted escape sequence from corrupting the display
 * or smuggling invisible characters into a comparison.
 */
export function sanitizeInput(raw: string): string {
  let cleaned = '';
  for (const character of raw) {
    const code = character.codePointAt(0) ?? 0;
    const isC0 = code <= 0x1f;
    const isDelete = code === 0x7f;
    const isC1 = code >= 0x80 && code <= 0x9f;
    if (!isC0 && !isDelete && !isC1) {
      cleaned += character;
    }
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function tokenize(raw: string): readonly string[] {
  const cleaned = sanitizeInput(raw);
  if (cleaned === '') {
    return [];
  }
  return cleaned.split(' ');
}

function fail(code: ParseErrorCode, lines: readonly TerminalLine[]): ParseResult {
  return { ok: false, error: { code, lines } };
}

export function parseCommandLine(raw: string, registry: CommandRegistry): ParseResult {
  if (raw.length > MAX_INPUT_LENGTH) {
    return fail('input-too-long', [
      error(`Input exceeds ${String(MAX_INPUT_LENGTH)} characters.`),
    ]);
  }

  const tokens = tokenize(raw);
  if (tokens.length === 0) {
    return fail('empty', []);
  }

  if (tokens.length > MAX_TOKEN_COUNT) {
    return fail('too-many-arguments', [
      error(`Too many arguments. Maximum is ${String(MAX_TOKEN_COUNT - 1)}.`),
    ]);
  }

  const [head, ...args] = tokens;
  const command = head === undefined ? null : registry.resolve(head);
  if (command === null) {
    return fail('unknown-command', UNKNOWN_COMMAND_LINES);
  }

  const requiredCount = command.args.filter((arg) => arg.required).length;
  if (args.length < requiredCount) {
    return fail('missing-argument', [
      error(`Missing argument. Usage: ${command.usage}`),
    ]);
  }

  if (args.length > command.args.length) {
    return fail('too-many-arguments', [
      error(`Too many arguments. Usage: ${command.usage}`),
    ]);
  }

  return { ok: true, command, args };
}
