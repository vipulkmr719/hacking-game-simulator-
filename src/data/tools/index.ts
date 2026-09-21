/**
 * Tool catalog.
 *
 * Tools are gameplay modifiers: they gate which commands run and scale the
 * trace cost of the ones that do. None of them performs an operation of any
 * kind — `detectionMultiplier` is a number the engine multiplies, nothing more.
 */
import type { GameTool } from '../../game/progression/types';

/*
 * Level requirements sit one tier below the contract that hands each tool
 * over, so credits buy a head start rather than nothing. Every tool is
 * eventually granted free by the campaign; paying for one early is a choice
 * about whether a quieter run now is worth the balance.
 */

export const TOOLS: readonly GameTool[] = [
  {
    id: 'basic-scanner',
    name: 'Basic Scanner',
    category: 'scanner',
    description: 'Maps hosts and enumerates ports on a loaded target.',
    cost: 0,
    detectionMultiplier: 1,
    requiredLevel: 1,
  },
  {
    id: 'advanced-scanner',
    name: 'Advanced Scanner',
    category: 'scanner',
    description:
      'Names the service and version behind each open port, which the Basic Scanner can only report as unidentified.',
    cost: 750,
    detectionMultiplier: 0.9,
    requiredLevel: 2,
  },
  {
    id: 'decoder',
    name: 'Decoder',
    category: 'decoder',
    description: 'Required to attempt the cipher on any encrypted file.',
    cost: 900,
    detectionMultiplier: 1,
    requiredLevel: 3,
  },
  {
    id: 'forensic-kit',
    name: 'Forensic Kit',
    category: 'forensics',
    description:
      'Accredited evidence handling. Required by contracts that touch recovered material, and quiets every action while carried.',
    cost: 1200,
    detectionMultiplier: 0.85,
    requiredLevel: 4,
  },
  {
    id: 'stealth-module',
    name: 'Stealth Module',
    category: 'stealth',
    description: 'Reduces the trace cost of every action while equipped.',
    cost: 1600,
    detectionMultiplier: 0.6,
    requiredLevel: 5,
  },
  {
    id: 'analysis-toolkit',
    name: 'Analysis Toolkit',
    category: 'analysis',
    description:
      'Consortium-grade tradecraft. Required by the weaknesses the largest targets carry, and quiets every action while carried.',
    cost: 2000,
    detectionMultiplier: 0.9,
    requiredLevel: 6,
  },
];
