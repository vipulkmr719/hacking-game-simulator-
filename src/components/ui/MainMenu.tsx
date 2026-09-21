import type { ProgressionView } from '../../game/progression/selectors';

interface MainMenuProps {
  readonly progression: ProgressionView;
  readonly hasSave: boolean;
  readonly onOpenContracts: () => void;
  readonly onOpenTerminal: () => void;
  readonly onOpenProgression: () => void;
}

function Figure({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="figure">
      <span className="figure__label">{label}</span>
      <span className="figure__value">{value}</span>
    </div>
  );
}

/**
 * Where the game starts.
 *
 * Opening the application is not the same as agreeing to a job, so this shows
 * who the operator is and what is open, and waits. The profile is here rather
 * than behind another click because on a returning visit it is the first thing
 * worth seeing — it is the evidence that the save loaded.
 */
export function MainMenu({
  progression,
  hasSave,
  onOpenContracts,
  onOpenTerminal,
  onOpenProgression,
}: MainMenuProps) {
  const returning = progression.contractsCompleted > 0 || hasSave;

  return (
    <div className="menu">
      <section className="menu__panel menu__panel--profile">
        <h2 className="menu__heading">OPERATOR PROFILE</h2>
        <div className="menu__level">
          <span className="menu__level-number">{progression.level}</span>
          <div className="menu__level-meter">
            <div className="menu__level-label">
              <span>
                {progression.xpIntoLevel} / {progression.xpForLevel} XP
              </span>
              <span>{progression.xpUntilNextLevel} to next</span>
            </div>
            <div
              className="progression__bar"
              role="progressbar"
              aria-label="Level progress"
              aria-valuenow={Math.round(progression.levelProgress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progression__bar-fill"
                style={{ width: `${String(Math.round(progression.levelProgress * 100))}%` }}
              />
            </div>
          </div>
        </div>
        <div className="progression__figures">
          <Figure label="CREDITS" value={String(progression.credits)} />
          <Figure label="REPUTATION" value={String(progression.reputation)} />
          <Figure
            label="CONTRACTS"
            value={`${String(progression.contractsCompleted)}/${String(progression.contracts.length)}`}
          />
          <Figure
            label="TOOLS"
            value={`${String(progression.toolsOwned)}/${String(progression.tools.length)}`}
          />
        </div>
      </section>

      <section className="menu__panel">
        <h2 className="menu__heading">{returning ? 'RESUME' : 'BEGIN'}</h2>
        <p className="menu__lead">
          {returning
            ? 'Pick up where you left off. Your progress was restored.'
            : 'You are a freelance operator. Take a contract from the board, work the target from the terminal, and get out before the trace completes.'}
        </p>
        <div className="menu__actions">
          <button type="button" className="menu__action menu__action--primary" onClick={onOpenContracts}>
            {returning ? 'Contract board' : 'View contracts'}
          </button>
          <button type="button" className="menu__action" onClick={onOpenTerminal}>
            Terminal
          </button>
          <button type="button" className="menu__action" onClick={onOpenProgression}>
            Progression
          </button>
        </div>
        {!returning && (
          <p className="menu__hint">
            New here? Start with <strong>01 First Connection</strong> — it teaches the terminal.
          </p>
        )}
      </section>
    </div>
  );
}
