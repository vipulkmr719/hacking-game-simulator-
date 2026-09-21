/**
 * React binding for the engine.
 *
 * This is the only place the pure engine meets React. Terminal scrollback and
 * command history are held here rather than in GameState: both are
 * presentation, both are bounded, and keeping them out means saves stay small
 * and `step` stays pure.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { createGameDeps, createTrainingGameState } from '../data/bootstrap';
import { completeCommandLine, executeCommandLine } from '../game/engine';
import type { CompletionResult, GameEvent, GameState, TerminalLine } from '../game/engine';
import { selectActiveMission } from '../game/missions/selectors';
import type { ActiveMissionView } from '../game/missions/selectors';
import { selectProgression } from '../game/progression/selectors';
import type { ProgressionView } from '../game/progression/selectors';
import { EMPTY_HISTORY, pushHistory, recallNext, recallPrevious } from '../game/terminal/history';
import type { HistoryState } from '../game/terminal/history';
import { echo, info, output, system } from '../game/terminal/types';

/**
 * Scrollback cap. The performance rules forbid unbounded DOM growth in the
 * terminal, and 500 lines is far more than a player scrolls back through.
 */
export const MAX_TERMINAL_LINES = 500;

const BOOT_LINES: readonly TerminalLine[] = [
  system('CYBER HACKER SIMULATOR  ·  v0.1.0'),
  info('Simulated environment. No real systems are contacted.'),
  info('Type "help" to begin. Tab completes a command.'),
];

function clampHistory(lines: readonly TerminalLine[]): TerminalLine[] {
  return lines.length <= MAX_TERMINAL_LINES ? [...lines] : lines.slice(-MAX_TERMINAL_LINES);
}

export interface GameEngineBinding {
  readonly state: GameState;
  readonly mission: ActiveMissionView | null;
  readonly progression: ProgressionView;
  readonly lines: readonly TerminalLine[];
  readonly submit: (raw: string) => void;
  readonly complete: (raw: string) => string | null;
  readonly recallOlder: () => string;
  readonly recallNewer: () => string;
}

export function useGameEngine(seed?: number): GameEngineBinding {
  const deps = useMemo(() => createGameDeps(), []);
  const [state, setState] = useState<GameState>(() => createTrainingGameState(seed));
  const [lines, setLines] = useState<readonly TerminalLine[]>(BOOT_LINES);
  const [history, setHistory] = useState<HistoryState>(EMPTY_HISTORY);

  // Refs keep `submit` and the recall helpers stable, so the input component
  // does not re-render on every keystroke of unrelated state.
  const stateRef = useRef(state);
  stateRef.current = state;
  const historyRef = useRef(history);
  historyRef.current = history;

  const submit = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      const result = executeCommandLine(stateRef.current, raw, deps);
      const cleared = result.events.some((event: GameEvent) => event.type === 'TERMINAL_CLEARED');

      setState(result.state);
      setHistory((previous) => pushHistory(previous, trimmed));
      setLines((previous) =>
        cleared
          ? []
          : clampHistory([
              ...previous,
              ...(trimmed === '' ? [] : [echo(`> ${trimmed}`)]),
              ...result.outputs,
            ]),
      );
    },
    [deps],
  );

  const complete = useCallback(
    (raw: string): string | null => {
      const result: CompletionResult = completeCommandLine(raw, deps.registry);

      // Several candidates: print them the way a shell would, and fill in as
      // much of the shared prefix as exists.
      if (result.ambiguous) {
        setLines((previous) =>
          clampHistory([
            ...previous,
            echo(`> ${raw.trim()}`),
            output(`  ${result.matches.join('  ')}`),
          ]),
        );
      }

      return result.completed;
    },
    [deps],
  );

  const recallOlder = useCallback(() => {
    const recalled = recallPrevious(historyRef.current);
    setHistory(recalled.state);
    return recalled.value;
  }, []);

  const recallNewer = useCallback(() => {
    const recalled = recallNext(historyRef.current);
    setHistory(recalled.state);
    return recalled.value;
  }, []);

  // Derived by the engine, memoised only to avoid rebuilding them per render.
  const mission = useMemo(() => selectActiveMission(state, deps), [state, deps]);
  const progression = useMemo(() => selectProgression(state, deps), [state, deps]);

  return { state, mission, progression, lines, submit, complete, recallOlder, recallNewer };
}
