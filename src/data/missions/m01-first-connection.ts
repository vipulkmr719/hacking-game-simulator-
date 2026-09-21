import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/**
 * Mission 1 — teaches scan, ports, analyze.
 *
 * Fictional throughout. `acme.local` does not resolve; addresses are RFC 5737
 * documentation addresses, reserved so they cannot route.
 */
export const firstConnection: Mission = {
  id: 'first-connection',
  title: 'First Connection',
  organization: 'Acme Dynamics',
  difficulty: 'trivial',
  briefing:
    'A training contract. Map the perimeter, identify what is listening, and leave before anyone notices you were curious.',
  objectives: [
    {
      id: 'map-perimeter',
      description: 'Sweep the target for hosts.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'acme-edge-01' }],
    },
    {
      id: 'identify-service',
      description: 'Identify the gateway service.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'map-perimeter' },
        { type: 'service-identified', serviceId: 'acme-gateway' },
      ],
    },
    {
      id: 'stay-quiet',
      description: 'Extract with trace below 50%.',
      optional: true,
      completedWhen: [{ type: 'detection-below', value: 50 }],
    },
  ],
  target: {
    id: 'acme-dynamics',
    organization: 'Acme Dynamics',
    domain: 'acme.local',
    hosts: [
      defineHost({
        id: 'acme-edge-01',
        label: 'edge-gateway',
        address: '192.0.2.10',
        ports: [
          { number: 443, state: 'open', service: 'acme-gateway' },
          { number: 80, state: 'open', service: 'acme-redirect' },
          { number: 22, state: 'filtered' },
        ],
        services: [
          {
            id: 'acme-gateway',
            name: 'perimeter-gateway',
            version: '2.4.1',
            banner: 'ACME Perimeter Gateway 2.4.1',
            weaknesses: ['acme-weak-session'],
          },
          {
            id: 'acme-redirect',
            name: 'http-redirect',
            version: '1.1.0',
            banner: 'ACME Redirector 1.1.0',
          },
        ],
        weaknesses: [
          {
            id: 'acme-weak-session',
            label: 'Weak session handling',
            description:
              'A fictional weakness in the training gateway. Referenced by id only; no technique is described or implemented.',
            grants: 'guest',
            trace: 12,
            tool: 'basic-scanner',
          },
        ],
        files: [
          {
            id: 'acme-welcome',
            name: 'welcome.txt',
            sizeBytes: 184,
            access: 'guest',
            contents: 'Training environment. Nothing here is real.',
          },
        ],
        logs: [
          { at: 'D1 04:12', severity: 'info', message: 'gateway service started' },
          { at: 'D1 09:31', severity: 'notice', message: 'certificate rotated by scheduled task' },
          {
            at: 'D2 02:08',
            severity: 'warning',
            message: 'session token reuse observed from internal range',
          },
        ],
      }),
      defineHost({
        id: 'acme-app-02',
        label: 'app-node',
        address: '192.0.2.24',
        ports: [
          { number: 8080, state: 'open', service: 'acme-portal' },
          { number: 5432, state: 'filtered' },
        ],
        services: [
          {
            id: 'acme-portal',
            name: 'staff-portal',
            version: '3.0.7',
            banner: 'ACME Staff Portal 3.0.7',
            weaknesses: ['acme-stale-token'],
          },
        ],
        weaknesses: [
          {
            id: 'acme-stale-token',
            label: 'Stale access token',
            description:
              'A fictional weakness used by the puzzle layer. It names a game mechanic, not a technique.',
            grants: 'user',
            trace: 18,
            tool: 'basic-scanner',
          },
        ],
        files: [
          {
            id: 'acme-roster',
            name: 'roster.csv',
            sizeBytes: 2048,
            encrypted: true,
            access: 'user',
            contents: 'Encrypted training data.',
          },
        ],
        logs: [
          { at: 'D1 06:45', severity: 'info', message: 'portal worker pool resized to 4' },
          {
            at: 'D2 01:55',
            severity: 'alert',
            message: 'repeated failed portal sign-in, source suppressed',
          },
        ],
      }),
      defineHost({
        id: 'acme-archive-03',
        label: 'archive',
        address: '192.0.2.41',
        ports: [
          { number: 445, state: 'filtered' },
          { number: 21, state: 'closed' },
        ],
        files: [
          {
            id: 'acme-ledger',
            name: 'ledger.enc',
            sizeBytes: 51200,
            encrypted: true,
            access: 'elevated',
            contents: 'Encrypted training data.',
          },
        ],
        logs: [{ at: 'D0 23:10', severity: 'notice', message: 'archive mounted read-only' }],
      }),
    ],
  },
  availableCommandIds: ['scan', 'ports', 'analyze', 'inspect', 'logs', 'escape'],
  requiredToolIds: ['basic-scanner'],
  puzzles: [],
  detectionRules: [],
  reward: { xp: 120, credits: 250, reputation: 5, toolIds: [], achievementIds: [] },
  unlock: { minimumLevel: 1, requiredMissionIds: [], requiredToolIds: [] },
};
