import { useEffect, useRef } from 'react';
import type { TerminalLine } from '../../game/engine';
import { TerminalInput } from './TerminalInput';
import { TerminalOutput } from './TerminalOutput';

interface TerminalProps {
  readonly lines: readonly TerminalLine[];
  readonly history: readonly string[];
  readonly onSubmit: (value: string) => void;
}

export function Terminal({ lines, history, onSubmit }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node !== null) {
      node.scrollTop = node.scrollHeight;
    }
  }, [lines]);

  return (
    <section className="terminal" aria-label="Simulation terminal">
      <div className="terminal__scroll" ref={scrollRef}>
        <TerminalOutput lines={lines} />
      </div>
      <TerminalInput history={history} onSubmit={onSubmit} />
    </section>
  );
}
