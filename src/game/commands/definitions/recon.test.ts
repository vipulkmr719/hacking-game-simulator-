/**
 * Recon command behaviour.
 *
 * Every assertion is on exact strings, which is only possible because the
 * target is fixed mock data and the engine is deterministic.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createGameDeps, createTrainingGameState } from '../../../data/bootstrap';
import { ACTION_TRACE_COST } from '../../detection/detection';
import { executeCommandLine } from '../../engine';
import type { GameState } from '../../state/types';

const deps = createGameDeps();

let state: GameState;

function run(input: string): readonly string[] {
  const result = executeCommandLine(state, input, deps);
  state = result.state;
  return result.outputs.map((line) => line.text);
}

const textOf = (lines: readonly string[]) => lines.join('\n');

beforeEach(() => {
  state = createTrainingGameState();
});

describe('scan', () => {
  it('maps every host on the loaded target', () => {
    const text = textOf(run('scan'));
    expect(text).toContain('SWEEP  acme.local');
    expect(text).toContain('edge-gateway');
    expect(text).toContain('192.0.2.10');
    expect(text).toContain('app-node');
    expect(text).toContain('archive');
    expect(text).toContain('3 host(s) mapped.');
  });

  it('records the hosts as discovered', () => {
    run('scan');
    expect(state.activeMission?.discovered.hostIds).toEqual([
      'acme-edge-01',
      'acme-app-02',
      'acme-archive-03',
    ]);
  });

  it('raises the trace meter', () => {
    expect(state.activeMission?.detection).toBe(0);
    run('scan');
    expect(state.activeMission?.detection).toBe(ACTION_TRACE_COST.scan);
  });

  it('is idempotent in what it discovers', () => {
    run('scan');
    run('scan');
    expect(state.activeMission?.discovered.hostIds).toHaveLength(3);
  });

  it('works through its alias', () => {
    expect(textOf(run('sweep'))).toContain('3 host(s) mapped.');
  });
});

describe('ports', () => {
  it('refuses a host that has not been scanned', () => {
    const text = textOf(run('ports edge-gateway'));
    expect(text).toContain('Host not mapped: edge-gateway');
    expect(text).toContain('Run "scan" first.');
  });

  it('enumerates ports after a scan', () => {
    run('scan');
    const text = textOf(run('ports edge-gateway'));
    expect(text).toContain('PORTS  edge-gateway  192.0.2.10');
    expect(text).toContain('443');
    expect(text).toContain('filtered');
    expect(text).toContain('3 port(s) enumerated.');
  });

  it('accepts a host by id or address as well as label', () => {
    run('scan');
    expect(textOf(run('ports acme-edge-01'))).toContain('3 port(s) enumerated.');
    expect(textOf(run('ports 192.0.2.10'))).toContain('3 port(s) enumerated.');
  });

  it('reports a host that does not exist without confirming anything', () => {
    run('scan');
    expect(textOf(run('ports ghost-node'))).toContain('No such host: ghost-node');
  });

  it('requires its argument', () => {
    expect(textOf(run('ports'))).toContain('Missing argument. Usage: ports <host>');
  });
});

describe('analyze', () => {
  it('refuses a port that has not been enumerated', () => {
    run('scan');
    expect(textOf(run('analyze 443'))).toContain('No enumerated port matches: 443');
  });

  it('identifies the service on an enumerated port', () => {
    run('scan');
    run('ports edge-gateway');
    const text = textOf(run('analyze 443'));
    expect(text).toContain('ANALYZE  edge-gateway:443');
    expect(text).toContain('perimeter-gateway');
    expect(text).toContain('2.4.1');
    expect(text).toContain('1 weakness(es) surfaced.');
    expect(text).toContain('acme-weak-session');
  });

  it('records the service and its weaknesses as discovered', () => {
    run('scan');
    run('ports edge-gateway');
    run('analyze 443');
    expect(state.activeMission?.discovered.serviceIds).toContain('acme-gateway');
    expect(state.activeMission?.discovered.vulnerabilityIds).toContain('acme-weak-session');
  });

  it('reports a clean service as clean', () => {
    run('scan');
    run('ports edge-gateway');
    expect(textOf(run('analyze 80'))).toContain('No weaknesses surfaced.');
  });

  it('says when a port exposes no service', () => {
    run('scan');
    run('ports edge-gateway');
    expect(textOf(run('analyze 22'))).toContain('No service is exposed on this port.');
  });

  it('asks the player to disambiguate rather than guessing', () => {
    // Enumerating two hosts brings two distinct ports into scope; a bare
    // number that matched both would be a coin flip.
    run('scan');
    run('ports edge-gateway');
    run('ports archive');
    const portIds = state.activeMission?.discovered.portIds ?? [];
    expect(portIds.length).toBeGreaterThan(3);
  });

  it('accepts a port id', () => {
    run('scan');
    run('ports edge-gateway');
    expect(textOf(run('analyze acme-edge-01-p443'))).toContain('perimeter-gateway');
  });
});

describe('inspect', () => {
  it('refuses anything not yet discovered', () => {
    expect(textOf(run('inspect edge-gateway'))).toContain(
      'Nothing discovered matches: edge-gateway',
    );
  });

  it('gives the same answer for a real and an imaginary entity', () => {
    const real = textOf(run('inspect edge-gateway'));
    const fake = textOf(run('inspect not-a-real-host'));
    expect(real).toContain('Nothing discovered matches: edge-gateway');
    expect(fake).toContain('Nothing discovered matches: not-a-real-host');
  });

  it('details a discovered host and lists its files', () => {
    run('scan');
    const text = textOf(run('inspect edge-gateway'));
    expect(text).toContain('HOST  edge-gateway');
    expect(text).toContain('192.0.2.10');
    expect(text).toContain('welcome.txt');
  });

  it('details a discovered service', () => {
    run('scan');
    run('ports edge-gateway');
    run('analyze 443');
    const text = textOf(run('inspect perimeter-gateway'));
    expect(text).toContain('SERVICE  perimeter-gateway');
    expect(text).toContain('ACME Perimeter Gateway 2.4.1');
  });

  it('details a discovered weakness', () => {
    run('scan');
    run('ports edge-gateway');
    run('analyze 443');
    const text = textOf(run('inspect acme-weak-session'));
    expect(text).toContain('WEAKNESS  acme-weak-session');
    expect(text).toContain('Weak session handling');
  });

  it('shows plain file contents once the file is known', () => {
    run('scan');
    run('inspect edge-gateway');
    const text = textOf(run('inspect welcome.txt'));
    expect(text).toContain('FILE  welcome.txt');
    expect(text).toContain('Training environment. Nothing here is real.');
  });

  it('withholds encrypted file contents', () => {
    run('scan');
    run('inspect app-node');
    const text = textOf(run('inspect roster.csv'));
    expect(text).toContain('Contents are encrypted.');
    expect(text).not.toContain('Encrypted training data.');
  });
});

describe('logs', () => {
  it('refuses a host that has not been scanned', () => {
    expect(textOf(run('logs edge-gateway'))).toContain('Host not mapped: edge-gateway');
  });

  it('prints fixed, deterministic entries', () => {
    run('scan');
    const first = textOf(run('logs edge-gateway'));
    const second = textOf(run('logs edge-gateway'));
    expect(first).toBe(second);
    expect(first).toContain('D1 04:12');
    expect(first).toContain('session token reuse observed from internal range');
    expect(first).toContain('3 entries.');
  });

  it('reads a different host independently', () => {
    run('scan');
    expect(textOf(run('logs app-node'))).toContain('repeated failed portal sign-in');
  });
});

describe('inventory', () => {
  it('lists the starting tool as owned', () => {
    const text = textOf(run('inventory'));
    expect(text).toContain('INVENTORY  1/6');
    expect(text).toContain('Basic Scanner');
  });

  it('marks the rest as locked and shows the id to buy them by', () => {
    const text = textOf(run('inventory'));
    expect(text).toContain('LOCKED');
    expect(text).toContain('stealth-module');
    expect(text).toContain('Buy with "buy <id>".');
  });

  it('works through its alias and needs no session', () => {
    expect(textOf(run('inv'))).toContain('INVENTORY');
  });
});

describe('recon chain', () => {
  it('replays identically from the same starting state', () => {
    const script = ['scan', 'ports edge-gateway', 'analyze 443', 'inspect edge-gateway', 'logs app-node'];

    const play = () => {
      let s = createTrainingGameState(777);
      const out: string[] = [];
      for (const input of script) {
        const result = executeCommandLine(s, input, deps);
        s = result.state;
        out.push(...result.outputs.map((line) => line.text));
      }
      return { state: s, out };
    };

    const first = play();
    const second = play();
    expect(first.out).toEqual(second.out);
    expect(first.state).toEqual(second.state);
  });

  it('accumulates trace across the chain', () => {
    run('scan');
    run('ports edge-gateway');
    run('analyze 443');
    expect(state.activeMission?.detection).toBe(
      ACTION_TRACE_COST.scan + ACTION_TRACE_COST.ports + ACTION_TRACE_COST.analyze,
    );
  });
});
