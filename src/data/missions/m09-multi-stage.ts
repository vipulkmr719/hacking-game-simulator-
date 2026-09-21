import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/**
 * Mission 9 — strict ordering.
 *
 * Every objective after the first is gated on its predecessor, so the chain
 * can only be satisfied in sequence even if a later condition happens to be
 * true early.
 */
export const multiStageOperation: Mission = {
  id: 'multi-stage-operation',
  title: 'Multi-Stage Operation',
  organization: 'Sable Freight',
  difficulty: 'severe',
  briefing:
    'Four stages, in order. Sable rotates its dock cipher every shift, and the rotation is only readable once you are inside the yard controller.',
  objectives: [
    {
      id: 'stage-1-map',
      description: 'Stage 1 — sweep the estate.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'sable-yard-01' }],
    },
    {
      id: 'stage-2-identify',
      description: 'Stage 2 — identify the yard controller.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'stage-1-map' },
        { type: 'service-identified', serviceId: 'sable-yard' },
      ],
    },
    {
      id: 'stage-3-access',
      description: 'Stage 3 — reach user access.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'stage-2-identify' },
        { type: 'access-level-at-least', level: 'user' },
      ],
    },
    {
      id: 'stage-4-cipher',
      description: 'Stage 4 — solve the dock cipher.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'stage-3-access' },
        { type: 'puzzle-solved', puzzleId: 'sable-dock' },
      ],
    },
    {
      id: 'stage-5-retrieve',
      description: 'Stage 5 — retrieve the rotation table.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'stage-4-cipher' },
        { type: 'file-retrieved', fileId: 'sable-rotation' },
      ],
    },
  ],
  target: {
    id: 'sable-freight',
    organization: 'Sable Freight',
    domain: 'sable.local',
    hosts: [
      defineHost({
        id: 'sable-gate-00',
        label: 'gatehouse',
        address: '203.0.113.80',
        ports: [{ number: 443, state: 'open', service: 'sable-gate' }],
        services: [
          {
            id: 'sable-gate',
            name: 'gatehouse-portal',
            version: '3.1.0',
            banner: 'Sable Gatehouse 3.1.0',
          },
        ],
        logs: [{ at: 'D1 05:00', severity: 'info', message: 'gatehouse shift change' }],
      }),
      defineHost({
        id: 'sable-yard-01',
        label: 'yard-controller',
        address: '203.0.113.91',
        ports: [
          { number: 7000, state: 'open', service: 'sable-yard' },
          { number: 7001, state: 'filtered' },
        ],
        services: [
          {
            id: 'sable-yard',
            name: 'yard-controller',
            version: '12.6.0',
            banner: 'Sable Yard Controller 12.6.0',
            weaknesses: ['sable-shift-token'],
          },
        ],
        weaknesses: [
          {
            id: 'sable-shift-token',
            label: 'Shift token not rotated',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'user',
            trace: 22,
            tool: 'advanced-scanner',
          },
        ],
        files: [
          {
            id: 'sable-rotation',
            name: 'rotation.tbl',
            sizeBytes: 12800,
            encrypted: true,
            access: 'user',
            puzzleId: 'sable-dock',
            contents: 'Fictional dock rotation table for the training yard.',
          },
        ],
        logs: [
          { at: 'D1 05:02', severity: 'notice', message: 'dock cipher set to keyword SABLE-NINE' },
          { at: 'D2 03:30', severity: 'warning', message: 'shift token reused across two shifts' },
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
    'solve',
    'download',
    'escape',
  ],
  requiredToolIds: ['advanced-scanner'],
  puzzles: [
    {
      id: 'sable-dock',
      kind: 'sequence',
      prompt: 'What keyword is the dock cipher set to this shift?',
      solution: 'sable-nine',
      hint: 'The yard controller log records it at shift change.',
      attemptsAllowed: 4,
      failureDetectionCost: 12,
    },
  ],
  detectionRules: [
    { commandId: 'connect', cost: 12 },
    { commandId: 'download', cost: 12 },
  ],
  reward: {
    xp: 900,
    credits: 1900,
    reputation: 22,
    toolIds: [],
    achievementIds: [],
  },
  unlock: {
    minimumLevel: 6,
    requiredMissionIds: ['security-ai'],
    // sable-shift-token needs the Advanced Scanner for stage three.
    requiredToolIds: ['stealth-module', 'advanced-scanner', 'decoder'],
  },
};
