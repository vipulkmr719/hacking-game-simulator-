import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/**
 * Mission 8 — the target watches.
 *
 * Every action costs far more trace than usual, and a required objective holds
 * the player under a ceiling. Because objective completion is derived rather
 * than latched, going loud loses that objective and blocks extraction until
 * the run is quiet again — which, with trace only rising, means restarting.
 */
export const securityAi: Mission = {
  id: 'security-ai',
  title: 'Security AI',
  organization: 'Cassian Defence',
  difficulty: 'high',
  briefing:
    'Cassian runs an adaptive monitor. It notices everything, and it notices faster than anyone you have worked against. Get in, take the model card, and be gone under 80%.',
  objectives: [
    {
      id: 'map-cassian',
      description: 'Sweep the estate.',
      optional: false,
      completedWhen: [{ type: 'host-scanned', hostId: 'cas-monitor-01' }],
    },
    {
      id: 'identify-monitor',
      description: 'Identify the monitor service.',
      optional: false,
      completedWhen: [{ type: 'service-identified', serviceId: 'cas-monitor' }],
    },
    {
      id: 'raise-access',
      description: 'Reach user access.',
      optional: false,
      completedWhen: [{ type: 'access-level-at-least', level: 'user' }],
    },
    {
      id: 'take-card',
      description: 'Retrieve the model card.',
      optional: false,
      completedWhen: [{ type: 'file-retrieved', fileId: 'cas-model-card' }],
    },
    {
      id: 'stay-under',
      description: 'Hold trace below 80% at extraction.',
      optional: false,
      completedWhen: [{ type: 'detection-below', value: 80 }],
    },
  ],
  target: {
    id: 'cassian-defence',
    organization: 'Cassian Defence',
    domain: 'cassian.sim',
    hosts: [
      defineHost({
        id: 'cas-monitor-01',
        label: 'monitor-node',
        address: '198.51.100.77',
        ports: [
          { number: 8443, state: 'open', service: 'cas-monitor' },
          { number: 9100, state: 'filtered' },
        ],
        services: [
          {
            id: 'cas-monitor',
            name: 'adaptive-monitor',
            version: '1.9.0',
            banner: 'Cassian Adaptive Monitor 1.9.0',
            weaknesses: ['cas-model-drift'],
          },
        ],
        weaknesses: [
          {
            id: 'cas-model-drift',
            label: 'Monitor drift window',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'user',
            trace: 18,
            tool: 'stealth-module',
          },
        ],
        files: [
          {
            id: 'cas-model-card',
            name: 'model-card.md',
            sizeBytes: 6400,
            access: 'user',
            contents: 'Fictional model card for the training monitor.',
          },
        ],
        logs: [
          { at: 'D1 00:05', severity: 'notice', message: 'monitor retrained on last week window' },
          { at: 'D1 00:06', severity: 'warning', message: 'drift window widened during retrain' },
          { at: 'D2 06:30', severity: 'alert', message: 'unscheduled query burst flagged' },
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
  requiredToolIds: ['stealth-module'],
  puzzles: [],
  detectionRules: [
    { commandId: 'scan', cost: 16 },
    { commandId: 'ports', cost: 12 },
    { commandId: 'analyze', cost: 14 },
    { commandId: 'inspect', cost: 6 },
    { commandId: 'logs', cost: 10 },
    { commandId: 'download', cost: 18 },
  ],
  reward: { xp: 750, credits: 1500, reputation: 18, toolIds: [], achievementIds: ['ghost'] },
  unlock: {
    minimumLevel: 5,
    requiredMissionIds: ['corporate-network'],
    requiredToolIds: ['stealth-module'],
  },
};
