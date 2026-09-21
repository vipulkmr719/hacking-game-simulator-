import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/** Mission 5 — the answer is in the log, not the banner. */
export const suspiciousLogs: Mission = {
  id: 'suspicious-logs',
  title: 'Suspicious Logs',
  organization: 'Blackstone Logistics',
  difficulty: 'moderate',
  briefing:
    'Blackstone had an incident they will not describe. Read the dispatch log, work out what the night shift called the job, and pull the manifest.',
  objectives: [
    {
      id: 'map-yard',
      description: 'Sweep the yard estate.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'black-dispatch-01' }],
    },
    {
      id: 'identify-dispatch',
      description: 'Identify the dispatch service.',
      optional: false,
      completedWhen: [{ type: 'service-identified', serviceId: 'black-dispatch' }],
    },
    {
      id: 'name-the-job',
      description: 'Answer the manifest challenge.',
      optional: false,
      completedWhen: [{ type: 'puzzle-solved', puzzleId: 'black-manifest' }],
    },
    {
      id: 'retrieve-manifest',
      description: 'Retrieve the night manifest.',
      optional: false,
      completedWhen: [{ type: 'file-retrieved', fileId: 'black-manifest-file' }],
    },
    {
      id: 'clean-exit',
      description: 'Extract with trace below 60%.',
      optional: true,
      completedWhen: [{ type: 'detection-below', value: 60 }],
    },
  ],
  target: {
    id: 'blackstone',
    organization: 'Blackstone Logistics',
    domain: 'blackstone.local',
    hosts: [
      defineHost({
        id: 'black-dispatch-01',
        label: 'dispatch',
        address: '198.51.100.31',
        ports: [
          { number: 8600, state: 'open', service: 'black-dispatch' },
          { number: 445, state: 'filtered' },
        ],
        services: [
          {
            id: 'black-dispatch',
            name: 'dispatch-board',
            version: '2.0.9',
            banner: 'Blackstone Dispatch Board 2.0.9',
            weaknesses: ['black-open-board'],
          },
        ],
        weaknesses: [
          {
            id: 'black-open-board',
            label: 'Board readable without sign-in',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'guest',
            trace: 13,
            tool: 'basic-scanner',
          },
        ],
        files: [
          {
            id: 'black-manifest-file',
            name: 'night-manifest.dat',
            sizeBytes: 4096,
            encrypted: true,
            // Gated by the manifest challenge, not by access; this mission
            // offers no connect.
            access: 'none',
            puzzleId: 'black-manifest',
            contents: 'Fictional manifest rows for the training yard.',
          },
        ],
        logs: [
          { at: 'D1 22:05', severity: 'info', message: 'night shift board opened' },
          {
            at: 'D1 23:40',
            severity: 'notice',
            message: 'manifest filed under job name HARBOUR by night shift',
          },
          { at: 'D2 00:15', severity: 'warning', message: 'board left readable after shift end' },
          { at: 'D2 04:02', severity: 'alert', message: 'manifest accessed without sign-in' },
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
      id: 'black-manifest',
      kind: 'pattern',
      prompt: 'What job name did the night shift file the manifest under?',
      solution: 'harbour',
      hint: 'Read the dispatch host log.',
      attemptsAllowed: 5,
      failureDetectionCost: 8,
    },
  ],
  detectionRules: [{ commandId: 'logs', cost: 2 }],
  reward: { xp: 380, credits: 720, reputation: 11, toolIds: [], achievementIds: ['log-reader'] },
  unlock: { minimumLevel: 2, requiredMissionIds: ['encrypted-archive'], requiredToolIds: [] },
};
