/**
 * Achievement catalog.
 *
 * Two tracks. Contract achievements mark a specific job; the rest recognise
 * play across the whole campaign. Each pays XP once, which makes them a
 * secondary progression route rather than a shelf of inert badges — an
 * operator who explores earns levels slightly ahead of one who does not.
 */
import type { Achievement } from '../../game/achievements/types';

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-contract',
    name: 'First Contract',
    description: 'Close your first contract.',
    trigger: { type: 'mission-completed', missionId: 'first-connection' },
    xp: 60,
  },
  {
    id: 'log-reader',
    name: 'Log Reader',
    description: 'Pull a manifest out of an event log.',
    trigger: { type: 'mission-completed', missionId: 'suspicious-logs' },
    xp: 120,
  },
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'Walk past an adaptive monitor.',
    trigger: { type: 'mission-completed', missionId: 'security-ai' },
    xp: 200,
  },
  {
    id: 'consortium-breaker',
    name: 'Consortium Breaker',
    description: 'Close the Aegis operation.',
    trigger: { type: 'mission-completed', missionId: 'final-operation' },
    xp: 300,
  },
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Reach level 3.',
    trigger: { type: 'level-reached', level: 3 },
    xp: 50,
  },
  {
    id: 'seasoned',
    name: 'Seasoned',
    description: 'Reach level 6.',
    trigger: { type: 'level-reached', level: 6 },
    xp: 120,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Reach level 9.',
    trigger: { type: 'level-reached', level: 9 },
    xp: 250,
  },
  {
    id: 'halfway',
    name: 'Halfway',
    description: 'Close five contracts.',
    trigger: { type: 'missions-completed', count: 5 },
    xp: 150,
  },
  {
    id: 'full-slate',
    name: 'Full Slate',
    description: 'Close all ten contracts.',
    trigger: { type: 'missions-completed', count: 10 },
    xp: 400,
  },
  {
    id: 'well-equipped',
    name: 'Well Equipped',
    description: 'Own four tools.',
    trigger: { type: 'tools-owned', count: 4 },
    xp: 100,
  },
  {
    id: 'fully-kitted',
    name: 'Fully Kitted',
    description: 'Own every tool.',
    trigger: { type: 'tools-owned', count: 6 },
    xp: 250,
  },
  {
    id: 'solvent',
    name: 'Solvent',
    description: 'Hold 3,000 credits at once.',
    trigger: { type: 'credits-held', amount: 3000 },
    xp: 100,
  },
  {
    id: 'persistent',
    name: 'Persistent',
    description: 'Lose a contract. It happens.',
    trigger: { type: 'missions-failed', count: 1 },
    xp: 40,
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Execute 250 commands.',
    trigger: { type: 'commands-executed', count: 250 },
    xp: 150,
  },
];
