import { formatTrace } from '../../game/detection/detection';
import type { GameState } from '../../game/engine';

interface StatusBarProps {
  readonly state: GameState;
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="statusbar__stat">
      <span className="statusbar__label">{label}</span>
      <span className="statusbar__value">{value}</span>
    </div>
  );
}

export function StatusBar({ state }: StatusBarProps) {
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
          value={activeMission === null ? '—' : formatTrace(activeMission.detection).slice(7)}
        />
      </div>
    </header>
  );
}
