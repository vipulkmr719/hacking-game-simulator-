import { useEffect, useRef } from 'react';
import type { TerminalLine } from '../../game/engine';
import { TerminalInput } from './TerminalInput';
import { TerminalOutput } from './TerminalOutput';

interface TerminalProps {
  readonly lines: readonly TerminalLine[];
  readonly onSubmit: (value: string) => void;
  readonly onComplete: (value: string) => string | null;
  readonly onRecallOlder: () => string;
  readonly onRecallNewer: () => string;
  readonly onKeypress: () => void;
}

export function Terminal({
  lines,
  onSubmit,
  onComplete,
  onRecallOlder,
  onRecallNewer,
  onKeypress,
}: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node !== null) {
      node.scrollTop = node.scrollHeight;
    }
  }, [lines]);

  /**
   * Tapping anywhere in the scrollback focuses the input.
   *
   * On a phone the input is a thin strip at the bottom; making the whole
   * panel a target means a missed tap does not silently do nothing. A tap that
   * is actually a text selection is left alone.
   */
  const focusInput = () => {
    if ((globalThis.getSelection()?.toString().length ?? 0) > 0) {
      return;
    }
    document.getElementById('terminal-input')?.focus();
  };

  return (
    <section className="terminal" aria-label="Simulation terminal">
      <div
        className="terminal__scroll"
        ref={scrollRef}
        onPointerUp={focusInput}
        // Presentational: the input below is the real control, and it is
        // reachable by keyboard on its own.
        role="presentation"
      >
        <TerminalOutput lines={lines} />
      </div>
      <TerminalInput
        onSubmit={onSubmit}
        onComplete={onComplete}
        onRecallOlder={onRecallOlder}
        onRecallNewer={onRecallNewer}
        onKeypress={onKeypress}
      />
    </section>
  );
}
