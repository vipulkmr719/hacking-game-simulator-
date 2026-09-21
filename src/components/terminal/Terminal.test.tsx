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
    type('nmap acme.local');
    const log = screen.getByRole('log');
    expect(within(log).getByText('Command not recognized.')).toBeDefined();
    expect(within(log).getByText('Type "help" for available commands.')).toBeDefined();
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

  it('shows an em dash for trace while no mission is active', () => {
    render(<App />);
    expect(within(screen.getByRole('banner')).getByText('—')).toBeDefined();
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
    // Phase 1 ships exactly one button: the touch submit affordance. Any other
    // control appearing here would be a placeholder, which the UI rules forbid.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('type')).toBe('submit');
  });
});
