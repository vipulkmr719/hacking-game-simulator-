import {
  ACTION_TRACE_COST,
  applyDetectionDelta,
} from '../../detection/detection';
import { resolveSession, withSession } from '../../missions/session';
import { resolveHost } from '../../simulation/discovery';
import { accessRank, meetsAccessLevel } from '../../simulation/types';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * Raises access on a host using a weakness already surfaced by `analyze`.
 *
 * The weakness is a game object with an id and an access level. Nothing is
 * exploited, sent, or executed: the command checks that the player found the
 * weakness, then sets a number in game state.
 */
export const connectCommand: CommandSpec = {
  id: 'connect',
  name: 'connect',
  aliases: [],
  summary: 'Use a surfaced weakness to raise access on a host.',
  usage: 'connect <host>',
  args: [{ name: 'host', required: true, description: 'A mapped host.' }],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: ACTION_TRACE_COST.connect,
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

    const known = host.vulnerabilities.filter((vulnerability) =>
      runtime.discovered.vulnerabilityIds.includes(vulnerability.id),
    );

    if (known.length === 0) {
      return {
        state: context.state,
        outputs: [
          error(`No surfaced weakness on ${host.label}.`),
          info('Run "analyze <port>" to surface one.'),
        ],
        events: [],
      };
    }

    // Highest access wins; ties break on id so the choice is deterministic.
    const best = [...known].sort((a, b) => {
      const rank = accessRank(b.grantsAccessLevel) - accessRank(a.grantsAccessLevel);
      return rank !== 0 ? rank : a.id.localeCompare(b.id);
    })[0];

    if (best === undefined) {
      return { state: context.state, outputs: [error('No usable weakness.')], events: [] };
    }

    if (best.requiredToolId !== null && !context.state.player.unlockedToolIds.includes(best.requiredToolId)) {
      return {
        state: context.state,
        outputs: [error(`"${best.id}" requires tool: ${best.requiredToolId}`)],
        events: [],
      };
    }

    if (meetsAccessLevel(runtime.accessLevel, best.grantsAccessLevel)) {
      return {
        state: context.state,
        outputs: [info(`Already at ${runtime.accessLevel} access on this target.`)],
        events: [],
      };
    }

    const next = {
      ...runtime,
      accessLevel: best.grantsAccessLevel,
      detection: applyDetectionDelta(runtime.detection, best.detectionCost),
    };

    return {
      state: withSession(context.state, next),
      outputs: [
        system(`CONNECT  ${host.label}`),
        output(`  Weakness   ${best.id}`),
        output(`  Access     ${runtime.accessLevel} → ${best.grantsAccessLevel}`),
        output(`  Trace cost ${String(best.detectionCost)}%`),
        success(`Access raised to ${best.grantsAccessLevel}.`),
      ],
      events: [],
    };
  },
};
