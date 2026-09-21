import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('render exploded');
}

beforeEach(() => {
  // React logs the caught error; silence it so a passing suite is readable.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('error boundary', () => {
  it('renders its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>all fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('all fine')).toBeDefined();
  });

  it('shows a fault screen instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('INTERFACE FAULT')).toBeDefined();
  });

  it('surfaces the message rather than hiding it', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('render exploded')).toBeDefined();
  });

  it('reassures that nothing outside the page was touched', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/nothing outside this page was touched/i)).toBeDefined();
  });

  it('offers the only recovery that can work', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'Reload' })).toBeDefined();
  });
});
