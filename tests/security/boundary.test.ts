/**
 * Security boundary tests.
 *
 * The core rule of this project is that the game is a simulation and can never
 * become a real tool. Lint rules enforce that while code is being written;
 * these tests enforce it on the code that actually shipped, so a disabled rule
 * or an eslint-disable comment cannot quietly open a hole.
 */
import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../../src/data/missions';
import {
  isDocumentationAddress,
  isFictionalDomain,
} from '../../src/game/simulation/fictional';
import { executeCommandLine } from '../../src/game/engine';
import { createGameDeps, createTrainingGameState } from '../../src/data/bootstrap';
import { stripComments } from './stripComments';

const SOURCE_FILES: Record<string, string> = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Shipped source, paired with a comment-free copy.
 *
 * API checks run against `code`: a comment naming a banned API is
 * documentation, not a use of it. The `eslint-disable` check is the exception
 * and runs against `raw`, because a disable directive only ever exists as a
 * comment.
 */
const PRODUCTION_SOURCES = Object.entries(SOURCE_FILES)
  .filter(([path]) => !path.includes('.test.'))
  .map(([path, raw]) => ({ path, raw, code: stripComments(raw) }));

interface ForbiddenPattern {
  readonly label: string;
  readonly pattern: RegExp;
  /** 'raw' scans the file as written, including comments. */
  readonly scope?: 'raw';
}

const FORBIDDEN_PATTERNS: readonly ForbiddenPattern[] = [
  { label: 'eval()', pattern: /\beval\s*\(/ },
  { label: 'new Function()', pattern: /\bnew\s+Function\s*\(/ },
  { label: 'dangerouslySetInnerHTML', pattern: /dangerouslySetInnerHTML/ },
  { label: 'innerHTML assignment', pattern: /\.(inner|outer)HTML\s*=/ },
  { label: 'child_process', pattern: /child_process/ },
  { label: 'node fs import', pattern: /from\s+['"](node:)?fs['"]/ },
  { label: 'node net import', pattern: /from\s+['"](node:)?net['"]/ },
  { label: 'fetch call', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
  { label: 'WebSocket', pattern: /\bnew\s+WebSocket\s*\(/ },
  { label: 'eslint-disable directive', pattern: /eslint-disable/, scope: 'raw' },
];

describe('shipped source', () => {
  it('finds source files to scan', () => {
    expect(PRODUCTION_SOURCES.length).toBeGreaterThan(10);
  });

  it.each(FORBIDDEN_PATTERNS)('contains no $label', ({ pattern, scope }) => {
    const offenders = PRODUCTION_SOURCES.filter((file) =>
      pattern.test(scope === 'raw' ? file.raw : file.code),
    ).map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('keeps the engine free of DOM and storage access', () => {
    const engineFiles = PRODUCTION_SOURCES.filter((file) => file.path.startsWith('/src/game/'));
    expect(engineFiles.length).toBeGreaterThan(5);

    const offenders = engineFiles
      .filter((file) => /\b(document|localStorage|sessionStorage)\s*\./.test(file.code))
      .map((file) => file.path);
    expect(offenders).toEqual([]);
  });

  it('keeps Math.random out of the engine so runs stay reproducible', () => {
    const offenders = PRODUCTION_SOURCES.filter(
      (file) => file.path.startsWith('/src/game/') && file.code.includes('Math.random'),
    ).map((file) => file.path);
    expect(offenders).toEqual([]);
  });
});

describe('network guard', () => {
  it('throws if anything reaches for fetch', () => {
    expect(() => globalThis.fetch('https://example.com')).toThrow(/Blocked network access/);
  });

  it('throws if anything constructs an XMLHttpRequest', () => {
    expect(() => new globalThis.XMLHttpRequest()).toThrow(/Blocked network access/);
  });

  it('throws if anything opens a WebSocket', () => {
    expect(() => new globalThis.WebSocket('wss://example.com')).toThrow(
      /Blocked network access/,
    );
  });

  it('stays quiet across a full terminal session', () => {
    const deps = createGameDeps();
    let state = createTrainingGameState();
    const script = [
      'help',
      'status',
      'inventory',
      'scan',
      'ports edge-gateway',
      'analyze 443',
      'inspect edge-gateway',
      'logs edge-gateway',
      'nmap acme.local',
      'clear',
    ];
    for (const input of script) {
      expect(() => {
        state = executeCommandLine(state, input, deps).state;
      }).not.toThrow();
    }
  });
});

describe('mission data', () => {
  it('ships at least one mission', () => {
    expect(MISSIONS.length).toBeGreaterThan(0);
  });

  it.each(MISSIONS)('$id uses a fictional domain', (mission) => {
    expect(isFictionalDomain(mission.target.domain)).toBe(true);
  });

  it.each(MISSIONS)('$id uses only reserved documentation addresses', (mission) => {
    const addresses = mission.target.hosts.map((host) => host.address);
    expect(addresses.length).toBeGreaterThan(0);
    for (const address of addresses) {
      expect(isDocumentationAddress(address)).toBe(true);
    }
  });

  it.each(MISSIONS)('$id contains no executable values', (mission) => {
    // Missions must be pure data. JSON round-tripping proves it: a function
    // would be silently dropped and the comparison would fail.
    expect(JSON.parse(JSON.stringify(mission))).toEqual(mission);
  });
});
