/**
 * Terminal output model.
 *
 * Lines are plain data: a kind and a string. They are rendered as React text
 * nodes, never as markup, so nothing a player types can become HTML.
 */

export const TERMINAL_LINE_KINDS = [
  'info',
  'success',
  'warning',
  'error',
  'system',
  'command',
  'output',
] as const;

export type TerminalLineKind = (typeof TERMINAL_LINE_KINDS)[number];

export interface TerminalLine {
  readonly kind: TerminalLineKind;
  readonly text: string;
}

export function line(kind: TerminalLineKind, text: string): TerminalLine {
  return { kind, text };
}

export const info = (text: string): TerminalLine => line('info', text);
export const success = (text: string): TerminalLine => line('success', text);
export const warning = (text: string): TerminalLine => line('warning', text);
export const error = (text: string): TerminalLine => line('error', text);
export const system = (text: string): TerminalLine => line('system', text);
export const output = (text: string): TerminalLine => line('output', text);
export const echo = (text: string): TerminalLine => line('command', text);
