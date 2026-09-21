import { useState, type KeyboardEvent, type SyntheticEvent } from 'react';

interface TerminalInputProps {
  readonly onSubmit: (value: string) => void;
  /** Returns the completed line, or null to leave the input as typed. */
  readonly onComplete: (value: string) => string | null;
  readonly onRecallOlder: () => string;
  readonly onRecallNewer: () => string;
  readonly onKeypress: () => void;
}

/**
 * A real <input>, not a simulated caret.
 *
 * Fake carets over a hidden field are a common terminal-UI trick and they
 * break badly on touch keyboards — autocorrect, IME composition and caret
 * placement all misbehave. A native input costs a little visual control and
 * buys working mobile text entry.
 *
 * History and completion are decided by pure functions in the engine; this
 * component only routes keys to them.
 */
export function TerminalInput({
  onSubmit,
  onComplete,
  onRecallOlder,
  onRecallNewer,
  onKeypress,
}: TerminalInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    onSubmit(value);
    setValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Tab': {
        // Tab would otherwise move focus out of the terminal.
        event.preventDefault();
        const completed = onComplete(value);
        if (completed !== null) {
          setValue(completed);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        setValue(onRecallOlder());
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        setValue(onRecallNewer());
        break;
      }
      default:
        break;
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
          onKeypress();
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="send"
        placeholder="type a command"
      />
      {/* Sits after the input so it trails the text; purely decorative, and
          hidden from assistive technology. */}
      <span className="terminal__caret" aria-hidden="true" data-idle={value === '' ? 'yes' : 'no'} />
      <button className="terminal__send" type="submit">
        Run
      </button>
    </form>
  );
}
