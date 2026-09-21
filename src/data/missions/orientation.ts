/**
 * Training target.
 *
 * Deterministic mock data: fixed hosts, fixed ports, fixed log timestamps.
 * Nothing here is generated at runtime, so the same commands always produce
 * the same output and tests can assert on exact strings.
 *
 * Every identifier is invented. `acme.local` does not resolve, and the
 * addresses are RFC 5737 documentation addresses, reserved so they can never
 * route anywhere. A boundary test enforces both.
 *
 * The mission's objectives and reward are declared but not yet evaluated —
 * the mission engine is a later phase. Only `target` is read today, by the
 * recon commands.
 */
import { EMPTY_REWARD } from '../../game/rewards/rewards';
import type { Mission } from '../../game/missions/types';

export const orientationMission: Mission = {
  id: 'orientation',
  title: 'Cold Open',
  organization: 'Acme Dynamics',
  difficulty: 'trivial',
  briefing:
    'A training contract. Map the perimeter, identify what is listening, and read the room before anyone reads you.',
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
          { id: 'acme-edge-01-p80', number: 80, state: 'open', serviceId: 'acme-redirect' },
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
          {
            id: 'acme-redirect',
            name: 'http-redirect',
            version: '1.1.0',
            banner: 'ACME Redirector 1.1.0',
            vulnerabilityIds: [],
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
        logs: [
          {
            id: 'acme-edge-01-l1',
            timestamp: 'D1 04:12',
            severity: 'info',
            message: 'gateway service started',
          },
          {
            id: 'acme-edge-01-l2',
            timestamp: 'D1 09:31',
            severity: 'notice',
            message: 'certificate rotated by scheduled task',
          },
          {
            id: 'acme-edge-01-l3',
            timestamp: 'D2 02:08',
            severity: 'warning',
            message: 'session token reuse observed from internal range',
          },
        ],
      },
      {
        id: 'acme-app-02',
        label: 'app-node',
        address: '192.0.2.24',
        ports: [
          { id: 'acme-app-02-p8080', number: 8080, state: 'open', serviceId: 'acme-portal' },
          { id: 'acme-app-02-p5432', number: 5432, state: 'filtered', serviceId: null },
        ],
        services: [
          {
            id: 'acme-portal',
            name: 'staff-portal',
            version: '3.0.7',
            banner: 'ACME Staff Portal 3.0.7',
            vulnerabilityIds: ['acme-stale-token'],
          },
        ],
        vulnerabilities: [
          {
            id: 'acme-stale-token',
            label: 'Stale access token',
            description:
              'A fictional weakness used by the puzzle layer. It names a game mechanic, not a technique.',
            requiredToolId: 'basic-scanner',
            grantsAccessLevel: 'user',
            detectionCost: 18,
          },
        ],
        files: [
          {
            id: 'acme-roster',
            name: 'roster.csv',
            sizeBytes: 2048,
            encrypted: true,
            requiredAccessLevel: 'user',
            contents: 'Encrypted training data.',
          },
        ],
        logs: [
          {
            id: 'acme-app-02-l1',
            timestamp: 'D1 06:45',
            severity: 'info',
            message: 'portal worker pool resized to 4',
          },
          {
            id: 'acme-app-02-l2',
            timestamp: 'D2 01:55',
            severity: 'alert',
            message: 'repeated failed portal sign-in, source suppressed',
          },
        ],
      },
      {
        id: 'acme-archive-03',
        label: 'archive',
        address: '192.0.2.41',
        ports: [
          { id: 'acme-archive-03-p445', number: 445, state: 'filtered', serviceId: null },
          { id: 'acme-archive-03-p21', number: 21, state: 'closed', serviceId: null },
        ],
        services: [],
        vulnerabilities: [],
        files: [
          {
            id: 'acme-ledger',
            name: 'ledger.enc',
            sizeBytes: 51200,
            encrypted: true,
            requiredAccessLevel: 'elevated',
            contents: 'Encrypted training data.',
          },
        ],
        logs: [
          {
            id: 'acme-archive-03-l1',
            timestamp: 'D0 23:10',
            severity: 'notice',
            message: 'archive mounted read-only',
          },
        ],
      },
    ],
  },
  availableCommandIds: ['help', 'clear', 'status', 'inventory', 'scan', 'ports', 'analyze', 'inspect', 'logs'],
  requiredToolIds: ['basic-scanner'],
  puzzles: [],
  detectionRules: [],
  reward: { ...EMPTY_REWARD, xp: 120, credits: 250, reputation: 5 },
  unlock: { minimumLevel: 1, requiredMissionIds: [], requiredToolIds: [] },
};
