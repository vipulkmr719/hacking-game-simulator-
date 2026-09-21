/**
 * Tool catalog.
 *
 * Tools are gameplay modifiers: they gate which commands run and scale the
 * trace cost of the ones that do. None of them performs an operation of any
 * kind — `detectionMultiplier` is a number the engine multiplies, nothing more.
 */
import type { GameTool } from '../../game/progression/types';

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
    description: 'Resolves service versions that the basic scanner reports as unidentified.',
    cost: 750,
    detectionMultiplier: 0.9,
    requiredLevel: 3,
  },
  {
    id: 'decoder',
    name: 'Decoder',
    category: 'decoder',
    description: 'Required to attempt cipher puzzles on encrypted files.',
    cost: 900,
    detectionMultiplier: 1,
    requiredLevel: 4,
  },
  {
    id: 'forensic-kit',
    name: 'Forensic Kit',
    category: 'forensics',
    description: 'Recovers log entries that a host has rotated away.',
    cost: 1200,
    detectionMultiplier: 1,
    requiredLevel: 5,
  },
  {
    id: 'stealth-module',
    name: 'Stealth Module',
    category: 'stealth',
    description: 'Reduces the trace cost of every action while equipped.',
    cost: 1600,
    detectionMultiplier: 0.6,
    requiredLevel: 6,
  },
  {
    id: 'analysis-toolkit',
    name: 'Analysis Toolkit',
    category: 'analysis',
    description: 'Surfaces weaknesses that a plain analysis pass misses.',
    cost: 2000,
    detectionMultiplier: 0.95,
    requiredLevel: 8,
  },
];

export function findTool(id: string): GameTool | null {
  return TOOLS.find((tool) => tool.id === id) ?? null;
}
