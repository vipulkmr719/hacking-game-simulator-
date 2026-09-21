import { formatTrace } from '../../game/detection/detection';
import type { GameState } from '../../game/engine';

type View = 'terminal' | 'progression';

interface StatusBarProps {
  readonly state: GameState;
  readonly view: View;
  readonly onChangeView: (view: View) => void;
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="statusbar__stat">
      <span className="statusbar__label">{label}</span>
      <span className="statusbar__value">{value}</span>
    </div>
  );
}

const VIEWS: readonly { readonly id: View; readonly label: string }[] = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'progression', label: 'Progression' },
];

export function StatusBar({ state, view, onChangeView }: StatusBarProps) {
  const { player, activeMission } = state;

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
          value={activeMission === null ? '\u2014' : formatTrace(activeMission.detection).slice(7)}
        />
      </div>

      <div className="statusbar__views" role="tablist" aria-label="View">
        {VIEWS.map((entry) => (
          <button
            key={entry.id}
            id={`tab-${entry.id}`}
            type="button"
            role="tab"
            className="statusbar__view"
            aria-selected={view === entry.id}
            aria-controls={`panel-${entry.id}`}
            onClick={() => {
              onChangeView(entry.id);
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </header>
  );
}
