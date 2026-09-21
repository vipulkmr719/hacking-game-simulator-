import { resolveSession, withSession } from '../../missions/session';
import { findServiceById, resolveDiscoveredPorts, revealService } from '../../simulation/discovery';
import { formatDetail } from '../../terminal/format';
import { error, info, output, success, system, warning } from '../../terminal/types';
import type { CommandSpec } from '../types';

export const analyzeCommand: CommandSpec = {
  id: 'analyze',
  name: 'analyze',
  aliases: [],
  summary: 'Identify the service behind a discovered port.',
  usage: 'analyze <port>',
  args: [{ name: 'port', required: true, description: 'Port number or port id.' }],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: 'basic-scanner',
  detectionCost: 6,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    const [token] = context.args;
    if (session === null || token === undefined) {
      return { state: context.state, outputs: [error('No target is loaded.')], events: [] };
    }

    const { target, runtime } = session;
    const candidates = resolveDiscoveredPorts(target, runtime.discovered, token);

    if (candidates.length === 0) {
      return {
        state: context.state,
        outputs: [
          error(`No enumerated port matches: ${token}`),
          info('Run "ports <host>" first.'),
        ],
        events: [],
      };
    }

    // The same port number can be open on several hosts, so rather than
    // guessing, hand back the ids that disambiguate it.
    if (candidates.length > 1) {
      return {
        state: context.state,
        outputs: [
          warning(`"${token}" matches ${String(candidates.length)} enumerated ports.`),
          ...candidates.map((match) => output(`  ${match.port.id}  (${match.host.label})`)),
          info('Re-run "analyze" with one of the ids above.'),
        ],
        events: [],
      };
    }

    const [match] = candidates;
    if (match === undefined) {
      return { state: context.state, outputs: [error('No enumerated port matched.')], events: [] };
    }

    const { host, port } = match;

    if (port.serviceId === null) {
      return {
        state: context.state,
        outputs: [
          system(`ANALYZE  ${host.label}:${String(port.number)}`),
          output(`  State        ${port.state}`),
          info('No service is exposed on this port.'),
        ],
        events: [],
      };
    }

    const service = findServiceById(target, port.serviceId);
    if (service === null) {
      return { state: context.state, outputs: [error('Service data unavailable.')], events: [] };
    }

    const discovered = revealService(runtime.discovered, service.id, service.vulnerabilityIds);
    const weaknessCount = service.vulnerabilityIds.length;

    const detail = formatDetail([
      ['Host', `${host.label} (${host.address})`],
      ['Port', `${String(port.number)}/${port.state}`],
      ['Service', service.name],
      ['Version', service.version],
      ['Banner', service.banner],
    ]);

    return {
      state: withSession(context.state, { ...runtime, discovered }),
      outputs: [
        system(`ANALYZE  ${host.label}:${String(port.number)}`),
        ...detail.map(output),
        weaknessCount === 0
          ? success('No weaknesses surfaced.')
          : warning(`${String(weaknessCount)} weakness(es) surfaced.`),
        ...service.vulnerabilityIds.map((id) => output(`  ${id}`)),
        info('Use "inspect <name>" for detail.'),
      ],
      events: [],
    };
  },
};
