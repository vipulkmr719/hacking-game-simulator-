/**
 * Threat bands.
 *
 * The trace meter is a single number; this turns it into the five states the
 * player actually reasons about. Bands are declared lowest-first with an
 * inclusive lower bound, so there is no gap between 25 and 26 to fall into:
 * anything below the next band's floor belongs to the one beneath it.
 *
 * Detection is held as an integer (see detection.ts), which is what lets the
 * displayed percentage, the band, and the failure check agree at every value.
 */

export const THREAT_LEVELS = ['safe', 'suspicious', 'alert', 'critical', 'detected'] as const;
export type ThreatLevel = (typeof THREAT_LEVELS)[number];

export interface ThreatBand {
  readonly level: ThreatLevel;
  readonly label: string;
  /** Inclusive floor of the band. */
  readonly floor: number;
  readonly description: string;
}

/** Ordered high to low, so the first match is the answer. */
export const THREAT_BANDS: readonly ThreatBand[] = [
  {
    level: 'detected',
    label: 'DETECTED',
    floor: 100,
    description: 'The target has you. The run is over.',
  },
  {
    level: 'critical',
    label: 'CRITICAL',
    floor: 76,
    description: 'One more flagged action will end the run.',
  },
  {
    level: 'alert',
    label: 'ALERT',
    floor: 51,
    description: 'Security is actively looking for you.',
  },
  {
    level: 'suspicious',
    label: 'SUSPICIOUS',
    floor: 26,
    description: 'Something has been noticed. Nothing has been traced yet.',
  },
  {
    level: 'safe',
    label: 'SAFE',
    floor: 0,
    description: 'Nothing is watching you closely.',
  },
];

const SAFE_BAND: ThreatBand = THREAT_BANDS[THREAT_BANDS.length - 1] ?? {
  level: 'safe',
  label: 'SAFE',
  floor: 0,
  description: 'Nothing is watching you closely.',
};

export function threatBandFor(detection: number): ThreatBand {
  if (Number.isNaN(detection)) {
    return SAFE_BAND;
  }
  return THREAT_BANDS.find((band) => detection >= band.floor) ?? SAFE_BAND;
}

export function threatLevelFor(detection: number): ThreatLevel {
  return threatBandFor(detection).level;
}

/** How far up the ladder a band sits; higher is worse. */
export function threatRank(level: ThreatLevel): number {
  return THREAT_LEVELS.indexOf(level);
}

export function isEscalation(from: ThreatLevel, to: ThreatLevel): boolean {
  return threatRank(to) > threatRank(from);
}

/** The ceiling of a band, for showing the range a player is inside. */
export function threatCeiling(level: ThreatLevel): number {
  const index = THREAT_BANDS.findIndex((band) => band.level === level);
  if (index <= 0) {
    return 100;
  }
  return (THREAT_BANDS[index - 1]?.floor ?? 101) - 1;
}
