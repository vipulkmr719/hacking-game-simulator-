/**
 * Terminal sound effects.
 *
 * Tones are synthesised with the Web Audio API rather than played from files:
 * no assets to ship, no network request to make, and short shaped blips suit a
 * terminal better than sampled sound. The whole module lives in the UI layer —
 * the engine has no idea sound exists.
 *
 * Every voice is short and quiet. Sound here confirms that something happened;
 * it is not atmosphere, and it never competes with reading.
 */

export type SoundName =
  | 'keypress'
  | 'execute'
  | 'reject'
  | 'objective'
  | 'achievement'
  | 'levelUp'
  | 'warn'
  | 'fail'
  | 'complete';

interface Voice {
  /** Hz, in order; more than one plays as a short arpeggio. */
  readonly notes: readonly number[];
  /** Seconds per note. */
  readonly length: number;
  readonly gain: number;
  readonly type: OscillatorType;
}

const VOICES: Readonly<Record<SoundName, Voice>> = {
  keypress: { notes: [880], length: 0.016, gain: 0.02, type: 'square' },
  execute: { notes: [520], length: 0.05, gain: 0.05, type: 'triangle' },
  reject: { notes: [180, 140], length: 0.07, gain: 0.06, type: 'sawtooth' },
  objective: { notes: [660, 880], length: 0.07, gain: 0.06, type: 'triangle' },
  achievement: { notes: [660, 880, 1100], length: 0.08, gain: 0.06, type: 'triangle' },
  levelUp: { notes: [523, 659, 784, 1047], length: 0.09, gain: 0.07, type: 'triangle' },
  warn: { notes: [420, 320], length: 0.1, gain: 0.07, type: 'square' },
  fail: { notes: [300, 220, 160], length: 0.13, gain: 0.08, type: 'sawtooth' },
  complete: { notes: [523, 784, 1047], length: 0.1, gain: 0.07, type: 'triangle' },
};

export interface SoundPlayer {
  readonly play: (name: SoundName) => void;
  readonly dispose: () => void;
}

type AudioContextConstructor = new () => AudioContext;

function resolveAudioContext(): AudioContextConstructor | null {
  const scope = globalThis as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

/**
 * Creates a player, or a no-op one where Web Audio is unavailable.
 *
 * Returning a working object either way means callers never branch on whether
 * sound exists — a muted game and a game in a browser without audio behave
 * identically.
 */
export function createSoundPlayer(): SoundPlayer {
  const Constructor = resolveAudioContext();
  if (Constructor === null) {
    return { play: () => undefined, dispose: () => undefined };
  }

  let context: AudioContext | null = null;

  const ensureContext = (): AudioContext | null => {
    try {
      context ??= new Constructor();
      // Browsers start the context suspended until a gesture; resuming on
      // first play is what makes the first sound after a keystroke work.
      if (context.state === 'suspended') {
        void context.resume();
      }
      return context;
    } catch {
      return null;
    }
  };

  const play = (name: SoundName): void => {
    const audio = ensureContext();
    if (audio === null) {
      return;
    }

    const voice = VOICES[name];
    const start = audio.currentTime;

    voice.notes.forEach((frequency, index) => {
      const at = start + index * voice.length;
      const oscillator = audio.createOscillator();
      const amp = audio.createGain();

      oscillator.type = voice.type;
      oscillator.frequency.setValueAtTime(frequency, at);

      // A hard start or stop on a square wave clicks; the short ramps are
      // what make these read as blips rather than pops.
      amp.gain.setValueAtTime(0, at);
      amp.gain.linearRampToValueAtTime(voice.gain, at + 0.006);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + voice.length);

      oscillator.connect(amp).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + voice.length + 0.02);
    });
  };

  const dispose = (): void => {
    void context?.close();
    context = null;
  };

  return { play, dispose };
}
