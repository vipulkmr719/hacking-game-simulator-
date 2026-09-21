/**
 * Sound mapping.
 *
 * Tested through the hook's public surface rather than by reaching into Web
 * Audio: what matters is which events make a noise, not the shape of the wave.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '../game/engine';

const played: string[] = [];

beforeEach(() => {
  played.length = 0;
  // Reset first: a module already imported would have pulled in the real
  // synth before the mock was registered.
  vi.resetModules();
  vi.doMock('./synth', () => ({
    createSoundPlayer: () => ({
      play: (name: string) => played.push(name),
      dispose: () => undefined,
    }),
  }));
  try {
    globalThis.localStorage.clear();
  } catch {
    // jsdom always provides storage; a throw here is not this test's concern.
  }
});

afterEach(() => {
  vi.doUnmock('./synth');
  vi.resetModules();
});

async function mounted() {
  const { useSoundEffects: hook } = await import('./useSoundEffects');
  return renderHook(() => hook());
}

describe('sound mapping', () => {
  it('plays one voice per distinct event kind', async () => {
    const { result } = await mounted();
    act(() => {
      result.current.playFor([
        { type: 'COMMAND_EXECUTED', commandId: 'scan' },
        { type: 'OBJECTIVE_COMPLETED', missionId: 'm', objectiveId: 'o', optional: false },
      ]);
    });
    expect(played).toEqual(['execute', 'objective']);
  });

  it('does not repeat a voice when one command fires it twice', async () => {
    const { result } = await mounted();
    const twice: readonly GameEvent[] = [
      { type: 'OBJECTIVE_COMPLETED', missionId: 'm', objectiveId: 'a', optional: false },
      { type: 'OBJECTIVE_COMPLETED', missionId: 'm', objectiveId: 'b', optional: false },
    ];
    act(() => {
      result.current.playFor(twice);
    });
    expect(played).toEqual(['objective']);
  });

  it('stays quiet for events with nothing to say', async () => {
    const { result } = await mounted();
    act(() => {
      result.current.playFor([
        { type: 'TERMINAL_CLEARED' },
        { type: 'DETECTION_CHANGED', previous: 0, current: 5 },
        { type: 'SECURITY_EVENT', level: 'safe', message: 'x' },
      ]);
    });
    expect(played).toEqual([]);
  });

  it('warns only on the bands that mean trouble', async () => {
    const { result } = await mounted();
    act(() => {
      result.current.playFor([
        { type: 'THREAT_LEVEL_CHANGED', previous: 'safe', current: 'suspicious', detection: 30 },
      ]);
    });
    expect(played).toEqual([]);

    act(() => {
      result.current.playFor([
        { type: 'THREAT_LEVEL_CHANGED', previous: 'alert', current: 'critical', detection: 80 },
      ]);
    });
    expect(played).toEqual(['warn']);
  });

  it('is silent while muted', async () => {
    const { result } = await mounted();
    act(() => {
      result.current.toggleMuted();
    });
    act(() => {
      result.current.playFor([{ type: 'COMMAND_EXECUTED', commandId: 'scan' }]);
      result.current.playKeypress();
    });
    expect(played).toEqual([]);
  });

  it('remembers the mute preference', async () => {
    const first = await mounted();
    act(() => {
      first.result.current.toggleMuted();
    });
    expect(first.result.current.muted).toBe(true);

    vi.resetModules();
    const second = await mounted();
    expect(second.result.current.muted).toBe(true);
  });

  it('starts audible on a first visit', async () => {
    const { result } = await mounted();
    expect(result.current.muted).toBe(false);
  });
});
