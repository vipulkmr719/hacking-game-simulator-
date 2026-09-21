import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventOverlay, type EventLabels } from './EventOverlay';
import type { GameEvent } from '../../game/engine';
import type { StepEvents } from '../../hooks/useGameEngine';

const step = (id: number, events: readonly GameEvent[]): StepEvents => ({ id, events });

const labels: EventLabels = {
  missionTitle: (id) => (id === 'first-connection' ? 'First Connection' : id),
  achievementName: (id) => (id === 'first-contract' ? 'First Contract' : id),
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('event overlay', () => {
  it('shows nothing for an ordinary command', () => {
    render(<EventOverlay step={step(1, [{ type: 'COMMAND_EXECUTED', commandId: 'scan' }])} labels={labels} />);
    expect(screen.queryByText('LEVEL 2')).toBeNull();
  });

  it('announces a level', () => {
    render(<EventOverlay step={step(1, [{ type: 'LEVEL_REACHED', level: 4 }])} labels={labels} />);
    expect(screen.getByText('LEVEL 4')).toBeDefined();
  });

  it('announces a closed contract', () => {
    render(
      <EventOverlay
        step={step(1, [{ type: 'MISSION_COMPLETED', missionId: 'first-connection', rewarded: true }])}
        labels={labels}
      />,
    );
    expect(screen.getByText('CONTRACT CLOSED')).toBeDefined();
    // The contract's title, not its internal id.
    expect(screen.getByText('First Connection')).toBeDefined();
  });

  it('announces a failure with its reason', () => {
    render(
      <EventOverlay
        step={step(1, [
          { type: 'MISSION_FAILED', missionId: 'first-connection', reason: 'Trace reached 100%.' },
        ])}
        labels={labels}
      />,
    );
    expect(screen.getByText('MISSION FAILED')).toBeDefined();
    expect(screen.getByText('Trace reached 100%.')).toBeDefined();
  });

  it('warns only at critical, not at every band change', () => {
    const { rerender } = render(
      <EventOverlay
        step={step(1, [
          { type: 'THREAT_LEVEL_CHANGED', previous: 'safe', current: 'suspicious', detection: 30 },
        ])}
        labels={labels}
      />,
    );
    expect(screen.queryByText('CRITICAL')).toBeNull();

    rerender(
      <EventOverlay
        step={step(2, [
          { type: 'THREAT_LEVEL_CHANGED', previous: 'alert', current: 'critical', detection: 80 },
        ])}
        labels={labels}
      />,
    );
    expect(screen.getByText('CRITICAL')).toBeDefined();
  });

  it('shows the most consequential event when several arrive at once', () => {
    render(
      <EventOverlay
        step={step(1, [
          { type: 'LEVEL_REACHED', level: 5 },
          { type: 'MISSION_FAILED', missionId: 'm', reason: 'Trace reached 100%.' },
        ])}
        labels={labels}
      />,
    );
    // A lost contract outranks the level that came with it.
    expect(screen.getByText('MISSION FAILED')).toBeDefined();
    expect(screen.queryByText('LEVEL 5')).toBeNull();
  });

  it('names an achievement rather than printing its id', () => {
    render(
      <EventOverlay
        step={step(1, [{ type: 'ACHIEVEMENT_UNLOCKED', achievementId: 'first-contract' }])}
        labels={labels}
      />,
    );
    expect(screen.getByText('First Contract')).toBeDefined();
  });

  it('dismisses itself', () => {
    render(<EventOverlay step={step(1, [{ type: 'LEVEL_REACHED', level: 2 }])} labels={labels} />);
    expect(screen.getByText('LEVEL 2')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('LEVEL 2')).toBeNull();
  });

  it('replays for an identical event arriving again', () => {
    const events: readonly GameEvent[] = [{ type: 'LEVEL_REACHED', level: 2 }];
    const { rerender } = render(<EventOverlay step={step(1, events)} labels={labels} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('LEVEL 2')).toBeNull();

    // Same events, new step id: the second occurrence must be shown.
    rerender(<EventOverlay step={step(2, events)} labels={labels} />);
    expect(screen.getByText('LEVEL 2')).toBeDefined();
  });

  it('is an assertive live region, since each of these interrupts', () => {
    const { container } = render(<EventOverlay step={step(1, [])} labels={labels} />);
    const region = container.querySelector('.overlay');
    expect(region?.getAttribute('aria-live')).toBe('assertive');
    expect(region?.getAttribute('aria-atomic')).toBe('true');
  });
});
