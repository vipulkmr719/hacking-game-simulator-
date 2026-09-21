import type { Mission } from '../../game/missions/types';
import { firstConnection } from './m01-first-connection';
import { openPorts } from './m02-open-ports';
import { hiddenService } from './m03-hidden-service';
import { encryptedArchive } from './m04-encrypted-archive';
import { suspiciousLogs } from './m05-suspicious-logs';
import { restrictedServer } from './m06-restricted-server';
import { corporateNetwork } from './m07-corporate-network';
import { securityAi } from './m08-security-ai';
import { multiStageOperation } from './m09-multi-stage';
import { finalOperation } from './m10-final-operation';

/**
 * The campaign, in progression order.
 *
 * Each mission's `unlock` names its own prerequisites; the order here is the
 * order they are listed to the player, not the rule that gates them.
 */
export const MISSIONS: readonly Mission[] = [
  firstConnection,
  openPorts,
  hiddenService,
  encryptedArchive,
  suspiciousLogs,
  restrictedServer,
  corporateNetwork,
  securityAi,
  multiStageOperation,
  finalOperation,
];

export const FIRST_MISSION = firstConnection;

export {
  firstConnection,
  openPorts,
  hiddenService,
  encryptedArchive,
  suspiciousLogs,
  restrictedServer,
  corporateNetwork,
  securityAi,
  multiStageOperation,
  finalOperation,
};
