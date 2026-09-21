/**
 * Redirects for commands players type out of habit.
 *
 * A player reaching for `nmap` or `ls` gets told what this simulation uses
 * instead. Nothing here executes, resolves, or describes what the real tool
 * does — each entry is a string key mapped to the name of a game command, and
 * the lookup happens only after the registry has already refused the token.
 *
 * Shell builtins get a blunter answer, because someone typing `sudo rm -rf`
 * should be told plainly that this terminal cannot reach their computer.
 */
import { error, info, type TerminalLine } from '../terminal/types';

export type HintKind = 'external-tool' | 'shell-builtin';

export interface CommandHint {
  readonly kind: HintKind;
  /** The game command covering this ground, when one exists yet. */
  readonly equivalent: string | null;
}

const EXTERNAL_TOOLS: Record<string, string | null> = {
  nmap: 'scan',
  ping: 'scan',
  traceroute: 'scan',
  tracert: 'scan',
  dig: 'scan',
  nslookup: 'scan',
  whois: 'scan',
  ifconfig: 'scan',
  ipconfig: 'scan',
  netstat: 'ports',
  nc: 'ports',
  netcat: 'ports',
  tcpdump: 'logs',
  journalctl: 'logs',
  dmesg: 'logs',
  curl: 'inspect',
  wget: 'inspect',
  ssh: null,
  telnet: null,
  ftp: null,
  scp: null,
};

const SHELL_BUILTINS: Record<string, string | null> = {
  ls: 'inspect',
  dir: 'inspect',
  cat: 'inspect',
  less: 'inspect',
  more: 'inspect',
  head: 'inspect',
  tail: 'logs',
  cd: null,
  pwd: null,
  mkdir: null,
  touch: null,
  cp: null,
  mv: null,
  rm: null,
  chmod: null,
  chown: null,
  ps: null,
  top: null,
  kill: null,
  sudo: null,
  su: null,
  grep: null,
  find: null,
  echo: null,
  exit: null,
  whoami: 'status',
  uname: null,
  env: null,
  export: null,
  bash: null,
  sh: null,
  zsh: null,
  powershell: null,
  cmd: null,
};

export function lookupCommandHint(token: string): CommandHint | null {
  const key = token.trim().toLowerCase();

  if (Object.hasOwn(EXTERNAL_TOOLS, key)) {
    return { kind: 'external-tool', equivalent: EXTERNAL_TOOLS[key] ?? null };
  }
  if (Object.hasOwn(SHELL_BUILTINS, key)) {
    return { kind: 'shell-builtin', equivalent: SHELL_BUILTINS[key] ?? null };
  }
  return null;
}

export function hintLines(token: string, hint: CommandHint): readonly TerminalLine[] {
  const lines: TerminalLine[] = [error(`"${token}" is not part of this simulation.`)];

  if (hint.kind === 'shell-builtin') {
    lines.push(info('This terminal is not a shell. It cannot reach your computer.'));
  }

  if (hint.equivalent !== null) {
    lines.push(info(`This simulation uses "${hint.equivalent}".`));
  } else if (hint.kind === 'external-tool') {
    // For a shell builtin the line above is already the whole answer.
    lines.push(info('No command here covers that yet.'));
  }

  lines.push(info('Type "help" for available commands.'));
  return lines;
}
