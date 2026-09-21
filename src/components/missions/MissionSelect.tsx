import type { MissionListEntry } from '../../game/missions/selectors';

interface MissionSelectProps {
  readonly missions: readonly MissionListEntry[];
  /** Starting a contract goes through the engine, the same path the terminal uses. */
  readonly onStart: (missionId: string) => void;
}

const STATUS_LABEL = {
  available: 'AVAILABLE',
  locked: 'LOCKED',
  completed: 'COMPLETED',
} as const;

/**
 * Contract board.
 *
 * Presentation only. Whether a contract is open, why it is locked, and what it
 * pays are all decided by the engine's selector; selecting one submits a
 * `start` command rather than reaching into mission state, so there is exactly
 * one implementation of what taking a contract means.
 */
export function MissionSelect({ missions, onStart }: MissionSelectProps) {
  return (
    <div className="board">
      <h2 className="board__heading">
        CONTRACTS{' '}
        <span className="board__count">
          {missions.filter((mission) => mission.status === 'completed').length}/{missions.length}
        </span>
      </h2>

      <ul className="board__list">
        {missions.map((mission) => (
          <li key={mission.id} className="contract-card" data-status={mission.status}>
            <div className="contract-card__head">
              <span className="contract-card__number">
                {String(mission.number).padStart(2, '0')}
              </span>
              <div className="contract-card__identity">
                <span className="contract-card__title">{mission.title}</span>
                <span className="contract-card__client">{mission.organization}</span>
              </div>
              <span className="contract-card__status">{STATUS_LABEL[mission.status]}</span>
            </div>

            <dl className="contract-card__facts">
              <div>
                <dt>DIFFICULTY</dt>
                <dd>{mission.difficulty}</dd>
              </div>
              <div>
                <dt>XP</dt>
                <dd>{mission.reward.xp}</dd>
              </div>
              <div>
                <dt>CREDITS</dt>
                <dd>{mission.reward.credits}</dd>
              </div>
              <div>
                <dt>REP</dt>
                <dd>{mission.reward.reputation}</dd>
              </div>
            </dl>

            {mission.blockers.length > 0 && (
              <ul className="contract-card__blockers">
                {mission.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            )}

            <div className="contract-card__actions">
              {mission.isActive ? (
                <span className="contract-card__active">Active contract</span>
              ) : (
                <button
                  type="button"
                  className="contract-card__start"
                  disabled={mission.status === 'locked'}
                  onClick={() => {
                    onStart(mission.id);
                  }}
                  // A disabled control must say why rather than sit there grey.
                  title={
                    mission.status === 'locked'
                      ? mission.blockers.join('; ')
                      : `Start ${mission.title}`
                  }
                >
                  {mission.status === 'locked'
                    ? 'Locked'
                    : mission.status === 'completed'
                      ? 'Replay'
                      : 'Start'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
