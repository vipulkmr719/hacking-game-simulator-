/**
 * The panel renders whatever the selector hands it and decides nothing.
 * These tests drive it with plain view objects for that reason.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  threatLevel: 'safe',
  threatLabel: 'SAFE',
  threatDescription: 'Nothing is watching you closely.',
  stealthActionsLeft: 3,
  accessLevel: 'none',
  objectives: [
    { id: 'a', description: 'Sweep the target.', optional: false, complete: true },
    { id: 'b', description: 'Identify the service.', optional: false, complete: false },
    { id: 'c', description: 'Stay quiet.', optional: true, complete: true },
  ],
  readyToExtract: false,
  outstandingCount: 1,
  failed: false,
  failureReason: null,
};

const noop = () => undefined;

describe('mission panel', () => {
  it('invites the player to pick one when nothing is loaded', () => {
    render(<MissionPanel mission={null} onRetry={noop} />);
    expect(screen.getByText(/No active contract/)).toBeDefined();
  });

  it('shows the contract and client', () => {
    render(<MissionPanel mission={base} onRetry={noop} />);
    expect(screen.getByText('First Connection')).toBeDefined();
    expect(screen.getByText(/Acme Dynamics/)).toBeDefined();
  });

  it('lists every objective with its completion mark', () => {
    render(<MissionPanel mission={base} onRetry={noop} />);
    const items = screen.getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(items[0]?.getAttribute('data-complete')).toBe('yes');
    expect(items[1]?.getAttribute('data-complete')).toBe('no');
  });

  it('counts completed objectives', () => {
    render(<MissionPanel mission={base} onRetry={noop} />);
    expect(screen.getByText('2/3')).toBeDefined();
  });

  it('marks the optional objective as a bonus', () => {
    render(<MissionPanel mission={base} onRetry={noop} />);
    const bonus = screen.getAllByRole('listitem')[2]!;
    expect(within(bonus).getByText('bonus')).toBeDefined();
  });

  it('exposes trace as an accessible progress bar naming the band', () => {
    render(<MissionPanel mission={base} onRetry={noop} />);
    const bar = screen.getByRole('progressbar', { name: 'Trace' });
    expect(bar.getAttribute('aria-valuenow')).toBe('20');
    expect(bar.getAttribute('aria-valuetext')).toBe('20 percent, SAFE');
  });

  it('shows the threat band and what it means', () => {
    render(<MissionPanel mission={base} onRetry={noop} />);
    expect(screen.getByText('SAFE')).toBeDefined();
    expect(screen.getByText('Nothing is watching you closely.')).toBeDefined();
  });

  it('marks the panel with the band so the whole card can react', () => {
    const { container } = render(
      <MissionPanel
        mission={{ ...base, threatLevel: 'critical', threatLabel: 'CRITICAL' }}
        onRetry={noop}
      />,
    );
    expect(container.querySelector('.mission')?.getAttribute('data-threat')).toBe('critical');
  });

  it('shows the remaining stealth budget', () => {
    render(<MissionPanel mission={{ ...base, stealthActionsLeft: 1 }} onRetry={noop} />);
    expect(screen.getByText('1/3')).toBeDefined();
  });

  it('fills the bar to the trace value', () => {
    const { container } = render(
      <MissionPanel mission={{ ...base, detection: 62 }} onRetry={noop} />,
    );
    const fill = container.querySelector('.mission__bar-fill');
    expect((fill as HTMLElement | null)?.style.width).toBe('62%');
  });

  it('reports outstanding work', () => {
    render(<MissionPanel mission={base} onRetry={noop} />);
    expect(screen.getByText('1 outstanding')).toBeDefined();
  });

  it('says extraction is available when it is', () => {
    render(<MissionPanel mission={{ ...base, readyToExtract: true, outstandingCount: 0 }} onRetry={noop} />);
    expect(screen.getByText(/All objectives met/)).toBeDefined();
  });

  it('reports a failure with its reason', () => {
    render(
      <MissionPanel
        mission={{ ...base, status: 'failed', failed: true, failureReason: 'Trace reached 100%.' }}
        onRetry={noop}
      />,
    );
    expect(screen.getByText(/MISSION FAILED — Trace reached 100%\./)).toBeDefined();
  });

  it('offers a way out of a failed contract rather than a dead end', () => {
    const onRetry = vi.fn();
    render(
      <MissionPanel
        mission={{ ...base, status: 'failed', failed: true, failureReason: 'Trace reached 100%.' }}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry contract' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows no retry control while the contract is live', () => {
    render(<MissionPanel mission={base} onRetry={noop} />);
    expect(screen.queryByRole('button', { name: 'Retry contract' })).toBeNull();
  });
});
