import type { MissionListEntry } from '../../game/missions/selectors';

interface MissionBriefingProps {
  readonly mission: MissionListEntry;
  readonly briefing: string;
  readonly objectives: readonly string[];
  readonly onStart: (missionId: string) => void;
  readonly onBack: () => void;
}

/**
 * The step between choosing a contract and being dropped on the target.
 *
 * Selecting from the board used to start the mission immediately, which gave a
 * first-time player no moment to read what they had agreed to. This is that
 * moment: what the job is, what counts as done, and what it pays — then an
 * explicit commitment.
 */
export function MissionBriefing({
  mission,
  briefing,
  objectives,
  onStart,
  onBack,
}: MissionBriefingProps) {
  const locked = mission.status === 'locked';

  return (
    <div className="briefing">
      <div className="briefing__head">
        <span className="briefing__number">{String(mission.number).padStart(2, '0')}</span>
        <div>
          <h2 className="briefing__title">{mission.title}</h2>
          <p className="briefing__client">
            {mission.organization} · {mission.difficulty}
          </p>
        </div>
      </div>

      <p className="briefing__text">{briefing}</p>

      <section>
        <h3 className="briefing__heading">OBJECTIVES</h3>
        <ul className="briefing__objectives">
          {objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="briefing__heading">ON COMPLETION</h3>
        <dl className="contract-card__facts">
          <div>
            <dt>XP</dt>
            <dd>{mission.reward.xp}</dd>
          </div>
          <div>
            <dt>CREDITS</dt>
            <dd>{mission.reward.credits}</dd>
          </div>
          <div>
            <dt>REPUTATION</dt>
            <dd>{mission.reward.reputation}</dd>
          </div>
        </dl>
      </section>

      {locked && (
        <section>
          <h3 className="briefing__heading">LOCKED</h3>
          <ul className="contract-card__blockers">
            {mission.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="briefing__actions">
        <button type="button" className="menu__action" onClick={onBack}>
          Back to board
        </button>
        <button
          type="button"
          className="menu__action menu__action--primary"
          disabled={locked}
          onClick={() => {
            onStart(mission.id);
          }}
          title={locked ? mission.blockers.join('; ') : `Start ${mission.title}`}
        >
          {locked ? 'Locked' : mission.status === 'completed' ? 'Replay contract' : 'Start mission'}
        </button>
      </div>
    </div>
  );
}
