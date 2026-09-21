import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../app/App';

function type(value: string) {
  const input = screen.getByLabelText('Terminal command');
  fireEvent.change(input, { target: { value } });
  fireEvent.submit(input);
  return input as HTMLInputElement;
}

describe('terminal component', () => {
  it('renders the boot banner', () => {
    render(<App />);
    // The product name also appears in the status bar, so scope to the log.
    const log = screen.getByRole('log');
    expect(within(log).getByText(/CYBER HACKER SIMULATOR/)).toBeDefined();
    expect(within(log).getByText(/Type "help" to begin\./)).toBeDefined();
  });

  it('echoes the command and renders its output', () => {
    render(<App />);
    type('help');
    const log = screen.getByRole('log');
    expect(within(log).getByText('> help')).toBeDefined();
    expect(within(log).getByText('AVAILABLE COMMANDS')).toBeDefined();
  });

  it('shows the unrecognized-command message for unknown input', () => {
    render(<App />);
    type('xyzzy');
    const log = screen.getByRole('log');
    expect(within(log).getByText('Command not recognized.')).toBeDefined();
    expect(within(log).getByText('Type "help" for available commands.')).toBeDefined();
  });

  it('redirects nmap to the game scan command', () => {
    render(<App />);
    type('nmap acme.local');
    const log = screen.getByRole('log');
    expect(within(log).getByText('"nmap" is not part of this simulation.')).toBeDefined();
    expect(within(log).getByText('This simulation uses "scan".')).toBeDefined();
  });

  it('clears the input after submitting', () => {
    render(<App />);
    const input = type('status');
    expect(input.value).toBe('');
  });

  it('clears scrollback when the clear command runs', () => {
    render(<App />);
    type('help');
    expect(within(screen.getByRole('log')).queryByText('AVAILABLE COMMANDS')).not.toBeNull();
    type('clear');
    expect(within(screen.getByRole('log')).queryByText('AVAILABLE COMMANDS')).toBeNull();
  });

  it('renders player figures in the status bar and updates them', () => {
    render(<App />);
    const bar = screen.getByRole('banner');
    expect(within(bar).getByText('LVL')).toBeDefined();
    expect(within(bar).getByText('500')).toBeDefined();
  });

  it('shows a zeroed trace for the freshly loaded session', () => {
    render(<App />);
    expect(within(screen.getByRole('banner')).getByText('0%')).toBeDefined();
  });

  it('recalls the previous command with ArrowUp', () => {
    render(<App />);
    type('status');
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('status');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('');
  });

  it('walks back through several commands', () => {
    render(<App />);
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
    render(<App />);
    type('help');
    type('   ');
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('help');
  });

  it('completes a unique command name on Tab', () => {
    render(<App />);
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.change(input, { target: { value: 'inv' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('inventory ');
  });

  it('lists candidates and fills the shared prefix on an ambiguous Tab', () => {
    render(<App />);
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.change(input, { target: { value: 'i' } });
    fireEvent.keyDown(input, { key: 'Tab' });

    expect(input.value).toBe('in');
    expect(screen.getByRole('log').textContent).toContain('inspect  inventory');
  });

  it('leaves the input alone when Tab matches nothing', () => {
    render(<App />);
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.change(input, { target: { value: 'nmap' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('nmap');
  });

  it('runs a completed command end to end', () => {
    render(<App />);
    const input = screen.getByLabelText<HTMLInputElement>('Terminal command');
    fireEvent.change(input, { target: { value: 'sc' } });
    fireEvent.keyDown(input, { key: 'Tab' });
    fireEvent.submit(input);

    expect(screen.getByRole('log').textContent).toContain('3 host(s) mapped.');
  });

  it('runs the recon chain and updates the trace readout', () => {
    render(<App />);
    type('scan');
    type('ports edge-gateway');
    type('analyze 443');

    const log = screen.getByRole('log');
    expect(log.textContent).toContain('perimeter-gateway');
    expect(within(screen.getByRole('banner')).getByText('15%')).toBeDefined();
  });

  it('drives the mission panel from engine state alone', () => {
    render(<App />);
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
    render(<App />);
    type('abort');
    expect(within(screen.getByLabelText('Active contract')).getByText(/No active contract/)).toBeDefined();
  });

  it('switches to the progression screen and back', () => {
    render(<App />);
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
    expect(screen.getByRole('tab', { name: 'Terminal' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Progression' }));
    expect(screen.getByRole('tab', { name: 'Progression' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('reflects play on the progression screen', () => {
    render(<App />);
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
    render(<App />);
    // Enough credits to afford the advanced scanner outright is not the
    // starting state, so the control must be disabled rather than absent.
    fireEvent.click(screen.getByRole('tab', { name: 'Progression' }));
    const panel = screen.getByRole('tabpanel');
    const buys = within(panel).getAllByRole('button');

    expect(buys.length).toBeGreaterThan(0);
    expect(buys.every((button) => button.hasAttribute('disabled'))).toBe(true);
  });

  it('ignores blank submissions', () => {
    render(<App />);
    const before = screen.getByRole('log').textContent;
    type('   ');
    expect(screen.getByRole('log').textContent).toBe(before);
  });

  it('renders markup in a command argument as inert text', () => {
    render(<App />);
    // `help` takes an optional argument, so this parses and the markup comes
    // back through the output path — exactly where injection would show up.
    type('help <script>alert(1)</script>');
    const log = screen.getByRole('log');

    expect(log.querySelector('script')).toBeNull();
    expect(log.querySelector('img')).toBeNull();
    expect(log.textContent).toContain('No help entry for "<script>alert(1)</script>".');
  });

  it('renders markup in an unknown command as inert text', () => {
    render(<App />);
    type('<img src=x onerror=alert(1)>');
    const log = screen.getByRole('log');

    expect(log.querySelector('img')).toBeNull();
    expect(log.textContent).toContain('Command not recognized.');
  });

  it('exposes no control that does nothing', () => {
    render(<App />);
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
    const terminalTab = screen.getByRole('tab', { name: 'Terminal' });

    fireEvent.keyDown(terminalTab, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Progression' }).getAttribute('aria-selected')).toBe(
      'true',
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Progression' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Terminal' }).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps only the selected tab in the tab order', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Terminal' }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tab', { name: 'Progression' }).getAttribute('tabindex')).toBe('-1');
  });

  it('animates only the lines the last command produced', () => {
    render(<App />);
    type('help');
    const entering = screen
      .getByRole('log')
      .querySelectorAll('.terminal__line[data-enter="yes"]');

    // The boot banner is already on screen; only the new output enters.
    expect(entering.length).toBeGreaterThan(0);
    expect(entering.length).toBeLessThan(screen.getByRole('log').children.length);
  });

  it('focuses the input when the scrollback is tapped', () => {
    render(<App />);
    const input = screen.getByLabelText('Terminal command');
    input.blur();
    expect(document.activeElement).not.toBe(input);

    fireEvent.pointerUp(screen.getByRole('log').parentElement!);
    expect(document.activeElement).toBe(input);
  });
});
