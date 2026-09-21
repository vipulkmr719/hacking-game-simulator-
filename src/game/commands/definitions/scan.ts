import { ACTION_TRACE_COST } from '../../detection/detection';
import { resolveSession, withSession } from '../../missions/session';
import { revealHosts } from '../../simulation/discovery';
import { formatTable } from '../../terminal/format';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * Sweeps the loaded target for hosts.
 *
 * No packet is sent and no name is resolved. The command reads the mission's
 * own host table and records which entries the player has now seen.
 */
export const scanCommand: CommandSpec = {
  id: 'scan',
  name: 'scan',
  aliases: ['sweep'],
  summary: 'Sweep the loaded target for reachable hosts.',
  usage: 'scan',
  args: [],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: 'basic-scanner',
  detectionCost: ACTION_TRACE_COST.scan,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    if (session === null) {
      return { state: context.state, outputs: [error('No target is loaded.')], events: [] };
    }

    const { target, runtime } = session;
    const hostIds = target.hosts.map((host) => host.id);
    const discovered = revealHosts(runtime.discovered, hostIds);

    const rows = [
      ['HOST', 'ADDRESS', 'PORTS'],
      ...target.hosts.map((host) => [
        host.label,
        host.address,
        String(host.ports.length),
      ]),
    ];

    return {
      state: withSession(context.state, { ...runtime, discovered }),
      outputs: [
        system(`SWEEP  ${target.domain}`),
        ...formatTable(rows).map((row) => output(`  ${row}`)),
        success(`${String(target.hosts.length)} host(s) mapped.`),
        info('Use "ports <host>" to enumerate a host.'),
      ],
      events: [],
    };
  },
};
