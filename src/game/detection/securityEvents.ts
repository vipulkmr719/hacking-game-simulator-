/**
 * Security event chatter.
 *
 * Fictional messages describing what the target's security is supposedly
 * noticing. They are flavour drawn from a fixed table — nothing here inspects
 * anything, and no message describes a real technique or a real defence.
 *
 * Selection goes through the seeded RNG, so the same run always produces the
 * same chatter. That keeps the engine reproducible and lets tests assert on
 * exact strings.
 */
import { pickOne, type RngState } from '../rng';
import type { ThreatLevel } from './threat';

const CHATTER: Readonly<Record<ThreatLevel, readonly string[]>> = {
  safe: [
    'ambient traffic nominal',
    'perimeter counters steady',
    'no correlation on recent requests',
  ],
  suspicious: [
    'anomaly queued for review',
    'request pattern flagged by heuristics',
    'session fingerprint marked for follow-up',
    'rate deviation logged against edge',
  ],
  alert: [
    'analyst paged on correlated events',
    'active sweep opened on this session',
    'traffic sample pulled for inspection',
    'containment playbook staged',
  ],
  critical: [
    'trace narrowing on origin',
    'response team standing by',
    'session marked for termination',
    'correlation confidence rising fast',
  ],
  detected: ['origin resolved', 'session terminated by security'],
};

export interface SecurityEvent {
  readonly level: ThreatLevel;
  readonly message: string;
}

export interface SecurityEventDraw {
  readonly event: SecurityEvent;
  readonly rng: RngState;
}

/**
 * Picks one line for the current threat level.
 *
 * Always returns an event and always advances the RNG, so a caller that draws
 * conditionally cannot desynchronise the sequence for a caller that does not.
 */
export function drawSecurityEvent(rng: RngState, level: ThreatLevel): SecurityEventDraw {
  const pool = CHATTER[level];
  const { value, next } = pickOne(rng, pool);
  return {
    event: { level, message: value ?? 'security posture unchanged' },
    rng: next,
  };
}

export function formatSecurityEvent(event: SecurityEvent): string {
  return `[${event.level.toUpperCase()}] ${event.message}`;
}
