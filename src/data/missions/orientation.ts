/**
 * Reference mission.
 *
 * This exists to prove the Mission schema holds together and to give Phase 3 a
 * template. It is not wired into gameplay yet — no mission engine runs it.
 *
 * Every identifier is invented. `acme.local` does not resolve, and the
 * addresses are RFC 5737 documentation addresses, reserved so they can never
 * route anywhere.
 */
import { EMPTY_REWARD } from '../../game/rewards/rewards';
import type { Mission } from '../../game/missions/types';

export const orientationMission: Mission = {
  id: 'orientation',
  title: 'Cold Open',
  organization: 'Acme Dynamics',
  difficulty: 'trivial',
  briefing:
    'A training contract. Map the perimeter host, identify the exposed service, and withdraw before the trace completes.',
  objectives: [
    {
      id: 'map-perimeter',
      description: 'Scan the perimeter host.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'acme-edge-01' }],
    },
    {
      id: 'identify-service',
      description: 'Identify the service behind the open port.',
      optional: false,
      completedWhen: [{ type: 'service-identified', serviceId: 'acme-gateway' }],
    },
    {
      id: 'stay-quiet',
      description: 'Finish with trace below 50%.',
      optional: true,
      completedWhen: [{ type: 'detection-below', value: 50 }],
    },
  ],
  target: {
    id: 'acme-dynamics',
    organization: 'Acme Dynamics',
    domain: 'acme.local',
    hosts: [
      {
        id: 'acme-edge-01',
        label: 'edge-gateway',
        address: '192.0.2.10',
        ports: [
          { id: 'acme-edge-01-p443', number: 443, state: 'open', serviceId: 'acme-gateway' },
          { id: 'acme-edge-01-p22', number: 22, state: 'filtered', serviceId: null },
        ],
        services: [
          {
            id: 'acme-gateway',
            name: 'perimeter-gateway',
            version: '2.4.1',
            banner: 'ACME Perimeter Gateway 2.4.1',
            vulnerabilityIds: ['acme-weak-session'],
          },
        ],
        vulnerabilities: [
          {
            id: 'acme-weak-session',
            label: 'Weak session handling',
            description:
              'A fictional weakness in the training gateway. Referenced by id only; no technique is described or implemented.',
            requiredToolId: 'basic-scanner',
            grantsAccessLevel: 'guest',
            detectionCost: 12,
          },
        ],
        files: [
          {
            id: 'acme-welcome',
            name: 'welcome.txt',
            sizeBytes: 184,
            encrypted: false,
            requiredAccessLevel: 'guest',
            contents: 'Training environment. Nothing here is real.',
          },
        ],
      },
    ],
  },
  availableCommandIds: ['help', 'clear', 'status'],
  requiredToolIds: ['basic-scanner'],
  puzzles: [],
  detectionRules: [],
  reward: { ...EMPTY_REWARD, xp: 120, credits: 250, reputation: 5 },
  unlock: { minimumLevel: 1, requiredMissionIds: [], requiredToolIds: [] },
};
