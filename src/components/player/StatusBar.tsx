import { useEffect, useRef, useState } from 'react';
import { formatTrace } from '../../game/detection/detection';
import type { ThreatLevel } from '../../game/detection/threat';
import type { GameState } from '../../game/engine';

type View = 'terminal' | 'contracts' | 'progression';

interface StatusBarProps {
  readonly state: GameState;
  /** Supplied by the engine's selector; null when no contract is loaded. */
  readonly threatLevel: ThreatLevel | null;
  readonly view: View;
  readonly onChangeView: (view: View) => void;
  readonly muted: boolean;
  readonly onToggleMuted: () => void;
}

/**
 * A figure that flags when it changes.
 *
 * XP, credits and reputation move as a side effect of something else — closing
 * a contract, earning an achievement — so without a cue the change happens
 * off-screen while the player is reading the terminal.
 */
function Stat({
  label,
  value,
  threat,
}: {
  readonly label: string;
  readonly value: string;
  readonly threat?: ThreatLevel;
}) {
  const [bumping, setBumping] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }
    previous.current = value;
    setBumping(true);
    const timer = globalThis.setTimeout(() => {
      setBumping(false);
    }, 400);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [value]);

  return (
    <div className="statusbar__stat" data-threat={threat}>
      <span className="statusbar__label">{label}</span>
      <span className="statusbar__value" data-bump={bumping ? 'yes' : undefined}>
        {value}
      </span>
    </div>
  );
}

const VIEWS: readonly { readonly id: View; readonly label: string }[] = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'progression', label: 'Progression' },
];

export function StatusBar({
  state,
  threatLevel,
  view,
  onChangeView,
  muted,
  onToggleMuted,
}: StatusBarProps) {
  const { player, activeMission } = state;

  /**
   * Arrow keys move between tabs, which is what the tablist pattern promises
   * and what a keyboard user will try.
   */
  const handleTabKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    event.preventDefault();
    const index = VIEWS.findIndex((entry) => entry.id === view);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = VIEWS[(index + step + VIEWS.length) % VIEWS.length];
    if (next !== undefined) {
      onChangeView(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    }
  };

  return (
    <header className="statusbar">
      <div className="statusbar__identity">
        <h1 className="statusbar__title">CYBER HACKER SIMULATOR</h1>
        <span className="statusbar__subtitle">simulated environment</span>
      </div>

      <div className="statusbar__stats">
        <Stat label="LVL" value={String(player.level)} />
        <Stat label="XP" value={String(player.xp)} />
        <Stat label="CR" value={String(player.credits)} />
        <Stat label="REP" value={String(player.reputation)} />
        <Stat
          label="TRACE"
          value={activeMission === null ? '—' : formatTrace(activeMission.detection).slice(7)}
          {...(threatLevel === null ? {} : { threat: threatLevel })}
        />
      </div>

      <div className="statusbar__controls">
        <div className="statusbar__views" role="tablist" aria-label="View" onKeyDown={handleTabKeys}>
          {VIEWS.map((entry) => (
            <button
              key={entry.id}
              id={`tab-${entry.id}`}
              type="button"
              role="tab"
              className="statusbar__view"
              aria-selected={view === entry.id}
              aria-controls={`panel-${entry.id}`}
              tabIndex={view === entry.id ? 0 : -1}
              onClick={() => {
                onChangeView(entry.id);
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="statusbar__mute"
          onClick={onToggleMuted}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
        >
          <span aria-hidden="true">{muted ? 'MUTED' : 'SOUND'}</span>
        </button>
      </div>
    </header>
  );
}
