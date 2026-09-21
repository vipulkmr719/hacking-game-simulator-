import type { Mission } from '../../game/missions/types';
import { defineHost } from './builders';

/** Mission 7 — pivot: the weakness is on one host, the prize on another. */
export const corporateNetwork: Mission = {
  id: 'corporate-network',
  title: 'Corporate Network',
  organization: 'Vantage Group',
  difficulty: 'high',
  briefing:
    'Three hosts, one trust relationship. The build server will hand you what the file server will not. Take both artefacts out.',
  objectives: [
    {
      id: 'map-vantage',
      description: 'Sweep the estate.',
      optional: false,
      completedWhen: [
        { type: 'host-scanned', hostId: 'van-build-02' },
        { type: 'host-scanned', hostId: 'van-files-03' },
      ],
    },
    {
      id: 'identify-build',
      description: 'Identify the build service.',
      optional: false,
      completedWhen: [{ type: 'service-identified', serviceId: 'van-build' }],
    },
    {
      id: 'pivot',
      description: 'Reach elevated access through the build host.',
      optional: false,
      completedWhen: [
        { type: 'objective-complete', objectiveId: 'identify-build' },
        { type: 'access-level-at-least', level: 'elevated' },
      ],
    },
    {
      id: 'take-artefacts',
      description: 'Retrieve both artefacts.',
      optional: false,
      completedWhen: [
        { type: 'file-retrieved', fileId: 'van-pipeline' },
        { type: 'file-retrieved', fileId: 'van-contracts' },
      ],
    },
    {
      id: 'under-the-wire',
      description: 'Extract with trace below 70%.',
      optional: true,
      completedWhen: [{ type: 'detection-below', value: 70 }],
    },
  ],
  target: {
    id: 'vantage-group',
    organization: 'Vantage Group',
    domain: 'vantage.corp',
    hosts: [
      defineHost({
        id: 'van-edge-01',
        label: 'edge',
        address: '192.0.2.100',
        ports: [{ number: 443, state: 'open', service: 'van-www' }],
        services: [
          { id: 'van-www', name: 'corporate-site', version: '9.0.1', banner: 'Vantage Web 9.0.1' },
        ],
        logs: [{ at: 'D1 07:00', severity: 'info', message: 'edge cache warmed' }],
      }),
      defineHost({
        id: 'van-build-02',
        label: 'build-server',
        address: '192.0.2.118',
        ports: [
          { number: 8500, state: 'open', service: 'van-build' },
          { number: 5000, state: 'open', service: 'van-registry' },
        ],
        services: [
          {
            id: 'van-build',
            name: 'build-runner',
            version: '14.0.0',
            banner: 'Vantage Build Runner 14.0.0',
            weaknesses: ['van-runner-trust'],
          },
          {
            id: 'van-registry',
            name: 'artefact-registry',
            version: '2.7.4',
            banner: 'Vantage Registry 2.7.4',
          },
        ],
        weaknesses: [
          {
            id: 'van-runner-trust',
            label: 'Runner trusted estate-wide',
            description: 'A fictional weakness. It names a game mechanic, not a technique.',
            grants: 'elevated',
            trace: 24,
            tool: 'advanced-scanner',
          },
        ],
        files: [
          {
            id: 'van-pipeline',
            name: 'pipeline.yml',
            sizeBytes: 3400,
            access: 'user',
            contents: 'Fictional pipeline definition for the training estate.',
          },
        ],
        logs: [
          { at: 'D1 11:20', severity: 'notice', message: 'runner token scoped to whole estate' },
          { at: 'D2 01:40', severity: 'warning', message: 'runner used to reach files-03' },
        ],
      }),
      defineHost({
        id: 'van-files-03',
        label: 'file-server',
        address: '192.0.2.131',
        ports: [
          { number: 445, state: 'open', service: 'van-files' },
          { number: 22, state: 'filtered' },
        ],
        services: [
          {
            id: 'van-files',
            name: 'file-share',
            version: '7.1.0',
            banner: 'Vantage File Share 7.1.0',
          },
        ],
        files: [
          {
            id: 'van-contracts',
            name: 'contracts.tar',
            sizeBytes: 102400,
            access: 'elevated',
            contents: 'Fictional contract bundle. Nothing real is included.',
          },
        ],
        logs: [
          { at: 'D2 01:41', severity: 'alert', message: 'share mounted by build runner identity' },
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
  requiredToolIds: ['advanced-scanner'],
  puzzles: [],
  detectionRules: [
    { commandId: 'scan', cost: 10 },
    { commandId: 'download', cost: 10 },
  ],
  reward: {
    xp: 600,
    credits: 1250,
    reputation: 15,
    toolIds: [],
    achievementIds: [],
  },
  unlock: {
    minimumLevel: 4,
    requiredMissionIds: ['restricted-server'],
    // van-runner-trust needs the Advanced Scanner, so taking this contract
    // without one would strand the operator at the pivot.
    requiredToolIds: ['forensic-kit', 'advanced-scanner'],
  },
};
