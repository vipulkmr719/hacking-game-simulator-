import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../app/App';

/**
 * Renders the app and gets to a playable terminal.
 *
 * The application boots at the menu with no contract loaded, so a test that
 * wants to play has to walk the same route a player does.
 */
beforeEach(() => {
  // The app saves on every render, so without this a later test in this file
  // would boot as a returning player and land in the terminal rather than the
  // menu.
  globalThis.localStorage.clear();
});

function renderPlaying() {
  const result = render(<App />);
  fireEvent.click(screen.getByRole('tab', { name: 'Terminal' }));
  type('start first-connection');
  return result;
}

function type(value: string) {
  const input = screen.getByLabelText('Terminal command');
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input);
  return input as HTMLInputElement;
}

describe('terminal component', () => {
  it('renders the boot banner', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'Terminal' }));
    // The product name also appears in the status bar, so scope to the log.
    const log = screen.getByRole('log');
    expect(within(log).getByText(/CYBER HACKER SIMULATOR/)).toBeDefined();
    expect(within(log).getByText(/Type "help" for commands/)).toBeDefined();
  });

  it('echoes the command and renders its output', () => {
    renderPlaying();
    type('help');
    const log = screen.getByRole('log');
    expect(within(log).getByText('> help')).toBeDefined();
    expect(within(log).getByText('AVAILABLE COMMANDS')).toBeDefined();
  });

  it('shows the unrecognized-command message for unknown input', () => {
    renderPlaying();
    type('xyzzy');
    const log = screen.getByRole('log');
    expect(within(log).getByText('Command not recognized.')).toBeDefined();
    expect(within(log).getByText('Type "help" for available commands.')).toBeDefined();
  });

  it('redirects nmap to the game scan command', () => {
    renderPlaying();
    type('nmap acme.local');
    const log = screen.getByRole('log');
    expect(within(log).getByText('"nmap" is not part of this simulation.')).toBeDefined();
    expect(within(log).getByText('This simulation uses "scan".')).toBeDefined();
  });

  it('clears the input after submitting', () => {
    renderPlaying();
    const input = type('status');
    expect(input.value).toBe('');
  });

  it('clears scrollback when the clear command runs', () => {
    renderPlaying();
    type('help');
    expect(within(screen.getByRole('log')).queryByText('AVAILABLE COMMANDS')).not.toBeNull();
    type('clear');
    expect(within(screen.getByRole('log')).queryByText('AVAILABLE COMMANDS')).toBeNull();
  });

  it('renders player figures in the status bar and updates them', () => {
    renderPlaying();
    const bar = screen.getByRole('banner');
    expect(within(bar).getByText('LVL')).toBeDefined();
    expect(within(bar).getByText('500')).toBeDefined();
  });

  it('shows a zeroed trace for a freshly started contract', () => {
    renderPlaying();
    expect(within(screen.getByRole('banner')).getByText('0%')).toBeDefined();
  });

  it('recalls the previous command with ArrowUp', () => {
    renderPlaying();
    type('status');
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('status');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('');
  });

  it('walks back through several commands', () => {
    renderPlaying();
    type('help');
    type('status');
    type('inventory');
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('inventory');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('status');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('help');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('status');
  });

  it('does not record blank submissions in history', () => {
    renderPlaying();
    type('help');
    type('   ');
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('help');
  });

  it('completes a unique command name on Tab', () => {
    renderPlaying();
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.change(input, { target: { value: 'inv' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('inventory ');
  });

  it('lists candidates and fills the shared prefix on an ambiguous Tab', () => {
    renderPlaying();
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.change(input, { target: { value: 'i' } });
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(input.value).toBe('in');
    expect(screen.getByRole('log').textContent).toContain('inspect  inventory');
  });

  it('leaves the input alone when Tab matches nothing', () => {
    renderPlaying();
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.change(input, { target: { value: 'nmap' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('nmap');
  });

  it('runs a completed command end to end', () => {
    renderPlaying();
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.change(input, { target: { value: 'sc' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    fireEvent.submit(input);

    expect(screen.getByRole('log').textContent).toContain('3 host(s) mapped.');
  });

  it('runs the recon chain and updates the trace readout', () => {
    renderPlaying();
    type('scan');
    type('ports edge-gateway');
    type('analyze 443');

    const log = screen.getByRole('log');
    expect(log.textContent).toContain('perimeter-gateway');
    expect(within(screen.getByRole('banner')).getByText('15%')).toBeDefined();
  });

  it('drives the mission panel from engine state alone', () => {
    renderPlaying();
    const panel = screen.getByLabelText('Active contract');

    expect(within(panel).getByText('First Connection')).toBeDefined();
    expect(within(panel).getByText('1/3')).toBeDefined();

    type('scan');
    expect(within(panel).getByText('2/3')).toBeDefined();

    type('ports edge-gateway');
    type('analyze 443');
    expect(within(panel).getByText(/All objectives met/)).toBeDefined();
  });

  it('shows the panel emptying when the contract is dropped', () => {
    renderPlaying();
    type('abort');
    expect(within(screen.getByLabelText('Active contract')).getByText(/No active contract/)).toBeDefined();
  });

  it('switches to the progression screen and back', () => {
    renderPlaying();
    expect(screen.getByLabelText('Active contract')).toBeDefined();

    fireEvent.click(screen.getByRole('tab', { name: 'Progression' }));
    const screenPanel = screen.getByRole('tabpanel');
    expect(within(screenPanel).getByText('OPERATOR')).toBeDefined();
    expect(screen.queryByLabelText('Active contract')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Terminal' }));
    expect(screen.getByLabelText('Active contract')).toBeDefined();
  });

  it('marks the active tab for assistive technology', () => {
    render(<App />);
    // A fresh profile opens at the menu rather than inside a contract.
    expect(screen.getByRole('tab', { name: 'Menu' }).getAttribute('aria-selected')).toBe('true');

    fireEvent.click(screen.getByRole('tab', { name: 'Progression' }));
    expect(screen.getByRole('tab', { name: 'Progression' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Menu' }).getAttribute('aria-selected')).toBe('false');
  });

  it('reflects play on the progression screen', () => {
    renderPlaying();
    type('scan');
    type('ports edge-gateway');
    type('analyze 443');
    type('escape');

    fireEvent.click(screen.getByRole('tab', { name: 'Progression' }));
    const panel = screen.getByRole('tabpanel');

    // 120 from the contract plus 60 from the First Contract achievement.
    expect(within(panel).getByText('180')).toBeDefined();
    expect(within(panel).getByText('1/10')).toBeDefined();
    expect(within(panel).getByText('First Contract').closest('li')?.getAttribute('data-unlocked')).toBe('yes');
  });

  it('buys a tool from the screen through the same engine path', () => {
    renderPlaying();
    // Enough credits to afford the advanced scanner outright is not the
    // starting state, so the control must be disabled rather than absent.
    fireEvent.click(screen.getByRole('tab', { name: 'Progression' }));
    const panel = screen.getByRole('tabpanel');
    const buys = within(panel).getAllByRole('button');

    expect(buys.length).toBeGreaterThan(0);
    expect(buys.every((button) => button.hasAttribute('disabled'))).toBe(true);
  });

  it('ignores blank submissions', () => {
    renderPlaying();
    const before = screen.getByRole('log').textContent;
    type('   ');
    expect(screen.getByRole('log').textContent).toBe(before);
  });

  it('renders markup in a command argument as inert text', () => {
    renderPlaying();
    // `help` takes an optional argument, so this parses and the markup comes
    // back through the output path — exactly where injection would show up.
    type('help <script>alert(1)</script>');
    const log = screen.getByRole('log');

    expect(log.querySelector('script')).toBeNull();
    expect(log.querySelector('img')).toBeNull();
    expect(log.textContent).toContain('No help entry for "<script>alert(1)</script>".');
  });

  it('renders markup in an unknown command as inert text', () => {
    renderPlaying();
    type('<img src=x onerror=alert(1)>');
    const log = screen.getByRole('log');

    expect(log.querySelector('img')).toBeNull();
    expect(log.textContent).toContain('Command not recognized.');
  });

  it('exposes no control that does nothing', () => {
    renderPlaying();
    // Every button on the terminal view, named. A control appearing here that
    // is not in this list is a placeholder, which the UI rules forbid.
    const names = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent.trim());

    expect(names.sort()).toEqual(['Mute sound effects', 'Run']);
  });

  it('toggles sound and says which state it is in', () => {
    render(<App />);
    const mute = screen.getByRole('button', { name: 'Mute sound effects' });
    expect(mute.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(mute);
    const unmute = screen.getByRole('button', { name: 'Unmute sound effects' });
    expect(unmute.getAttribute('aria-pressed')).toBe('true');
  });

  it('moves between views with arrow keys', () => {
    render(<App />);
    const selected = () =>
      screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true')
        ?.textContent;

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Menu' }), { key: 'ArrowRight' });
    expect(selected()).toBe('Terminal');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Terminal' }), { key: 'ArrowRight' });
    expect(selected()).toBe('Contracts');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Contracts' }), { key: 'ArrowLeft' });
    expect(selected()).toBe('Terminal');
  });

  it('wraps around at both ends of the tab list', () => {
    render(<App />);
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    const selected = () =>
      screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true')
        ?.textContent;

    // A fresh profile starts on the first tab; stepping left must wrap to the
    // last rather than stopping.
    expect(selected()).toBe(tabs[0]);
    fireEvent.keyDown(screen.getByRole('tab', { name: tabs[0]! }), { key: 'ArrowLeft' });
    expect(selected()).toBe(tabs.at(-1));

    fireEvent.keyDown(screen.getByRole('tab', { name: tabs.at(-1)! }), { key: 'ArrowRight' });
    expect(selected()).toBe(tabs[0]);
  });

  it('keeps only the selected tab in the tab order', () => {
    render(<App />);
    const selectedTabs = screen
      .getAllByRole('tab')
      .filter((tab) => tab.getAttribute('tabindex') === '0');

    // Exactly one stop for the whole tab list, which is what the pattern promises.
    expect(selectedTabs).toHaveLength(1);
    expect(selectedTabs[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('animates only the lines the last command produced', () => {
    renderPlaying();
    type('help');
    const entering = screen
      .getByRole('log')
      .querySelectorAll('.terminal__line[data-enter="yes"]');

    // The boot banner is already on screen; only the new output enters.
    expect(entering.length).toBeGreaterThan(0);
    expect(entering.length).toBeLessThan(screen.getByRole('log').children.length);
  });

  it('focuses the input when the scrollback is tapped', () => {
    renderPlaying();
    const input = screen.getByLabelText('Terminal command');
    input.blur();
    expect(document.activeElement).not.toBe(input);

    fireEvent.pointerUp(screen.getByRole('log').parentElement!);
    expect(document.activeElement).toBe(input);
  });
});
