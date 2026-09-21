import { formatTrace } from '../../detection/detection';
import { XP_PER_LEVEL, xpIntoCurrentLevel, xpUntilNextLevel } from '../../progression/progression';
import { info, output, system } from '../../terminal/types';
import type { CommandSpec } from '../types';

export const statusCommand: CommandSpec = {
  id: 'status',
  name: 'status',
  aliases: ['stat'],
  summary: 'Show operator level, credits, reputation and trace.',
  usage: 'status',
  args: [],
  requiresActiveMission: false,
  requiredAccessLevel: 'none',
  requiredToolId: null,
  detectionCost: 0,
  run: (context) => {
    const { player, activeMission } = context.state;
    const lines = [
      system('OPERATOR STATUS'),
      output(`  Level        ${String(player.level)}`),
      output(
        `  XP           ${String(player.xp)} (${String(xpIntoCurrentLevel(player.xp))}/${String(XP_PER_LEVEL)} — ${String(xpUntilNextLevel(player.xp))} to next)`,
      ),
      output(`  Credits      ${String(player.credits)}`),
      output(`  Reputation   ${String(player.reputation)}`),
      output(`  Tools        ${String(player.unlockedToolIds.length)} unlocked`),
      output(`  Missions     ${String(player.statistics.missionsCompleted)} completed`),
      output(`  Commands     ${String(player.statistics.commandsExecuted)} executed`),
    ];

    if (activeMission === null) {
      lines.push(info('No active mission.'));
    } else {
      lines.push(
        system('ACTIVE MISSION'),
        output(`  Mission      ${activeMission.missionId}`),
        output(`  Status       ${activeMission.status}`),
        output(`  Access       ${activeMission.accessLevel}`),
        output(`  ${formatTrace(activeMission.detection)}`),
      );
    }

    return { state: context.state, outputs: lines, events: [] };
  },
};
