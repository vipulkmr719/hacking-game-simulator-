/**
 * Maps engine events to sounds.
 *
 * The engine reports what happened as data; this decides what that should
 * sound like. Keeping the mapping here means adding a sound never touches game
 * logic, and muting is a UI concern rather than a game state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameEvent } from '../game/engine';
import { createSoundPlayer, type SoundName } from './synth';

const MUTE_STORAGE_KEY = 'chs.muted';

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

function readStoredMute(): boolean {
  try {
    return globalThis.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    // Private browsing and blocked site data both throw here; defaulting to
    // audible is the same as a first visit.
    return false;
  }
}

export interface SoundController {
  readonly muted: boolean;
  readonly toggleMuted: () => void;
  /** Plays whatever these events call for, in order, skipping duplicates. */
  readonly playFor: (events: readonly GameEvent[]) => void;
  readonly playKeypress: () => void;
}

export function useSoundEffects(): SoundController {
  const [muted, setMuted] = useState(readStoredMute);
  const player = useMemo(() => createSoundPlayer(), []);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => player.dispose, [player]);

  const toggleMuted = useCallback(() => {
    setMuted((previous) => {
      const next = !previous;
      try {
        globalThis.localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      } catch {
        // A preference that cannot be stored is still honoured this session.
      }
      return next;
    });
  }, []);

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

  return { muted, toggleMuted, playFor, playKeypress };
}
