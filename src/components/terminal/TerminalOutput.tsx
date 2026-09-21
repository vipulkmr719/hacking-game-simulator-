import type { TerminalLine } from '../../game/engine';

interface TerminalOutputProps {
  readonly lines: readonly TerminalLine[];
}

/**
 * Renders scrollback.
 *
 * Every line is a text child, never markup. There is no HTML injection path
 * here by construction, and `dangerouslySetInnerHTML` is lint-banned repo-wide.
 */
export function TerminalOutput({ lines }: TerminalOutputProps) {
  return (
    <div className="terminal__output" role="log" aria-live="polite" aria-label="Terminal output">
      {lines.map((line, index) => (
        <span
          // Scrollback is append-only and lines are not reordered, so the index
          // is a stable identity here.
          key={index}
          className={`terminal__line terminal__line--${line.kind}`}
        >
          {line.text === '' ? ' ' : line.text}
        </span>
      ))}
    </div>
  );
}
