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
}

export function Terminal({
  lines,
  onSubmit,
  onComplete,
  onRecallOlder,
  onRecallNewer,
}: TerminalProps) {
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
      <TerminalInput
        onSubmit={onSubmit}
        onComplete={onComplete}
        onRecallOlder={onRecallOlder}
        onRecallNewer={onRecallNewer}
      />
    </section>
  );
}
