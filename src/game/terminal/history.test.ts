import { describe, expect, it } from 'vitest';
import {
  EMPTY_HISTORY,
  MAX_HISTORY_ENTRIES,
  pushHistory,
  recallNext,
  recallPrevious,
} from './history';

function build(entries: readonly string[]) {
  return entries.reduce(pushHistory, EMPTY_HISTORY);
}

describe('command history', () => {
  it('starts empty', () => {
    expect(EMPTY_HISTORY.entries).toEqual([]);
    expect(EMPTY_HISTORY.cursor).toBeNull();
  });

  it('records entries in order', () => {
    expect(build(['help', 'status', 'scan']).entries).toEqual(['help', 'status', 'scan']);
  });

  it('trims whitespace and ignores blank input', () => {
    const state = build(['  help  ', '', '   ']);
    expect(state.entries).toEqual(['help']);
  });

  it('does not record a command repeated back to back', () => {
    expect(build(['scan', 'scan', 'scan']).entries).toEqual(['scan']);
  });

  it('records a repeat that is not consecutive', () => {
    expect(build(['scan', 'status', 'scan']).entries).toEqual(['scan', 'status', 'scan']);
  });

  it('caps the number of retained entries', () => {
    const many = Array.from({ length: MAX_HISTORY_ENTRIES + 25 }, (_, i) => `cmd${String(i)}`);
    const state = build(many);
    expect(state.entries).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(state.entries.at(-1)).toBe(`cmd${String(MAX_HISTORY_ENTRIES + 24)}`);
    expect(state.entries[0]).toBe('cmd25');
  });

  it('recalls the most recent entry first', () => {
    const recalled = recallPrevious(build(['help', 'status', 'scan']));
    expect(recalled.value).toBe('scan');
  });

  it('walks backwards through entries', () => {
    let state = build(['help', 'status', 'scan']);
    const seen: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const recalled = recallPrevious(state);
      state = recalled.state;
      seen.push(recalled.value);
    }
    expect(seen).toEqual(['scan', 'status', 'help']);
  });

  it('stops at the oldest entry instead of wrapping', () => {
    let state = build(['help', 'status']);
    for (let i = 0; i < 6; i += 1) {
      state = recallPrevious(state).state;
    }
    expect(recallPrevious(state).value).toBe('help');
  });

  it('returns empty when recalling from an empty history', () => {
    expect(recallPrevious(EMPTY_HISTORY).value).toBe('');
    expect(recallNext(EMPTY_HISTORY).value).toBe('');
  });

  it('walks forward again toward the blank input line', () => {
    let state = build(['help', 'status', 'scan']);
    state = recallPrevious(state).state;
    state = recallPrevious(state).state;
    expect(recallNext(state).value).toBe('scan');
  });

  it('returns to a blank line past the newest entry', () => {
    let state = build(['help', 'status']);
    state = recallPrevious(state).state;
    const recalled = recallNext(state);
    expect(recalled.value).toBe('');
    expect(recalled.state.cursor).toBeNull();
  });

  it('resets the cursor after a new entry is recorded', () => {
    let state = build(['help', 'status']);
    state = recallPrevious(state).state;
    expect(state.cursor).not.toBeNull();
    state = pushHistory(state, 'scan');
    expect(state.cursor).toBeNull();
    expect(recallPrevious(state).value).toBe('scan');
  });

  it('never mutates the state it is given', () => {
    const state = build(['help', 'status']);
    const snapshot = structuredClone(state);
    recallPrevious(state);
    pushHistory(state, 'scan');
    expect(state).toEqual(snapshot);
  });
});
