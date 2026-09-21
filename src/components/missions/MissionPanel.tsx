import { useEffect, useRef, useState } from 'react';
import { STEALTH_ACTIONS_PER_CONTRACT } from '../../game/detection/detection';
import type { ActiveMissionView, ObjectiveView } from '../../game/missions/selectors';

/**
 * An objective row that reacts the moment it is satisfied.
 *
 * Completion is a consequence of a command several lines up the transcript;
 * without a cue here the player has to re-read the panel to notice.
 */
function Objective({ objective }: { readonly objective: ObjectiveView }) {
  const [ticked, setTicked] = useState(false);
  const wasComplete = useRef(objective.complete);

  useEffect(() => {
    if (objective.complete && !wasComplete.current) {
      setTicked(true);
      const timer = globalThis.setTimeout(() => {
        setTicked(false);
      }, 400);
      wasComplete.current = objective.complete;
      return () => {
        globalThis.clearTimeout(timer);
      };
    }
    wasComplete.current = objective.complete;
    return undefined;
  }, [objective.complete]);

  return (
    <li className="mission__objective" data-complete={objective.complete ? 'yes' : 'no'}>
      <span className="mission__check" aria-hidden="true" data-tick={ticked ? 'yes' : undefined}>
        {objective.complete ? '[x]' : '[ ]'}
      </span>
      <span className="mission__objective-text">
        {objective.description}
        {objective.optional && <span className="mission__bonus"> bonus</span>}
      </span>
    </li>
  );
}

interface MissionPanelProps {
  readonly mission: ActiveMissionView | null;
  /** Retrying routes through the engine, the same path the terminal uses. */
  readonly onRetry: () => void;
}

/**
 * Renders the active contract and its threat state.
 *
 * Presentation only. The band, its wording, whether extraction is available
 * and how many stealth actions remain are all computed by the engine's
 * selectors, so no detection rule is duplicated in the component tree.
 */
export function MissionPanel({ mission, onRetry }: MissionPanelProps) {
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
    <aside
      // Keyed on the contract: taking a new one remounts the panel, which is
      // what plays the enter animation and makes the switch legible.
      key={mission.id}
      className="mission"
      aria-label="Active contract"
      data-threat={mission.threatLevel}
    >
      <div className="mission__header">
        <h2 className="mission__title">{mission.title}</h2>
        <p className="mission__client">
          {mission.organization} · {mission.difficulty}
        </p>
      </div>

      <div className="mission__meters">
        <div className="mission__meter">
          <div className="mission__meter-label">
            <span className="mission__threat">{mission.threatLabel}</span>
            <span>{mission.detection}%</span>
          </div>
          <div
            className="mission__bar"
            role="progressbar"
            aria-label="Trace"
            aria-valuenow={mission.detection}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${String(mission.detection)} percent, ${mission.threatLabel}`}
          >
            <div className="mission__bar-fill" style={{ width: `${String(mission.detection)}%` }} />
          </div>
          <p className="mission__threat-note">{mission.threatDescription}</p>
        </div>
        <dl className="mission__facts">
          <div>
            <dt>ACCESS</dt>
            <dd>{mission.accessLevel}</dd>
          </div>
          <div>
            <dt>STEALTH</dt>
            <dd>
              {mission.stealthActionsLeft}/{STEALTH_ACTIONS_PER_CONTRACT}
            </dd>
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
            <Objective key={objective.id} objective={objective} />
          ))}
        </ul>
      </section>

      {mission.failed ? (
        <div className="mission__failure">
          <p className="mission__note mission__note--fail">
            MISSION FAILED — {mission.failureReason ?? 'unknown reason'}
          </p>
          <button type="button" className="mission__retry" onClick={onRetry}>
            Retry contract
          </button>
        </div>
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
