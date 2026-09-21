import { useState, type KeyboardEvent, type SyntheticEvent } from 'react';

interface TerminalInputProps {
  readonly history: readonly string[];
  readonly onSubmit: (value: string) => void;
}

/**
 * A real <input>, not a simulated caret.
 *
 * Fake carets over a hidden field are a common terminal-UI trick and they
 * break badly on touch keyboards — autocorrect, IME composition and caret
 * placement all misbehave. A native input costs a little visual control and
 * buys working mobile text entry.
 */
export function TerminalInput({ history, onSubmit }: TerminalInputProps) {
  const [value, setValue] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    onSubmit(value);
    setValue('');
    setHistoryIndex(null);
  };

  const recall = (direction: -1 | 1) => {
    if (history.length === 0) {
      return;
    }
    const current = historyIndex ?? history.length;
    const next = Math.min(history.length, Math.max(0, current + direction));
    setHistoryIndex(next);
    setValue(next === history.length ? '' : (history[next] ?? ''));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      recall(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      recall(1);
    }
  };

  return (
    <form className="terminal__input-row" onSubmit={handleSubmit}>
      {/* The prompt glyph is decoration, not a label, so the accessible name
          comes from aria-label rather than visible text. */}
      <span className="terminal__prompt" aria-hidden="true">
        &gt;
      </span>
      <input
        id="terminal-input"
        className="terminal__input"
        aria-label="Terminal command"
        type="text"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="send"
        placeholder="type a command"
      />
      <button className="terminal__send" type="submit">
        Run
      </button>
    </form>
  );
}
