import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MissionSelect } from './MissionSelect';
import type { MissionListEntry } from '../../game/missions/selectors';

const entries: readonly MissionListEntry[] = [
  {
    number: 1,
    id: 'first-connection',
    title: 'First Connection',
    organization: 'Acme Dynamics',
    difficulty: 'trivial',
    status: 'completed',
    blockers: [],
    reward: { xp: 120, credits: 250, reputation: 5 },
    briefing: 'A briefing.',
    objectiveDescriptions: ['Do the thing.'],
    isActive: false,
  },
  {
    number: 2,
    id: 'open-ports',
    title: 'Open Ports',
    organization: 'NovaBank',
    difficulty: 'low',
    status: 'available',
    blockers: [],
    reward: { xp: 160, credits: 320, reputation: 6 },
    briefing: 'A briefing.',
    objectiveDescriptions: ['Do the thing.'],
    isActive: true,
  },
  {
    number: 3,
    id: 'hidden-service',
    title: 'Hidden Service',
    organization: 'Helix Labs',
    difficulty: 'low',
    status: 'available',
    blockers: [],
    reward: { xp: 220, credits: 450, reputation: 8 },
    briefing: 'A briefing.',
    objectiveDescriptions: ['Do the thing.'],
    isActive: false,
  },
  {
    number: 10,
    id: 'final-operation',
    title: 'Final Operation',
    organization: 'Aegis Consortium',
    difficulty: 'severe',
    status: 'locked',
    blockers: ['requires level 8', 'requires tool "analysis-toolkit"'],
    reward: { xp: 1400, credits: 3000, reputation: 35 },
    briefing: 'A briefing.',
    objectiveDescriptions: ['Do the thing.'],
    isActive: false,
  },
];

const noop = () => undefined;

describe('contract board', () => {
  it('shows every contract with its number', () => {
    const { container } = render(<MissionSelect missions={entries} onSelect={noop} />);
    // Scoped to cards: unlock requirements are list items too.
    expect(container.querySelectorAll('.contract-card')).toHaveLength(4);
    expect(screen.getByText('01')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
  });

  it('shows title, organization and difficulty', () => {
    render(<MissionSelect missions={entries} onSelect={noop} />);
    const card = screen.getByText('Hidden Service').closest('li')!;
    expect(within(card).getByText('Helix Labs')).toBeDefined();
    expect(within(card).getByText('low')).toBeDefined();
  });

  it('shows the reward', () => {
    render(<MissionSelect missions={entries} onSelect={noop} />);
    const card = screen.getByText('Final Operation').closest('li')!;
    expect(within(card).getByText('1400')).toBeDefined();
    expect(within(card).getByText('3000')).toBeDefined();
    expect(within(card).getByText('35')).toBeDefined();
  });

  it('shows each of the three statuses', () => {
    render(<MissionSelect missions={entries} onSelect={noop} />);
    expect(screen.getByText('COMPLETED')).toBeDefined();
    expect(screen.getAllByText('AVAILABLE')).toHaveLength(2);
    expect(screen.getByText('LOCKED')).toBeDefined();
  });

  it('states the unlock requirements of a locked contract', () => {
    render(<MissionSelect missions={entries} onSelect={noop} />);
    expect(screen.getByText('requires level 8')).toBeDefined();
    expect(screen.getByText('requires tool "analysis-toolkit"')).toBeDefined();
  });

  it('counts completed contracts', () => {
    render(<MissionSelect missions={entries} onSelect={noop} />);
    expect(screen.getByText('1/4')).toBeDefined();
  });

  it('opens the briefing for a contract, by id', () => {
    const onSelect = vi.fn();
    render(<MissionSelect missions={entries} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Brief' }));
    expect(onSelect).toHaveBeenCalledWith('hidden-service');
  });

  it('offers a replay on a completed contract', () => {
    const onSelect = vi.fn();
    render(<MissionSelect missions={entries} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(onSelect).toHaveBeenCalledWith('first-connection');
  });

  it('lets a locked contract be inspected, since its briefing explains the lock', () => {
    const onSelect = vi.fn();
    render(<MissionSelect missions={entries} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(onSelect).toHaveBeenCalledWith('final-operation');
  });

  it('marks the active contract instead of offering to start it again', () => {
    render(<MissionSelect missions={entries} onSelect={noop} />);
    const card = screen.getByText('Open Ports').closest('li')!;
    expect(within(card).getByText('Active contract')).toBeDefined();
    expect(within(card).queryByRole('button')).toBeNull();
  });
});
