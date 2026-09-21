import {
  STEALTH_ACTIONS_PER_CONTRACT,
  STEALTH_TRACE_RECOVERY,
  applyDetectionDelta,
  formatTrace,
} from '../../detection/detection';
import { threatBandFor } from '../../detection/threat';
import { resolveSession, withSession } from '../../missions/session';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

/**
 * The stealth action: sit still and let the trail cool.
 *
 * The only way to lower trace. It is capped per contract because an uncapped
 * reduction would make the meter meaningless — a player could undo any cost by
 * spending a turn. Three uses makes it a resource to spend at the right
 * moment rather than a reset button.
 *
 * Nothing is evaded. The command subtracts a number from a number in game
 * state; no traffic is shaped, delayed, or disguised, because there is no
 * traffic.
 */
export const waitCommand: CommandSpec = {
  id: 'wait',
  name: 'wait',
  aliases: ['hold'],
  summary: 'Go quiet and let the trace cool. Limited uses per contract.',
  usage: 'wait',
  args: [],
  requiresActiveMission: true,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const session = resolveSession(context.state, context.deps);
    if (session === null) {
      return { state: context.state, outputs: [error('No target is loaded.')], events: [] };
    }

    const { runtime } = session;
    const remaining = STEALTH_ACTIONS_PER_CONTRACT - runtime.stealthActionsUsed;

    if (remaining <= 0) {
      return {
        state: context.state,
        outputs: [
          error('No stealth actions left on this contract.'),
          info('Extract, or finish what you started.'),
        ],
        events: [],
      };
    }

    if (runtime.detection === 0) {
      return {
        state: context.state,
        outputs: [info('Trace is already at zero. Nothing to cool.')],
        events: [],
      };
    }

    const before = runtime.detection;
    const after = applyDetectionDelta(before, -STEALTH_TRACE_RECOVERY);
    const next = { ...runtime, detection: after, stealthActionsUsed: runtime.stealthActionsUsed + 1 };

    return {
      state: withSession(context.state, next),
      outputs: [
        system('GOING QUIET'),
        output(`  Trace      ${String(before)}% → ${String(after)}%`),
        output(`  Remaining  ${String(remaining - 1)} stealth action(s)`),
        success(`${formatTrace(after)}  ${threatBandFor(after).label}`),
      ],
      events: [{ type: 'DETECTION_CHANGED', previous: before, current: after }],
    };
  },
};
