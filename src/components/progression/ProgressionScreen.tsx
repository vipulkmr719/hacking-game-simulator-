import type { ProgressionView, ToolView } from '../../game/progression/selectors';

interface ProgressionScreenProps {
  readonly progression: ProgressionView;
  /** Buying routes through the engine, the same path the terminal uses. */
  readonly onBuyTool: (toolId: string) => void;
}

function Figure({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="figure">
      <span className="figure__label">{label}</span>
      <span className="figure__value">{value}</span>
    </div>
  );
}

function ToolRow({ tool, onBuy }: { readonly tool: ToolView; readonly onBuy: () => void }) {
  return (
    <li className="tool" data-status={tool.status}>
      <div className="tool__head">
        <span className="tool__name">{tool.name}</span>
        <span className="tool__category">{tool.category}</span>
      </div>
      <p className="tool__description">{tool.description}</p>
      <div className="tool__foot">
        <span className="tool__trace">trace ×{tool.detectionMultiplier}</span>
        {tool.status === 'owned' ? (
          <span className="tool__owned">OWNED</span>
        ) : (
          <>
            <span className="tool__cost">{tool.cost} CR</span>
            <button
              type="button"
              className="tool__buy"
              onClick={onBuy}
              disabled={tool.status !== 'affordable'}
              // A disabled control must say why, not just sit there greyed out.
              title={tool.blocker ?? `Buy ${tool.name}`}
            >
              {tool.status === 'affordable' ? 'Buy' : (tool.blocker ?? 'Locked')}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export function ProgressionScreen({ progression, onBuyTool }: ProgressionScreenProps) {
  const percent = Math.round(progression.levelProgress * 100);

  return (
    <div className="progression">
      <section className="progression__panel">
        <h2 className="progression__heading">OPERATOR</h2>
        <div className="progression__level">
          <span className="progression__level-number">{progression.level}</span>
          <div className="progression__level-meter">
            <div className="progression__level-label">
              <span>
                {progression.xpIntoLevel} / {progression.xpForLevel} XP
              </span>
              <span>{progression.xpUntilNextLevel} to next</span>
            </div>
            <div
              className="progression__bar"
              role="progressbar"
              aria-label="Level progress"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progression__bar-fill" style={{ width: `${String(percent)}%` }} />
            </div>
          </div>
        </div>
        <div className="progression__figures">
          <Figure label="TOTAL XP" value={String(progression.xp)} />
          <Figure label="CREDITS" value={String(progression.credits)} />
          <Figure label="REPUTATION" value={String(progression.reputation)} />
        </div>
      </section>

      <section className="progression__panel">
        <h2 className="progression__heading">
          TOOLS <span className="progression__count">{progression.toolsOwned}/{progression.tools.length}</span>
        </h2>
        <ul className="progression__tools">
          {progression.tools.map((tool) => (
            <ToolRow
              key={tool.id}
              tool={tool}
              onBuy={() => {
                onBuyTool(tool.id);
              }}
            />
          ))}
        </ul>
      </section>

      <section className="progression__panel">
        <h2 className="progression__heading">
          CONTRACTS{' '}
          <span className="progression__count">
            {progression.contractsCompleted}/{progression.contracts.length}
          </span>
        </h2>
        <ul className="progression__contracts">
          {progression.contracts.map((contract) => (
            <li
              key={contract.id}
              className="contract"
              data-state={contract.completed ? 'done' : contract.locked ? 'locked' : 'open'}
            >
              <span className="contract__mark" aria-hidden="true">
                {contract.completed ? '[x]' : contract.locked ? '[-]' : '[ ]'}
              </span>
              <span className="contract__title">{contract.title}</span>
              <span className="contract__client">{contract.organization}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="progression__panel">
        <h2 className="progression__heading">
          ACHIEVEMENTS{' '}
          <span className="progression__count">
            {progression.achievementsUnlocked}/{progression.achievements.length}
          </span>
        </h2>
        <ul className="progression__achievements">
          {progression.achievements.map((achievement) => (
            <li
              key={achievement.id}
              className="achievement"
              data-unlocked={achievement.unlocked ? 'yes' : 'no'}
            >
              <span className="achievement__mark" aria-hidden="true">
                {achievement.unlocked ? '★' : '☆'}
              </span>
              <div className="achievement__body">
                <span className="achievement__name">{achievement.name}</span>
                <span className="achievement__description">{achievement.description}</span>
              </div>
              <span className="achievement__xp">+{achievement.xp}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="progression__panel">
        <h2 className="progression__heading">STATISTICS</h2>
        <div className="progression__figures">
          <Figure label="COMMANDS" value={String(progression.statistics.commandsExecuted)} />
          <Figure label="ATTEMPTED" value={String(progression.statistics.missionsAttempted)} />
          <Figure label="COMPLETED" value={String(progression.statistics.missionsCompleted)} />
          <Figure label="FAILED" value={String(progression.statistics.missionsFailed)} />
          <Figure label="TOOLS BOUGHT" value={String(progression.statistics.toolsPurchased)} />
          <Figure label="CR SPENT" value={String(progression.statistics.creditsSpent)} />
        </div>
      </section>
    </div>
  );
}
