import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/** Mission 3 — a service on a port that looks uninteresting. */
export const hiddenService: Mission = {
  id: 'hidden-service',
  title: 'Hidden Service',
  organization: 'Helix Labs',
  difficulty: 'low',
  briefing:
    'Helix Labs insists nothing runs on the research node. Their own port table disagrees. Find the service nobody documented.',
  objectives: [
    {
      id: 'map-lab',
      description: 'Sweep the lab estate.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'helix-research-02' }],
    },
    {
      id: 'enumerate-research',
      description: 'Enumerate the research node.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'map-lab' },
        { type: 'port-discovered', portId: 'helix-research-02-p7717' },
      ],
    },
    {
      id: 'identify-vault',
      description: 'Identify the undocumented service.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'enumerate-research' },
        { type: 'service-identified', serviceId: 'helix-vault' },
      ],
    },
    {
      id: 'surface-weakness',
      description: 'Surface a weakness on it.',
      optional: false,
      completedWhen: [{ type: 'vulnerability-found', vulnerabilityId: 'helix-open-index' }],
    },
  ],
  target: {
    id: 'helix-labs',
    organization: 'Helix Labs',
    domain: 'helix.internal',
    hosts: [
      defineHost({
        id: 'helix-front-01',
        label: 'front-desk',
        address: '203.0.113.7',
        ports: [
          { number: 443, state: 'open', service: 'helix-site' },
          { number: 25, state: 'closed' },
        ],
        services: [
          {
            id: 'helix-site',
            name: 'public-site',
            version: '4.0.0',
            banner: 'Helix Labs Public 4.0.0',
          },
        ],
        logs: [{ at: 'D1 10:00', severity: 'info', message: 'site deploy complete' }],
      }),
      defineHost({
        id: 'helix-research-02',
        label: 'research-node',
        address: '203.0.113.19',
        ports: [
          { number: 7717, state: 'open', service: 'helix-vault' },
          { number: 443, state: 'filtered' },
          { number: 3000, state: 'closed' },
        ],
        services: [
          {
            id: 'helix-vault',
            name: 'sample-vault',
            version: '0.4.0-rc2',
            banner: 'Helix Sample Vault 0.4.0-rc2 (internal build)',
            weaknesses: ['helix-open-index'],
          },
        ],
        weaknesses: [
          {
            id: 'helix-open-index',
            label: 'Unlisted index exposed',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'guest',
            trace: 16,
            tool: 'basic-scanner',
          },
        ],
        files: [
          {
            id: 'helix-index',
            name: 'index.json',
            sizeBytes: 980,
            access: 'guest',
            contents: 'Fictional sample index for the training vault.',
          },
        ],
        logs: [
          { at: 'D0 22:40', severity: 'notice', message: 'vault started in internal build mode' },
          { at: 'D2 05:03', severity: 'warning', message: 'index served without listing control' },
        ],
      }),
    ],
  },
  availableCommandIds: ['scan', 'ports', 'analyze', 'inspect', 'logs', 'escape'],
  requiredToolIds: ['basic-scanner'],
  puzzles: [],
  detectionRules: [],
  reward: {
    xp: 220,
    credits: 450,
    reputation: 8,
    toolIds: ['advanced-scanner'],
    achievementIds: [],
  },
  unlock: { minimumLevel: 1, requiredMissionIds: ['open-ports'], requiredToolIds: [] },
};
