import type { ActiveMissionView } from '../../game/missions/selectors';

interface MissionPanelProps {
  readonly mission: ActiveMissionView | null;
}

/**
 * Renders the active contract.
 *
 * Presentation only. Every fact here — whether an objective is done, whether
 * extraction is available, how many remain — is computed by the engine's
 * selectors, so no mission rule is duplicated in the component tree.
 */
export function MissionPanel({ mission }: MissionPanelProps) {
  if (mission === null) {
    return (
      <aside className="mission mission--empty" aria-label="Active contract">
        <p className="mission__idle">
          No active contract. Type <code>missions</code> to see what is open.
        </p>
      </aside>
    );
  }

  const done = mission.objectives.filter((objective) => objective.complete).length;

  return (
    <aside className="mission" aria-label="Active contract">
      <div className="mission__header">
        <h2 className="mission__title">{mission.title}</h2>
        <p className="mission__client">
          {mission.organization} · {mission.difficulty}
        </p>
      </div>

      <div className="mission__meters">
        <div className="mission__meter">
          <div className="mission__meter-label">
            <span>TRACE</span>
            <span>{Math.round(mission.detection)}%</span>
          </div>
          <div
            className="mission__bar"
            role="progressbar"
            aria-label="Trace"
            aria-valuenow={Math.round(mission.detection)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="mission__bar-fill"
              data-level={mission.detection >= 80 ? 'high' : mission.detection >= 50 ? 'mid' : 'low'}
              style={{ width: `${String(Math.min(100, mission.detection))}%` }}
            />
          </div>
        </div>
        <dl className="mission__facts">
          <div>
            <dt>ACCESS</dt>
            <dd>{mission.accessLevel}</dd>
          </div>
          <div>
            <dt>STATE</dt>
            <dd>{mission.status}</dd>
          </div>
        </dl>
      </div>

      <section className="mission__objectives">
        <h3 className="mission__section-title">
          OBJECTIVES <span className="mission__count">{done}/{mission.objectives.length}</span>
        </h3>
        <ul className="mission__list">
          {mission.objectives.map((objective) => (
            <li
              key={objective.id}
              className="mission__objective"
              data-complete={objective.complete ? 'yes' : 'no'}
            >
              <span className="mission__check" aria-hidden="true">
                {objective.complete ? '[x]' : '[ ]'}
              </span>
              <span className="mission__objective-text">
                {objective.description}
                {objective.optional && <span className="mission__bonus"> bonus</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {mission.status === 'failed' ? (
        <p className="mission__note mission__note--fail">
          Failed — {mission.failureReason ?? 'unknown reason'}
        </p>
      ) : mission.readyToExtract ? (
        <p className="mission__note mission__note--ready">
          All objectives met. Run <code>escape</code>.
        </p>
      ) : (
        <p className="mission__note">{mission.outstandingCount} outstanding</p>
      )}
    </aside>
  );
}
