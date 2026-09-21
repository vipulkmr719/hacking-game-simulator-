/**
 * React binding for the engine.
 *
 * This is the only place the pure engine meets React. Terminal scrollback is
 * held here rather than in GameState: it is presentation, it is bounded, and
 * keeping it out of the engine keeps saves small and `step` pure.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { createDefaultRegistry, createInitialGameState, executeCommandLine } from '../game/engine';
import type { GameEvent, GameState, TerminalLine } from '../game/engine';
import { echo, info, system } from '../game/terminal/types';

/**
 * Scrollback cap. The performance rules forbid unbounded DOM growth in the
 * terminal, and 500 lines is far more than a player scrolls back through.
 */
export const MAX_TERMINAL_LINES = 500;

const BOOT_LINES: readonly TerminalLine[] = [
  system('CYBER HACKER SIMULATOR  ·  v0.1.0'),
  info('Simulated environment. No real systems are contacted.'),
  info('Type "help" to begin.'),
];

function clampHistory(lines: readonly TerminalLine[]): TerminalLine[] {
  return lines.length <= MAX_TERMINAL_LINES ? [...lines] : lines.slice(-MAX_TERMINAL_LINES);
}

export interface GameEngineBinding {
  readonly state: GameState;
  readonly lines: readonly TerminalLine[];
  readonly history: readonly string[];
  readonly submit: (raw: string) => void;
}

export function useGameEngine(seed?: number): GameEngineBinding {
  const registry = useMemo(() => createDefaultRegistry(), []);
  const [state, setState] = useState<GameState>(() => createInitialGameState(seed));
  const [lines, setLines] = useState<readonly TerminalLine[]>(BOOT_LINES);
  const [history, setHistory] = useState<readonly string[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const submit = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      const result = executeCommandLine(stateRef.current, raw, registry);
      const cleared = result.events.some((event: GameEvent) => event.type === 'TERMINAL_CLEARED');

      setState(result.state);
      if (trimmed !== '') {
        setHistory((previous) => [...previous, trimmed].slice(-MAX_TERMINAL_LINES));
      }
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
    [registry],
  );

  return { state, lines, history, submit };
}
