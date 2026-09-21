/**
 * The panel renders whatever the selector hands it and decides nothing.
 * These tests drive it with plain view objects for that reason.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MissionPanel } from './MissionPanel';
import type { ActiveMissionView } from '../../game/missions/selectors';

const base: ActiveMissionView = {
  id: 'first-connection',
  title: 'First Connection',
  organization: 'Acme Dynamics',
  difficulty: 'trivial',
  briefing: 'A training contract.',
  status: 'active',
  detection: 20,
  accessLevel: 'none',
  objectives: [
    { id: 'a', description: 'Sweep the target.', optional: false, complete: true },
    { id: 'b', description: 'Identify the service.', optional: false, complete: false },
    { id: 'c', description: 'Stay quiet.', optional: true, complete: true },
  ],
  readyToExtract: false,
  outstandingCount: 1,
  failureReason: null,
};

describe('mission panel', () => {
  it('invites the player to pick one when nothing is loaded', () => {
    render(<MissionPanel mission={null} />);
    expect(screen.getByText(/No active contract/)).toBeDefined();
  });

  it('shows the contract and client', () => {
    render(<MissionPanel mission={base} />);
    expect(screen.getByText('First Connection')).toBeDefined();
    expect(screen.getByText(/Acme Dynamics/)).toBeDefined();
  });

  it('lists every objective with its completion mark', () => {
    render(<MissionPanel mission={base} />);
    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(items[0]?.getAttribute('data-complete')).toBe('yes');
    expect(items[1]?.getAttribute('data-complete')).toBe('no');
  });

  it('counts completed objectives', () => {
    render(<MissionPanel mission={base} />);
    expect(screen.getByText('2/3')).toBeDefined();
  });

  it('marks the optional objective as a bonus', () => {
    render(<MissionPanel mission={base} />);
    const bonus = screen.getAllByRole('listitem')[2]!;
    expect(within(bonus).getByText('bonus')).toBeDefined();
  });

  it('exposes trace as an accessible progress bar', () => {
    render(<MissionPanel mission={base} />);
    const bar = screen.getByRole('progressbar', { name: 'Trace' });
    expect(bar.getAttribute('aria-valuenow')).toBe('20');
  });

  it('escalates the trace bar as detection climbs', () => {
    const level = (detection: number) => {
      const { container, unmount } = render(
        <MissionPanel mission={{ ...base, detection }} />,
      );
      const value = container.querySelector('.mission__bar-fill')?.getAttribute('data-level');
      unmount();
      return value;
    };

    expect(level(10)).toBe('low');
    expect(level(60)).toBe('mid');
    expect(level(90)).toBe('high');
  });

  it('reports outstanding work', () => {
    render(<MissionPanel mission={base} />);
    expect(screen.getByText('1 outstanding')).toBeDefined();
  });

  it('says extraction is available when it is', () => {
    render(<MissionPanel mission={{ ...base, readyToExtract: true, outstandingCount: 0 }} />);
    expect(screen.getByText(/All objectives met/)).toBeDefined();
  });

  it('reports a failure with its reason', () => {
    render(
      <MissionPanel
        mission={{ ...base, status: 'failed', failureReason: 'Trace reached 100%.' }}
      />,
    );
    expect(screen.getByText(/Failed — Trace reached 100%\./)).toBeDefined();
  });
});
