import { useEffect, useRef, useState } from 'react';
import type { TerminalLine } from '../../game/engine';

interface TerminalOutputProps {
  readonly lines: readonly TerminalLine[];
}

/** Lines after this many in one batch appear at once; a long stagger drags. */
const MAX_STAGGERED = 8;

/** Milliseconds between staggered lines. */
const STAGGER_STEP = 18;

/**
 * Renders scrollback.
 *
 * Every line is a text child, never markup. There is no HTML injection path
 * here by construction, and `dangerouslySetInnerHTML` is lint-banned repo-wide.
 *
 * Lines added by the most recent command animate in; older ones do not, so a
 * scroll through history is still. The animation is a fade and a two-pixel
 * rise — enough to show what is new without delaying it, since the text is in
 * the DOM and readable from the first frame.
 */
export function TerminalOutput({ lines }: TerminalOutputProps) {
  const [enterFrom, setEnterFrom] = useState(0);
  const previousLength = useRef(lines.length);

  useEffect(() => {
    // A clear resets the buffer; treat the next batch as entirely new.
    setEnterFrom(lines.length < previousLength.current ? 0 : previousLength.current);
    previousLength.current = lines.length;
  }, [lines]);

  return (
    <div className="terminal__output" role="log" aria-live="polite" aria-label="Terminal output">
      {lines.map((line, index) => {
        const isNew = index >= enterFrom;
        const position = index - enterFrom;
        return (
          <span
            // Scrollback is append-only and lines are not reordered, so the
            // index is a stable identity here.
            key={index}
            className={`terminal__line terminal__line--${line.kind}`}
            data-enter={isNew ? 'yes' : undefined}
            style={
              isNew && position < MAX_STAGGERED
                ? { animationDelay: `${String(position * STAGGER_STEP)}ms` }
                : undefined
            }
          >
            {line.text === '' ? ' ' : line.text}
          </span>
        );
      })}
    </div>
  );
}
