/**
 * The screen renders what the selector hands it and decides nothing, so these
 * drive it with plain view objects.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProgressionScreen } from './ProgressionScreen';
import type { ProgressionView } from '../../game/progression/selectors';

const view: ProgressionView = {
  level: 4,
  xp: 1050,
  xpIntoLevel: 150,
  xpForLevel: 500,
  xpUntilNextLevel: 350,
  levelProgress: 0.3,
  credits: 800,
  reputation: 21,
  tools: [
    {
      id: 'basic-scanner',
      name: 'Basic Scanner',
      category: 'scanner',
      description: 'Maps hosts.',
      cost: 0,
      requiredLevel: 1,
      detectionMultiplier: 1,
      status: 'owned',
      blocker: null,
    },
    {
      id: 'advanced-scanner',
      name: 'Advanced Scanner',
      category: 'scanner',
      description: 'Resolves versions.',
      cost: 750,
      requiredLevel: 3,
      detectionMultiplier: 0.9,
      status: 'affordable',
      blocker: null,
    },
    {
      id: 'stealth-module',
      name: 'Stealth Module',
      category: 'stealth',
      description: 'Reduces trace.',
      cost: 1600,
      requiredLevel: 6,
      detectionMultiplier: 0.6,
      status: 'level-locked',
      blocker: 'needs level 6',
    },
    {
      id: 'decoder',
      name: 'Decoder',
      category: 'decoder',
      description: 'Cipher puzzles.',
      cost: 900,
      requiredLevel: 4,
      detectionMultiplier: 1,
      status: 'too-expensive',
      blocker: 'needs 100 more CR',
    },
  ],
  toolsOwned: 1,
  contracts: [
    { id: 'first-connection', title: 'First Connection', organization: 'Acme', completed: true, locked: false },
    { id: 'open-ports', title: 'Open Ports', organization: 'NovaBank', completed: false, locked: false },
    { id: 'final-operation', title: 'Final Operation', organization: 'Aegis', completed: false, locked: true },
  ],
  contractsCompleted: 1,
  achievements: [
    { id: 'first-contract', name: 'First Contract', description: 'Close one.', xp: 60, unlocked: true },
    { id: 'ghost', name: 'Ghost', description: 'Slip past.', xp: 200, unlocked: false },
  ],
  achievementsUnlocked: 1,
  statistics: {
    commandsExecuted: 42,
    missionsAttempted: 3,
    missionsCompleted: 1,
    missionsFailed: 1,
    creditsSpent: 750,
    toolsPurchased: 1,
  },
};

const noop = () => undefined;

describe('progression screen', () => {
  it('shows the level and its XP band', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    expect(screen.getByText('4')).toBeDefined();
    expect(screen.getByText('150 / 500 XP')).toBeDefined();
    expect(screen.getByText('350 to next')).toBeDefined();
  });

  it('exposes level progress as an accessible meter', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    const bar = screen.getByRole('progressbar', { name: 'Level progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
  });

  it('shows credits and reputation', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    expect(screen.getByText('800')).toBeDefined();
    expect(screen.getByText('21')).toBeDefined();
  });

  it('lists every tool with its counts', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    expect(screen.getByText('1/4')).toBeDefined();
    expect(screen.getByText('Basic Scanner')).toBeDefined();
    expect(screen.getByText('Stealth Module')).toBeDefined();
  });

  it('marks an owned tool rather than offering to sell it again', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    expect(screen.getByText('OWNED')).toBeDefined();
  });

  it('enables buying only what the player can actually afford', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    const buy = screen.getByRole('button', { name: 'Buy' });
    expect(buy.hasAttribute('disabled')).toBe(false);
  });

  it('disables a blocked purchase and says why on the control itself', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    const locked = screen.getByRole('button', { name: 'needs level 6' });
    expect(locked.hasAttribute('disabled')).toBe(true);

    const poor = screen.getByRole('button', { name: 'needs 100 more CR' });
    expect(poor.hasAttribute('disabled')).toBe(true);
  });

  it('asks the engine to buy when the control is used', () => {
    const onBuyTool = vi.fn();
    render(<ProgressionScreen progression={view} onBuyTool={onBuyTool} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));
    expect(onBuyTool).toHaveBeenCalledWith('advanced-scanner');
  });

  it('does not fire for a disabled control', () => {
    const onBuyTool = vi.fn();
    render(<ProgressionScreen progression={view} onBuyTool={onBuyTool} />);
    fireEvent.click(screen.getByRole('button', { name: 'needs level 6' }));
    expect(onBuyTool).not.toHaveBeenCalled();
  });

  it('lists contracts with completion and lock state', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    const items = screen.getAllByText(/First Connection|Open Ports|Final Operation/);
    expect(items).toHaveLength(3);

    const done = screen.getByText('First Connection').closest('li');
    expect(done?.getAttribute('data-state')).toBe('done');
    expect(screen.getByText('Final Operation').closest('li')?.getAttribute('data-state')).toBe(
      'locked',
    );
  });

  it('lists achievements, unlocked and not', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    expect(screen.getByText('Close one.')).toBeDefined();
    expect(screen.getByText('Slip past.')).toBeDefined();
    expect(screen.getByText('First Contract').closest('li')?.getAttribute('data-unlocked')).toBe(
      'yes',
    );
    expect(screen.getByText('Ghost').closest('li')?.getAttribute('data-unlocked')).toBe('no');
  });

  it('shows the statistics block', () => {
    render(<ProgressionScreen progression={view} onBuyTool={noop} />);
    const stats = screen.getByText('STATISTICS').closest('section')!;
    expect(within(stats).getByText('42')).toBeDefined();
    expect(within(stats).getByText('750')).toBeDefined();
  });
});
