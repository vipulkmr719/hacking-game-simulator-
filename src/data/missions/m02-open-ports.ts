import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/** Mission 2 — enumeration across more than one host. */
export const openPorts: Mission = {
  id: 'open-ports',
  title: 'Open Ports',
  organization: 'NovaBank',
  difficulty: 'low',
  briefing:
    'NovaBank wants its own perimeter audited. Two hosts, one of them louder than it should be. Find what the edge is hiding behind the core.',
  objectives: [
    {
      id: 'map-estate',
      description: 'Sweep the estate.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'nova-core-02' }],
    },
    {
      id: 'enumerate-core',
      description: 'Enumerate the core host.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'map-estate' },
        { type: 'port-discovered', portId: 'nova-core-02-p8443' },
      ],
    },
    {
      id: 'identify-ledger',
      description: 'Identify the ledger service.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'enumerate-core' },
        { type: 'service-identified', serviceId: 'nova-ledger' },
      ],
    },
    {
      id: 'quiet-audit',
      description: 'Extract with trace below 45%.',
      optional: true,
      completedWhen: [{ type: 'detection-below', value: 45 }],
    },
  ],
  target: {
    id: 'novabank',
    organization: 'NovaBank',
    domain: 'novabank.sim',
    hosts: [
      defineHost({
        id: 'nova-edge-01',
        label: 'edge-proxy',
        address: '198.51.100.5',
        ports: [
          { number: 443, state: 'open', service: 'nova-proxy' },
          { number: 8080, state: 'closed' },
        ],
        services: [
          {
            id: 'nova-proxy',
            name: 'edge-proxy',
            version: '5.2.0',
            banner: 'NovaBank Edge Proxy 5.2.0',
          },
        ],
        logs: [
          { at: 'D1 08:00', severity: 'info', message: 'proxy config reloaded' },
          { at: 'D1 08:02', severity: 'notice', message: 'upstream core-02 registered' },
        ],
      }),
      defineHost({
        id: 'nova-core-02',
        label: 'core-ledger',
        address: '198.51.100.12',
        ports: [
          { number: 8443, state: 'open', service: 'nova-ledger' },
          { number: 9090, state: 'open', service: 'nova-metrics' },
          { number: 22, state: 'filtered' },
        ],
        services: [
          {
            id: 'nova-ledger',
            name: 'ledger-api',
            version: '11.4.2',
            banner: 'NovaBank Ledger API 11.4.2',
            weaknesses: ['nova-verbose-error'],
          },
          {
            id: 'nova-metrics',
            name: 'metrics-exporter',
            version: '0.9.1',
            banner: 'NovaBank Metrics 0.9.1',
          },
        ],
        weaknesses: [
          {
            id: 'nova-verbose-error',
            label: 'Verbose error surface',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'guest',
            trace: 14,
            tool: 'basic-scanner',
          },
        ],
        files: [
          {
            id: 'nova-audit',
            name: 'audit-notes.txt',
            sizeBytes: 640,
            access: 'guest',
            contents: 'Perimeter audit scratch notes. Fictional.',
          },
        ],
        logs: [
          { at: 'D1 07:55', severity: 'info', message: 'ledger api warm' },
          { at: 'D2 03:14', severity: 'warning', message: 'metrics endpoint reachable from edge' },
        ],
      }),
    ],
  },
  availableCommandIds: ['scan', 'ports', 'analyze', 'inspect', 'logs', 'escape'],
  requiredToolIds: ['basic-scanner'],
  puzzles: [],
  detectionRules: [],
  reward: { xp: 160, credits: 320, reputation: 6, toolIds: [], achievementIds: [] },
  unlock: { minimumLevel: 1, requiredMissionIds: ['first-connection'], requiredToolIds: [] },
};
