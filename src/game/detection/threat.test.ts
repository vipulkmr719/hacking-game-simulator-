import { describe, expect, it } from 'vitest';
import { DETECTION_MAX, DETECTION_MIN } from './detection';
import {
  THREAT_BANDS,
  THREAT_LEVELS,
  isEscalation,
  threatBandFor,
  threatCeiling,
  threatLevelFor,
  threatRank,
} from './threat';

describe('bands', () => {
  it.each([
    [0, 'safe'],
    [1, 'safe'],
    [25, 'safe'],
    [26, 'suspicious'],
    [40, 'suspicious'],
    [50, 'suspicious'],
    [51, 'alert'],
    [70, 'alert'],
    [75, 'alert'],
    [76, 'critical'],
    [99, 'critical'],
    [100, 'detected'],
  ])('classifies %i%% as %s', (detection, level) => {
    expect(threatLevelFor(detection)).toBe(level);
  });

  it('covers the whole range with no gaps', () => {
    for (let value = DETECTION_MIN; value <= DETECTION_MAX; value += 1) {
      expect(THREAT_LEVELS).toContain(threatLevelFor(value));
    }
  });

  it('never goes backwards as trace rises', () => {
    let previous = 0;
    for (let value = DETECTION_MIN; value <= DETECTION_MAX; value += 1) {
      const rank = threatRank(threatLevelFor(value));
      expect(rank).toBeGreaterThanOrEqual(previous);
      previous = rank;
    }
  });

  it('reserves DETECTED for exactly the maximum', () => {
    expect(threatLevelFor(99)).not.toBe('detected');
    expect(threatLevelFor(100)).toBe('detected');
  });

  it('falls back to safe for nonsense', () => {
    expect(threatLevelFor(Number.NaN)).toBe('safe');
    expect(threatLevelFor(-50)).toBe('safe');
  });

  it('gives every band a label and an explanation', () => {
    for (const band of THREAT_BANDS) {
      expect(band.label).toBe(band.label.toUpperCase());
      expect(band.description.length).toBeGreaterThan(0);
    }
  });

  it('reports the ceiling of each band', () => {
    expect(threatCeiling('safe')).toBe(25);
    expect(threatCeiling('suspicious')).toBe(50);
    expect(threatCeiling('alert')).toBe(75);
    expect(threatCeiling('critical')).toBe(99);
    expect(threatCeiling('detected')).toBe(100);
  });

  it('matches band floors to the published table', () => {
    const floors = Object.fromEntries(THREAT_BANDS.map((band) => [band.level, band.floor]));
    expect(floors).toEqual({ safe: 0, suspicious: 26, alert: 51, critical: 76, detected: 100 });
  });
});

describe('escalation', () => {
  it('detects a rise', () => {
    expect(isEscalation('safe', 'suspicious')).toBe(true);
    expect(isEscalation('alert', 'detected')).toBe(true);
  });

  it('does not call a fall or a hold an escalation', () => {
    expect(isEscalation('alert', 'safe')).toBe(false);
    expect(isEscalation('alert', 'alert')).toBe(false);
  });

  it('ranks the bands in order', () => {
    const ranks = THREAT_LEVELS.map(threatRank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('lists band data high to low so the first match wins', () => {
    const floors = THREAT_BANDS.map((band) => band.floor);
    expect(floors).toEqual([...floors].sort((a, b) => b - a));
  });
});

describe('bandFor', () => {
  it('returns the band object, not just the level', () => {
    const band = threatBandFor(80);
    expect(band.level).toBe('critical');
    expect(band.label).toBe('CRITICAL');
    expect(band.description).toContain('end the run');
  });
});
