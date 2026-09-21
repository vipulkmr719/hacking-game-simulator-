import { beginMission } from '../../missions/engine';
import { evaluateAvailability } from '../../missions/unlock';
import { error, info, output, success, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

export const startCommand: CommandSpec = {
  id: 'start',
  name: 'start',
  aliases: ['accept'],
  summary: 'Take a contract and load its target.',
  usage: 'start <mission>',
  args: [{ name: 'mission', required: true, description: 'Mission id from "missions".' }],
  requiresActiveMission: false,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const [id] = context.args;
    if (id === undefined) {
      return { state: context.state, outputs: [error('Name a contract.')], events: [] };
    }

    const mission = context.deps.missions.byId(id.trim().toLowerCase());
    if (mission === null) {
      return {
        state: context.state,
        outputs: [error(`No such contract: ${id}`), info('Run "missions" to list them.')],
        events: [],
      };
    }

    const availability = evaluateAvailability(mission, context.state.player);
    if (availability.status === 'locked') {
      return {
        state: context.state,
        outputs: [
          error(`"${mission.id}" is locked.`),
          ...availability.blockers.map((blocker) => info(`  ${blocker}`)),
        ],
        events: [],
      };
    }

    // Starting always resets the runtime, which is also how a failed mission
    // is retried.
    const runtime = beginMission(mission, context.state.player);

    return {
      state: {
        ...context.state,
        activeMission: runtime,
        player: {
          ...context.state.player,
          statistics: {
            ...context.state.player.statistics,
            missionsAttempted: context.state.player.statistics.missionsAttempted + 1,
          },
        },
      },
      outputs: [
        system(`CONTRACT  ${mission.title}`),
        output(`  Client     ${mission.organization}`),
        output(`  Target     ${mission.target.domain}`),
        output(`  Difficulty ${mission.difficulty}`),
        output(''),
        output(`  ${mission.briefing}`),
        success('Target loaded. Run "brief" for objectives, "scan" to begin.'),
      ],
      events: [{ type: 'MISSION_STARTED', missionId: mission.id }],
    };
  },
};
