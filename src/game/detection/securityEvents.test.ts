import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { THREAT_LEVELS } from './threat';
import { drawSecurityEvent, formatSecurityEvent } from './securityEvents';

describe('security chatter', () => {
  it('returns a message for every threat level', () => {
    for (const level of THREAT_LEVELS) {
      const draw = drawSecurityEvent(createRng(1), level);
      expect(draw.event.level).toBe(level);
      expect(draw.event.message.length).toBeGreaterThan(0);
    }
  });

  it('is reproducible from a seed', () => {
    const first = drawSecurityEvent(createRng(4242), 'alert');
    const second = drawSecurityEvent(createRng(4242), 'alert');
    expect(first.event).toEqual(second.event);
    expect(first.rng).toEqual(second.rng);
  });

  it('always advances the rng, so conditional draws cannot desynchronise it', () => {
    const rng = createRng(7);
    const draw = drawSecurityEvent(rng, 'safe');
    expect(draw.rng).not.toEqual(rng);
  });

  it('varies across the sequence rather than repeating one line', () => {
    let rng = createRng(99);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      const draw = drawSecurityEvent(rng, 'alert');
      seen.add(draw.event.message);
      rng = draw.rng;
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('never mutates the rng it is given', () => {
    const rng = createRng(11);
    drawSecurityEvent(rng, 'critical');
    expect(rng.seed).toBe(createRng(11).seed);
  });

  it('formats a message with its level', () => {
    expect(formatSecurityEvent({ level: 'alert', message: 'analyst paged' })).toBe(
      '[ALERT] analyst paged',
    );
  });

  it('describes only fictional monitoring, never a technique', () => {
    // Guard against chatter drifting toward operational language.
    const forbidden = ['firewall', 'bypass', 'payload', 'exploit', 'packet', 'evade', 'IDS'];
    for (const level of THREAT_LEVELS) {
      let rng = createRng(3);
      for (let i = 0; i < 30; i += 1) {
        const draw = drawSecurityEvent(rng, level);
        rng = draw.rng;
        for (const word of forbidden) {
          expect(draw.event.message.toLowerCase()).not.toContain(word.toLowerCase());
        }
      }
    }
  });
});
