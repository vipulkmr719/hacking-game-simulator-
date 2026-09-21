import { ACTION_TRACE_COST } from '../../detection/detection';
import { resolveSession, withSession } from '../../missions/session';
import {
  hostOfService,
  resolveFile,
  resolveHost,
  resolveService,
  resolveVulnerability,
  revealFiles,
} from '../../simulation/discovery';
import { formatDetail, formatTable } from '../../terminal/format';
import { error, info, output, system, warning } from '../../terminal/types';
import type { CommandOutcome, CommandSpec } from '../types';

/**
 * Detail view for anything already discovered.
 *
 * Resolution runs host, then service, then vulnerability, then file. Every
 * branch checks the discovered set first: naming something the player has not
 * found returns the same "not found" answer whether or not it exists, so
 * guessing reveals nothing.
 */
export const inspectCommand: CommandSpec = {
  id: 'inspect',
  name: 'inspect',
  aliases: ['show'],
  summary: 'Show detail for a discovered host, service, weakness or file.',
  usage: 'inspect <name>',
  args: [{ name: 'name', required: true, description: 'Entity label or id.' }],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: ACTION_TRACE_COST.inspect,
  run: (context): CommandOutcome => {
    const session = resolveSession(context.state, context.deps);
    const [token] = context.args;
    if (session === null || token === undefined) {
      return { state: context.state, outputs: [error('No target is loaded.')], events: [] };
    }

    const { target, runtime } = session;
    const { discovered } = runtime;
    const notFound: CommandOutcome = {
      state: context.state,
      outputs: [error(`Nothing discovered matches: ${token}`), info('Run "scan" to begin.')],
      events: [],
    };

    const host = resolveHost(target, token);
    if (host !== null) {
      if (!discovered.hostIds.includes(host.id)) {
        return notFound;
      }

      const knownFiles = host.files.filter((file) => discovered.fileIds.includes(file.id));
      // Enumerating a mapped host is what surfaces its files.
      const nextDiscovered = revealFiles(
        discovered,
        host.files.map((file) => file.id),
      );

      return {
        state: withSession(context.state, { ...runtime, discovered: nextDiscovered }),
        outputs: [
          system(`HOST  ${host.label}`),
          ...formatDetail([
            ['Address', host.address],
            ['Ports', String(host.ports.length)],
            ['Services', String(host.services.length)],
            ['Files', String(host.files.length)],
            ['Log entries', String(host.logs.length)],
          ]).map(output),
          ...(host.files.length === 0
            ? [info('No files on this host.')]
            : [
                system('FILES'),
                ...formatTable(
                  host.files.map((file) => [
                    file.name,
                    `${String(file.sizeBytes)}B`,
                    file.encrypted ? 'encrypted' : 'plain',
                    file.requiredAccessLevel,
                  ]),
                ).map((row) => output(`  ${row}`)),
                ...(knownFiles.length === host.files.length
                  ? []
                  : [info('File listing recorded.')]),
              ]),
        ],
        events: [],
      };
    }

    const service = resolveService(target, token);
    if (service !== null) {
      if (!discovered.serviceIds.includes(service.id)) {
        return notFound;
      }
      const owner = hostOfService(target, service.id);
      return {
        state: context.state,
        outputs: [
          system(`SERVICE  ${service.name}`),
          ...formatDetail([
            ['Host', owner?.label ?? 'unknown'],
            ['Version', service.version],
            ['Banner', service.banner],
            ['Weaknesses', String(service.vulnerabilityIds.length)],
          ]).map(output),
          ...service.vulnerabilityIds.map((id) => output(`  ${id}`)),
        ],
        events: [],
      };
    }

    const vulnerability = resolveVulnerability(target, token);
    if (vulnerability !== null) {
      if (!discovered.vulnerabilityIds.includes(vulnerability.id)) {
        return notFound;
      }
      return {
        state: context.state,
        outputs: [
          system(`WEAKNESS  ${vulnerability.id}`),
          ...formatDetail([
            ['Label', vulnerability.label],
            ['Grants', vulnerability.grantsAccessLevel],
            ['Trace cost', String(vulnerability.detectionCost)],
            ['Needs tool', vulnerability.requiredToolId ?? 'none'],
          ]).map(output),
          output(`  ${vulnerability.description}`),
        ],
        events: [],
      };
    }

    const file = resolveFile(target, token);
    if (file !== null) {
      if (!discovered.fileIds.includes(file.id)) {
        return notFound;
      }
      return {
        state: context.state,
        outputs: [
          system(`FILE  ${file.name}`),
          ...formatDetail([
            ['Size', `${String(file.sizeBytes)} bytes`],
            ['State', file.encrypted ? 'encrypted' : 'plain'],
            ['Needs access', file.requiredAccessLevel],
          ]).map(output),
          ...(file.encrypted
            ? [warning('Contents are encrypted.')]
            : [system('CONTENTS'), output(`  ${file.contents}`)]),
        ],
        events: [],
      };
    }

    return notFound;
  },
};
