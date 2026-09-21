/**
 * React binding for the engine.
 *
 * This is the only place the pure engine meets React. Terminal scrollback and
 * command history are held here rather than in GameState: both are
 * presentation, both are bounded, and keeping them out means saves stay small
 * and `step` stays pure.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGameDeps, createTrainingGameState } from '../data/bootstrap';
import { completeCommandLine, executeCommandLine } from '../game/engine';
import type { CompletionResult, GameEvent, GameState, TerminalLine } from '../game/engine';
import { selectActiveMission, selectMissionList } from '../game/missions/selectors';
import type { ActiveMissionView, MissionListEntry } from '../game/missions/selectors';
import { selectProgression } from '../game/progression/selectors';
import type { ProgressionView } from '../game/progression/selectors';
import { applySave } from '../game/save/apply';
import { toSaveFile } from '../game/save/serialize';
import type { LoadResult } from '../game/save/types';
import { EMPTY_HISTORY, pushHistory, recallNext, recallPrevious } from '../game/terminal/history';
import type { HistoryState } from '../game/terminal/history';
import { echo, info, output, system, warning } from '../game/terminal/types';
import { loadSave, writeSave } from '../persistence/localSave';

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

export interface StepEvents {
  readonly id: number;
  readonly events: readonly GameEvent[];
}

const NO_STEP: StepEvents = { id: 0, events: [] };

export interface GameEngineBinding {
  readonly state: GameState;
  /** What happened when the stored save was read at startup. */
  readonly loadResult: LoadResult;
  /** Settings are saved, so they live here beside the state they are saved with. */
  readonly muted: boolean;
  readonly toggleMuted: () => void;
  readonly mission: ActiveMissionView | null;
  readonly missionList: readonly MissionListEntry[];
  readonly progression: ProgressionView;
  readonly lines: readonly TerminalLine[];
  /**
   * Events from the most recent command, with a monotonic id.
   *
   * The id is what lets a component tell "the same events again" from "these
   * events happened again": two identical commands in a row produce equal
   * event arrays, and an animation must replay for the second one.
   */
  readonly lastStep: StepEvents;
  readonly submit: (raw: string) => void;
  readonly complete: (raw: string) => string | null;
  readonly recallOlder: () => string;
  readonly recallNewer: () => string;
}

export function useGameEngine(seed?: number): GameEngineBinding {
  const deps = useMemo(() => createGameDeps(), []);

  // Read once, during the initialiser, so the first render already shows the
  // restored figures rather than flashing a new game and correcting itself.
  const [loadResult] = useState<LoadResult>(() => loadSave());
  const [state, setState] = useState<GameState>(() => {
    const fresh = createTrainingGameState(seed);
    return loadResult.ok ? applySave(fresh, loadResult.save) : fresh;
  });

  const [muted, setMuted] = useState(() => (loadResult.ok ? loadResult.save.settings.muted : false));

  const [lines, setLines] = useState<readonly TerminalLine[]>(() => {
    if (loadResult.ok) {
      return [
        ...BOOT_LINES,
        info(
          `Progress restored: level ${String(loadResult.save.player.level)}, ${String(loadResult.save.player.completedMissionIds.length)} contract(s) closed.`,
        ),
        ...(loadResult.repaired
          ? [warning('Some stored values were out of range and have been corrected.')]
          : []),
      ];
    }
    // "No save yet" is the normal first visit and deserves no comment; a save
    // that existed and could not be read does.
    return loadResult.reason === 'empty'
      ? BOOT_LINES
      : [...BOOT_LINES, warning(`Saved progress could not be read: ${loadResult.detail}`)];
  });
  const [history, setHistory] = useState<HistoryState>(EMPTY_HISTORY);
  const [lastStep, setLastStep] = useState<StepEvents>(NO_STEP);

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
      setLastStep((previous) => ({ id: previous.id + 1, events: result.events }));
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

  /*
   * Persist whenever anything saved changes. The player object is rebuilt by
   * every command, so this is one small write per command rather than a timer
   * — and a write that fails (private browsing, full quota) is reported once
   * rather than retried.
   */
  const warnedRef = useRef(false);
  useEffect(() => {
    const written = writeSave(toSaveFile(stateRef.current, { muted }));
    if (!written && !warnedRef.current) {
      warnedRef.current = true;
      setLines((previous) =>
        clampHistory([...previous, warning('Progress cannot be saved: storage is unavailable.')]),
      );
    }
  }, [state.player, muted]);

  const toggleMuted = useCallback(() => {
    setMuted((previous) => !previous);
  }, []);

  // Derived by the engine, memoised only to avoid rebuilding them per render.
  const mission = useMemo(() => selectActiveMission(state, deps), [state, deps]);
  const missionList = useMemo(() => selectMissionList(state, deps), [state, deps]);
  const progression = useMemo(() => selectProgression(state, deps), [state, deps]);

  return {
    state,
    loadResult,
    muted,
    toggleMuted,
    mission,
    missionList,
    progression,
    lines,
    lastStep,
    submit,
    complete,
    recallOlder,
    recallNewer,
  };
}
