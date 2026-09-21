import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/** Mission 6 — introduces connect; access level now gates retrieval. */
export const restrictedServer: Mission = {
  id: 'restricted-server',
  title: 'Restricted Server',
  organization: 'Meridian Health',
  difficulty: 'moderate',
  briefing:
    'The records node refuses guests. Surface a weakness, raise your access, and pull the retention schedule — the records themselves stay where they are.',
  objectives: [
    {
      id: 'map-meridian',
      description: 'Sweep the estate.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'mer-records-01' }],
    },
    {
      id: 'surface-weakness',
      description: 'Surface a weakness on the records node.',
      optional: false,
      completedWhen: [{ type: 'vulnerability-found', vulnerabilityId: 'mer-shared-session' }],
    },
    {
      id: 'raise-access',
      description: 'Reach user access.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'surface-weakness' },
        { type: 'access-level-at-least', level: 'user' },
      ],
    },
    {
      id: 'retrieve-schedule',
      description: 'Retrieve the retention schedule.',
      optional: false,
      completedWhen: [{ type: 'file-retrieved', fileId: 'mer-schedule' }],
    },
  ],
  target: {
    id: 'meridian-health',
    organization: 'Meridian Health',
    domain: 'meridian.internal',
    hosts: [
      defineHost({
        id: 'mer-front-01',
        label: 'reception',
        address: '203.0.113.40',
        ports: [{ number: 443, state: 'open', service: 'mer-portal' }],
        services: [
          {
            id: 'mer-portal',
            name: 'booking-portal',
            version: '8.2.0',
            banner: 'Meridian Booking 8.2.0',
          },
        ],
        logs: [{ at: 'D1 08:30', severity: 'info', message: 'booking portal healthy' }],
      }),
      defineHost({
        id: 'mer-records-01',
        label: 'records-node',
        address: '203.0.113.52',
        ports: [
          { number: 9200, state: 'open', service: 'mer-records' },
          { number: 22, state: 'filtered' },
        ],
        services: [
          {
            id: 'mer-records',
            name: 'records-index',
            version: '3.3.1',
            banner: 'Meridian Records Index 3.3.1',
            weaknesses: ['mer-shared-session'],
          },
        ],
        weaknesses: [
          {
            id: 'mer-shared-session',
            label: 'Shared staff session',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'user',
            trace: 20,
            tool: 'basic-scanner',
          },
        ],
        files: [
          {
            id: 'mer-schedule',
            name: 'retention-schedule.txt',
            sizeBytes: 1280,
            access: 'user',
            contents: 'Fictional retention policy rows. No records are included.',
          },
        ],
        logs: [
          { at: 'D1 09:10', severity: 'notice', message: 'shared staff session reused on ward 4' },
          { at: 'D2 02:22', severity: 'warning', message: 'index queried outside ward hours' },
        ],
      }),
    ],
  },
  availableCommandIds: [
    'scan',
    'ports',
    'analyze',
    'inspect',
    'logs',
    'connect',
    'download',
    'escape',
  ],
  requiredToolIds: ['basic-scanner'],
  puzzles: [],
  detectionRules: [{ commandId: 'connect', cost: 8 }],
  reward: {
    xp: 450,
    credits: 880,
    reputation: 12,
    toolIds: [],
    achievementIds: [],
  },
  unlock: { minimumLevel: 3, requiredMissionIds: ['suspicious-logs'], requiredToolIds: ['decoder'] },
};
