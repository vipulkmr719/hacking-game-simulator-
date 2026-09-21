/**
 * Command history.
 *
 * Session state, not game state: it never reaches a save and never affects the
 * simulation. It lives in the engine folder anyway because it is pure logic
 * with real edge cases — recall past both ends, consecutive duplicates, a cap
 * — and those deserve tests rather than component-local useState.
 *
 * The cursor is null while the player is typing fresh input, and an index into
 * `entries` while they are walking back through it.
 */

export const MAX_HISTORY_ENTRIES = 100;

export interface HistoryState {
  readonly entries: readonly string[];
  readonly cursor: number | null;
}

export interface HistoryRecall {
  readonly state: HistoryState;
  readonly value: string;
}

export const EMPTY_HISTORY: HistoryState = { entries: [], cursor: null };

/**
 * Appends an entry and resets the cursor. Blank input is not recorded, and a
 * command repeated back-to-back is not duplicated — both match how a shell
 * behaves and keep recall useful.
 */
export function pushHistory(state: HistoryState, entry: string): HistoryState {
  const trimmed = entry.trim();
  if (trimmed === '') {
    return { ...state, cursor: null };
  }

  if (state.entries.at(-1) === trimmed) {
    return { entries: state.entries, cursor: null };
  }

  const entries = [...state.entries, trimmed];
  return {
    entries: entries.length > MAX_HISTORY_ENTRIES ? entries.slice(-MAX_HISTORY_ENTRIES) : entries,
    cursor: null,
  };
}

/** Steps toward older entries. Stops at the oldest rather than wrapping. */
export function recallPrevious(state: HistoryState): HistoryRecall {
  if (state.entries.length === 0) {
    return { state, value: '' };
  }

  const current = state.cursor ?? state.entries.length;
  const next = Math.max(0, current - 1);
  return { state: { ...state, cursor: next }, value: state.entries[next] ?? '' };
}

/**
 * Steps toward newer entries. Moving past the newest returns to the empty
 * input line, which is where the player started.
 */
export function recallNext(state: HistoryState): HistoryRecall {
  if (state.cursor === null) {
    return { state, value: '' };
  }

  const next = state.cursor + 1;
  if (next >= state.entries.length) {
    return { state: { ...state, cursor: null }, value: '' };
  }

  return { state: { ...state, cursor: next }, value: state.entries[next] ?? '' };
}
