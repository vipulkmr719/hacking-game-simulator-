import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/** Mission 10 — every mechanic at once, across three hosts. */
export const finalOperation: Mission = {
  id: 'final-operation',
  title: 'Final Operation',
  organization: 'Aegis Consortium',
  difficulty: 'severe',
  briefing:
    'Aegis brokers the contracts everyone else runs. Map the consortium, take the broker relay, break the ledger seal, and walk out with both halves — quietly.',
  objectives: [
    {
      id: 'map-consortium',
      description: 'Sweep all three consortium hosts.',
      optional: false,
      completedWhen: [
        { type: 'host-scanned', hostId: 'aegis-relay-01' },
        { type: 'host-scanned', hostId: 'aegis-ledger-02' },
        { type: 'host-scanned', hostId: 'aegis-vault-03' },
      ],
    },
    {
      id: 'identify-relay',
      description: 'Identify the broker relay.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'map-consortium' },
        { type: 'service-identified', serviceId: 'aegis-relay' },
      ],
    },
    {
      id: 'take-relay',
      description: 'Reach elevated access via the relay.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'identify-relay' },
        { type: 'access-level-at-least', level: 'elevated' },
      ],
    },
    {
      id: 'break-seal',
      description: 'Break the ledger seal.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'take-relay' },
        { type: 'puzzle-solved', puzzleId: 'aegis-seal' },
      ],
    },
    {
      id: 'take-both-halves',
      description: 'Retrieve the ledger and the broker index.',
      optional: false,
      completedWhen: [
        { type: 'file-retrieved', fileId: 'aegis-ledger-file' },
        { type: 'file-retrieved', fileId: 'aegis-index' },
      ],
    },
    {
      id: 'ghost-exit',
      description: 'Extract with trace below 75%.',
      optional: true,
      completedWhen: [{ type: 'detection-below', value: 75 }],
    },
  ],
  target: {
    id: 'aegis-consortium',
    organization: 'Aegis Consortium',
    domain: 'aegis.internal',
    hosts: [
      defineHost({
        id: 'aegis-relay-01',
        label: 'broker-relay',
        address: '192.0.2.200',
        ports: [
          { number: 8443, state: 'open', service: 'aegis-relay' },
          { number: 9000, state: 'open', service: 'aegis-telemetry' },
        ],
        services: [
          {
            id: 'aegis-relay',
            name: 'broker-relay',
            version: '21.0.0',
            banner: 'Aegis Broker Relay 21.0.0 — seal keyword posted at handover',
            weaknesses: ['aegis-relay-trust'],
          },
          {
            id: 'aegis-telemetry',
            name: 'telemetry-sink',
            version: '1.4.0',
            banner: 'Aegis Telemetry 1.4.0',
          },
        ],
        weaknesses: [
          {
            id: 'aegis-relay-trust',
            label: 'Relay trusted by consortium members',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'elevated',
            trace: 26,
            tool: 'analysis-toolkit',
          },
        ],
        files: [
          {
            id: 'aegis-index',
            name: 'broker-index.json',
            sizeBytes: 15360,
            access: 'elevated',
            contents: 'Fictional broker index for the training consortium.',
          },
        ],
        logs: [
          { at: 'D1 12:00', severity: 'notice', message: 'handover posted seal keyword LANTERN' },
          { at: 'D2 07:45', severity: 'warning', message: 'relay identity accepted by ledger-02' },
        ],
      }),
      defineHost({
        id: 'aegis-ledger-02',
        label: 'ledger-node',
        address: '192.0.2.214',
        ports: [
          { number: 7443, state: 'open', service: 'aegis-ledger' },
          { number: 22, state: 'filtered' },
        ],
        services: [
          {
            id: 'aegis-ledger',
            name: 'settlement-ledger',
            version: '18.2.1',
            banner: 'Aegis Settlement Ledger 18.2.1',
          },
        ],
        files: [
          {
            id: 'aegis-ledger-file',
            name: 'settlement.ledger',
            sizeBytes: 204800,
            encrypted: true,
            access: 'elevated',
            puzzleId: 'aegis-seal',
            contents: 'Fictional settlement rows. Nothing real is recorded here.',
          },
        ],
        logs: [
          { at: 'D2 07:46', severity: 'alert', message: 'ledger opened under relay identity' },
        ],
      }),
      defineHost({
        id: 'aegis-vault-03',
        label: 'cold-vault',
        address: '192.0.2.229',
        ports: [
          { number: 445, state: 'filtered' },
          { number: 21, state: 'closed' },
        ],
        logs: [{ at: 'D0 18:00', severity: 'info', message: 'cold vault sealed for the quarter' }],
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
    'solve',
    'download',
    'escape',
  ],
  requiredToolIds: ['analysis-toolkit'],
  puzzles: [
    {
      id: 'aegis-seal',
      kind: 'keypad',
      prompt: 'What keyword was posted at the broker handover?',
      solution: 'lantern',
      hint: 'The relay host log records the handover.',
      attemptsAllowed: 3,
      failureDetectionCost: 15,
    },
  ],
  detectionRules: [
    { commandId: 'scan', cost: 12 },
    { commandId: 'analyze', cost: 10 },
    { commandId: 'connect', cost: 14 },
    { commandId: 'download', cost: 14 },
  ],
  reward: {
    xp: 1400,
    credits: 3000,
    reputation: 35,
    toolIds: [],
    achievementIds: [],
  },
  unlock: {
    minimumLevel: 8,
    requiredMissionIds: ['multi-stage-operation'],
    requiredToolIds: ['analysis-toolkit'],
  },
};
