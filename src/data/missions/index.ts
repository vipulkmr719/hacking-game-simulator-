import type { Mission } from '../../game/missions/types';
import { orientationMission } from './orientation';

export const MISSIONS: readonly Mission[] = [orientationMission];

export { orientationMission };
