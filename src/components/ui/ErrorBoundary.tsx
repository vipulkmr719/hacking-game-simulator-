import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly message: string | null;
}

/**
 * Last-resort error state.
 *
 * Without this, a throw anywhere in the tree unmounts the app and leaves a
 * blank page — the one screen that tells the player nothing at all. This keeps
 * the failure visible and offers the only recovery that can work when
 * component state is the suspect: a reload.
 *
 * A class is required; React exposes no hook equivalent of componentDidCatch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: error instanceof Error ? error.message : 'Unknown error' };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Nothing is reported anywhere: this game makes no network requests, so
    // the console is the only place a trace can usefully go.
    console.error('Interface error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { message } = this.state;
    if (message === null) {
      return this.props.children;
    }

    return (
      <div className="crash" role="alert">
        <h1 className="crash__title">INTERFACE FAULT</h1>
        <p className="crash__body">
          The interface stopped responding. The simulation itself is unaffected — nothing outside
          this page was touched.
        </p>
        <p className="crash__detail">{message}</p>
        <button
          type="button"
          className="crash__action"
          onClick={() => {
            globalThis.location.reload();
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
