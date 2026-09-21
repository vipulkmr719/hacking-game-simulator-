import { ACTION_TRACE_COST } from '../../detection/detection';
import { resolveSession } from '../../missions/session';
import { resolveHost } from '../../simulation/discovery';
import { formatTable } from '../../terminal/format';
import { error, info, output, system } from '../../terminal/types';
import type { LogSeverity } from '../../simulation/types';
import type { TerminalLineKind } from '../../terminal/types';
import { line } from '../../terminal/types';
import type { CommandSpec } from '../types';

const SEVERITY_KIND: Record<LogSeverity, TerminalLineKind> = {
  info: 'output',
  notice: 'info',
  warning: 'warning',
  alert: 'error',
};

export const logsCommand: CommandSpec = {
  id: 'logs',
  name: 'logs',
  aliases: [],
  summary: 'Read the event log on a discovered host.',
  usage: 'logs <host>',
  args: [{ name: 'host', required: true, description: 'Host label, id or address.' }],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: 'basic-scanner',
  detectionCost: ACTION_TRACE_COST.logs,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    const [token] = context.args;
    if (session === null || token === undefined) {
      return { state: context.state, outputs: [error('No target is loaded.')], events: [] };
    }

    const { target, runtime } = session;
    const host = resolveHost(target, token);

    if (host === null || !runtime.discovered.hostIds.includes(host.id)) {
      return {
        state: context.state,
        outputs: [error(`Host not mapped: ${token}`), info('Run "scan" first.')],
        events: [],
      };
    }

    if (host.logs.length === 0) {
      return {
        state: context.state,
        outputs: [system(`LOGS  ${host.label}`), info('Log is empty.')],
        events: [],
      };
    }

    const rows = formatTable(
      host.logs.map((entry) => [entry.timestamp, entry.severity.toUpperCase(), entry.message]),
    );

    return {
      state: context.state,
      outputs: [
        system(`LOGS  ${host.label}  ${host.address}`),
        ...rows.map((row, index) =>
          line(SEVERITY_KIND[host.logs[index]?.severity ?? 'info'], `  ${row}`),
        ),
        output(''),
        info(`${String(host.logs.length)} entries.`),
      ],
      events: [],
    };
  },
};
