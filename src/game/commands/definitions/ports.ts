import { resolveSession, withSession } from '../../missions/session';
import { resolveHost, revealPorts } from '../../simulation/discovery';
import { formatTable } from '../../terminal/format';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

export const portsCommand: CommandSpec = {
  id: 'ports',
  name: 'ports',
  aliases: [],
  summary: 'Enumerate ports on a discovered host.',
  usage: 'ports <host>',
  args: [{ name: 'host', required: true, description: 'Host label, id or address.' }],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: 'basic-scanner',
  detectionCost: 5,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    const [token] = context.args;
    if (session === null || token === undefined) {
      return { state: context.state, outputs: [error('No target is loaded.')], events: [] };
    }

    const { target, runtime } = session;
    const host = resolveHost(target, token);

    if (host === null) {
      return {
        state: context.state,
        outputs: [error(`No such host: ${token}`), info('Run "scan" to map the target first.')],
        events: [],
      };
    }

    // Gate on discovery, not on existence: naming an unscanned host must not
    // confirm that it is there.
    if (!runtime.discovered.hostIds.includes(host.id)) {
      return {
        state: context.state,
        outputs: [error(`Host not mapped: ${token}`), info('Run "scan" first.')],
        events: [],
      };
    }

    const discovered = revealPorts(
      runtime.discovered,
      host.ports.map((port) => port.id),
    );

    const rows = [
      ['PORT', 'STATE', 'SERVICE'],
      ...host.ports.map((port) => [
        String(port.number),
        port.state,
        port.serviceId === null ? '—' : 'unidentified',
      ]),
    ];

    return {
      state: withSession(context.state, { ...runtime, discovered }),
      outputs: [
        system(`PORTS  ${host.label}  ${host.address}`),
        ...formatTable(rows).map((row) => output(`  ${row}`)),
        success(`${String(host.ports.length)} port(s) enumerated.`),
        info('Use "analyze <port>" to identify a service.'),
      ],
      events: [],
    };
  },
};
