/**
 * Maps engine events to sounds.
 *
 * The engine reports what happened as data; this decides what that should
 * sound like. Keeping the mapping here means adding a sound never touches game
 * logic.
 *
 * Muting is a setting, and settings live in the save file, so this hook is
 * told whether it is muted rather than deciding for itself. One source of
 * truth: a second storage key would be a second thing to keep in step.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { GameEvent } from '../game/engine';
import { createSoundPlayer, type SoundName } from './synth';

function soundFor(event: GameEvent): SoundName | null {
  switch (event.type) {
    case 'COMMAND_EXECUTED':
      return 'execute';
    case 'COMMAND_REJECTED':
      return 'reject';
    case 'OBJECTIVE_COMPLETED':
      return 'objective';
    case 'ACHIEVEMENT_UNLOCKED':
      return 'achievement';
    case 'LEVEL_REACHED':
      return 'levelUp';
    case 'MISSION_COMPLETED':
      return 'complete';
    case 'MISSION_FAILED':
      return 'fail';
    case 'THREAT_LEVEL_CHANGED':
      // Only the bands that mean something is going wrong.
      return event.current === 'alert' || event.current === 'critical' ? 'warn' : null;
    case 'TERMINAL_CLEARED':
    case 'DETECTION_CHANGED':
    case 'MISSION_STARTED':
    case 'SECURITY_EVENT':
    case 'TOOL_UNLOCKED':
      return null;
  }
}

export interface SoundController {
  /** Plays whatever these events call for, in order, skipping duplicates. */
  readonly playFor: (events: readonly GameEvent[]) => void;
  readonly playKeypress: () => void;
}

export function useSoundEffects(muted: boolean): SoundController {
  const player = useMemo(() => createSoundPlayer(), []);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => player.dispose, [player]);

  const playFor = useCallback(
    (events: readonly GameEvent[]) => {
      if (mutedRef.current) {
        return;
      }

      // One command can complete several objectives; a burst of identical
      // blips reads as a glitch, so each voice sounds at most once.
      const heard = new Set<SoundName>();
      for (const event of events) {
        const sound = soundFor(event);
        if (sound !== null && !heard.has(sound)) {
          heard.add(sound);
          player.play(sound);
        }
      }
    },
    [player],
  );

  const playKeypress = useCallback(() => {
    if (!mutedRef.current) {
      player.play('keypress');
    }
  }, [player]);

  return { playFor, playKeypress };
}
