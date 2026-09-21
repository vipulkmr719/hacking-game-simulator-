import { describe, expect, it } from 'vitest';
import {
  DETECTION_MAX,
  DETECTION_MIN,
  applyDetectionDelta,
  clampDetection,
  formatTrace,
  isTraceCritical,
  resolveDetectionCost,
} from './detection';

describe('detection meter', () => {
  it('clamps to the permitted range', () => {
    expect(clampDetection(-40)).toBe(DETECTION_MIN);
    expect(clampDetection(180)).toBe(DETECTION_MAX);
    expect(clampDetection(55)).toBe(55);
  });

  it('resolves NaN to the neutral value and clamps infinities to the bounds', () => {
    expect(clampDetection(Number.NaN)).toBe(DETECTION_MIN);
    expect(clampDetection(Number.POSITIVE_INFINITY)).toBe(DETECTION_MAX);
    expect(clampDetection(Number.NEGATIVE_INFINITY)).toBe(DETECTION_MIN);
  });

  it('never lets a delta push the meter out of range', () => {
    expect(applyDetectionDelta(95, 30)).toBe(DETECTION_MAX);
    expect(applyDetectionDelta(5, -30)).toBe(DETECTION_MIN);
    expect(applyDetectionDelta(20, 15)).toBe(35);
  });

  it('ignores a NaN delta but lets an infinite one reach the bound', () => {
    expect(applyDetectionDelta(40, Number.NaN)).toBe(40);
    expect(applyDetectionDelta(40, Number.POSITIVE_INFINITY)).toBe(DETECTION_MAX);
    expect(applyDetectionDelta(40, Number.NEGATIVE_INFINITY)).toBe(DETECTION_MIN);
  });

  it('reports critical only at the maximum', () => {
    expect(isTraceCritical(99.9)).toBe(false);
    expect(isTraceCritical(DETECTION_MAX)).toBe(true);
    expect(isTraceCritical(150)).toBe(true);
  });

  it('resolves cost through the tool multiplier and never returns negative', () => {
    expect(resolveDetectionCost({ cost: 10, multiplier: 0.5 })).toBe(5);
    expect(resolveDetectionCost({ cost: 10, multiplier: 1 })).toBe(10);
    expect(resolveDetectionCost({ cost: -10, multiplier: 1 })).toBe(0);
    expect(resolveDetectionCost({ cost: 10, multiplier: Number.NaN })).toBe(10);
    expect(resolveDetectionCost({ cost: Number.NaN, multiplier: 2 })).toBe(0);
  });

  it('formats the trace readout', () => {
    expect(formatTrace(24.4)).toBe('TRACE: 24%');
    expect(formatTrace(250)).toBe('TRACE: 100%');
  });
});
