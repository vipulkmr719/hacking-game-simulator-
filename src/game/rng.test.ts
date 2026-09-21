import { describe, expect, it } from 'vitest';
import { createRng, nextInt, nextValue, pickOne } from './rng';

describe('seeded rng', () => {
  it('produces the same sequence for the same seed', () => {
    const draw = (seed: number) => {
      let state = createRng(seed);
      const values: number[] = [];
      for (let i = 0; i < 25; i += 1) {
        const result = nextValue(state);
        values.push(result.value);
        state = result.next;
      }
      return values;
    };

    expect(draw(1234)).toEqual(draw(1234));
  });

  it('produces different sequences for different seeds', () => {
    expect(nextValue(createRng(1)).value).not.toBe(nextValue(createRng(2)).value);
  });

  it('never mutates the state it is given', () => {
    const state = createRng(99);
    nextValue(state);
    expect(state.seed).toBe(createRng(99).seed);
  });

  it('keeps values within [0, 1)', () => {
    let state = createRng(7);
    for (let i = 0; i < 500; i += 1) {
      const result = nextValue(state);
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(1);
      state = result.next;
    }
  });

  it('normalizes hostile seeds instead of throwing', () => {
    expect(() => nextValue(createRng(Number.NaN))).not.toThrow();
    expect(() => nextValue(createRng(-4.7))).not.toThrow();
    expect(() => nextValue(createRng(Number.POSITIVE_INFINITY))).not.toThrow();
    expect(Number.isFinite(nextValue(createRng(Number.NaN)).value)).toBe(true);
  });

  it('keeps nextInt inside the requested range', () => {
    let state = createRng(42);
    for (let i = 0; i < 300; i += 1) {
      const result = nextInt(state, 3, 9);
      expect(result.value).toBeGreaterThanOrEqual(3);
      expect(result.value).toBeLessThanOrEqual(9);
      expect(Number.isInteger(result.value)).toBe(true);
      state = result.next;
    }
  });

  it('returns min when the nextInt range is inverted or degenerate', () => {
    expect(nextInt(createRng(1), 5, 5).value).toBe(5);
    expect(nextInt(createRng(1), 9, 2).value).toBe(9);
  });

  it('returns null from pickOne on an empty list', () => {
    expect(pickOne(createRng(1), []).value).toBeNull();
  });

  it('always picks a member of the list', () => {
    const items = ['a', 'b', 'c'];
    let state = createRng(11);
    for (let i = 0; i < 100; i += 1) {
      const result = pickOne(state, items);
      expect(items).toContain(result.value);
      state = result.next;
    }
  });
});
