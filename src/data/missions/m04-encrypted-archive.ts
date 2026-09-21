import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/** Mission 4 — introduces puzzles and retrieval. */
export const encryptedArchive: Mission = {
  id: 'encrypted-archive',
  title: 'Encrypted Archive',
  organization: 'Orion Systems',
  difficulty: 'moderate',
  briefing:
    'Orion keeps a sealed archive its own staff cannot open. The cipher is a shift of three — the banner tells you the rest. Bring the file out.',
  objectives: [
    {
      id: 'map-orion',
      description: 'Sweep the Orion estate.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'orion-vault-01' }],
    },
    {
      id: 'identify-archive',
      description: 'Identify the archive service.',
      optional: false,
      completedWhen: [{ type: 'service-identified', serviceId: 'orion-archive' }],
    },
    {
      id: 'break-cipher',
      description: 'Solve the archive cipher.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'identify-archive' },
        { type: 'puzzle-solved', puzzleId: 'orion-cipher' },
      ],
    },
    {
      id: 'retrieve-archive',
      description: 'Retrieve the sealed archive.',
      optional: false,
      completedWhen: [{ type: 'file-retrieved', fileId: 'orion-sealed' }],
    },
  ],
  target: {
    id: 'orion-systems',
    organization: 'Orion Systems',
    domain: 'orion.corp',
    hosts: [
      defineHost({
        id: 'orion-vault-01',
        label: 'vault-node',
        address: '192.0.2.70',
        ports: [
          { number: 9443, state: 'open', service: 'orion-archive' },
          { number: 22, state: 'filtered' },
        ],
        services: [
          {
            id: 'orion-archive',
            name: 'archive-service',
            version: '6.1.3',
            banner: 'Orion Archive 6.1.3 — cipher hint: WKUHH (shift of three)',
            weaknesses: ['orion-legacy-cipher'],
          },
        ],
        weaknesses: [
          {
            id: 'orion-legacy-cipher',
            label: 'Legacy cipher retained',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'guest',
            trace: 15,
            tool: 'basic-scanner',
          },
        ],
        files: [
          {
            id: 'orion-sealed',
            name: 'sealed.arc',
            sizeBytes: 8192,
            encrypted: true,
            // The cipher is the only gate here; access escalation arrives in
            // "Restricted Server", and this mission offers no connect.
            access: 'none',
            puzzleId: 'orion-cipher',
            contents: 'Fictional archive contents. Nothing real is stored here.',
          },
          {
            id: 'orion-readme',
            name: 'readme.txt',
            sizeBytes: 220,
            access: 'none',
            contents: 'Archive sealed pending cipher migration. Fictional.',
          },
        ],
        logs: [
          { at: 'D1 03:20', severity: 'notice', message: 'archive sealed by migration job' },
          { at: 'D1 03:21', severity: 'info', message: 'cipher hint left in service banner' },
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
    'solve',
    'download',
    'escape',
  ],
  requiredToolIds: ['basic-scanner'],
  puzzles: [
    {
      id: 'orion-cipher',
      kind: 'cipher',
      prompt: 'The banner reads WKUHH under a shift of three. What is the plaintext?',
      // A game answer checked by string compare. Not a credential.
      solution: 'three',
      hint: 'Shift each letter back by three.',
      attemptsAllowed: 4,
      failureDetectionCost: 9,
    },
  ],
  detectionRules: [],
  reward: { xp: 320, credits: 640, reputation: 10, toolIds: ['decoder'], achievementIds: [] },
  unlock: {
    minimumLevel: 2,
    requiredMissionIds: ['hidden-service'],
    requiredToolIds: ['advanced-scanner'],
  },
};
