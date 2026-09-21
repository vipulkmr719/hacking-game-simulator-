import { useEffect, useState } from 'react';
import type { GameEvent } from '../../game/engine';
import type { StepEvents } from '../../hooks/useGameEngine';

/** How long a banner stays before dismissing itself. */
const DISMISS_MS = 2600;

type Tone = 'good' | 'warn' | 'bad';

interface Banner {
  readonly tone: Tone;
  readonly headline: string;
  readonly detail: string;
}

/**
 * Turns the ids an event carries into names a player recognises.
 *
 * Events identify things by id because that is what game state holds. A
 * banner that reads "first-connection" is the internal spelling leaking into
 * the interface, so the lookup happens here at the edge.
 */
export interface EventLabels {
  readonly missionTitle: (missionId: string) => string;
  readonly achievementName: (achievementId: string) => string;
}

interface EventOverlayProps {
  readonly step: StepEvents;
  readonly labels: EventLabels;
}

/**
 * Picks the one event worth interrupting for.
 *
 * A command can produce a dozen events. Showing all of them would bury the
 * important one, so this takes the single most consequential and lets the
 * terminal transcript carry the rest.
 */
function bannerFor(events: readonly GameEvent[], labels: EventLabels): Banner | null {
  const failure = events.find((event) => event.type === 'MISSION_FAILED');
  if (failure !== undefined) {
    return { tone: 'bad', headline: 'MISSION FAILED', detail: failure.reason };
  }

  const completion = events.find((event) => event.type === 'MISSION_COMPLETED');
  if (completion !== undefined) {
    return {
      tone: 'good',
      headline: 'CONTRACT CLOSED',
      detail: labels.missionTitle(completion.missionId),
    };
  }

  const level = events.find((event) => event.type === 'LEVEL_REACHED');
  if (level !== undefined) {
    return { tone: 'good', headline: `LEVEL ${String(level.level)}`, detail: 'Operator promoted' };
  }

  const achievement = events.find((event) => event.type === 'ACHIEVEMENT_UNLOCKED');
  if (achievement !== undefined) {
    return {
      tone: 'good',
      headline: 'ACHIEVEMENT',
      detail: labels.achievementName(achievement.achievementId),
    };
  }

  const threat = events.find(
    (event): event is Extract<GameEvent, { type: 'THREAT_LEVEL_CHANGED' }> =>
      event.type === 'THREAT_LEVEL_CHANGED' && event.current === 'critical',
  );
  if (threat !== undefined) {
    return {
      tone: 'warn',
      headline: 'CRITICAL',
      detail: `Trace ${String(threat.detection)}% — one more flagged action ends the run`,
    };
  }

  return null;
}

/**
 * Transient banner for the few moments that deserve one.
 *
 * It is `aria-live="assertive"` because each of these interrupts what the
 * player was doing — a failed contract or a level is not something to find out
 * about later by scrolling.
 */
export function EventOverlay({ step, labels }: EventOverlayProps) {
  // Only *dismissal* is state. What to show is derived from the step during
  // render, which keeps the effect to scheduling the timer rather than setting
  // state synchronously and cascading a second render.
  const [dismissedId, setDismissedId] = useState(0);

  const banner = step.id === dismissedId ? null : bannerFor(step.events, labels);
  const visible = banner !== null;

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const timer = globalThis.setTimeout(() => {
      setDismissedId(step.id);
    }, DISMISS_MS);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [visible, step.id]);

  return (
    <div className="overlay" aria-live="assertive" aria-atomic="true">
      {banner !== null && (
        <div key={step.id} className="overlay__banner" data-tone={banner.tone}>
          <span className="overlay__headline">{banner.headline}</span>
          <span className="overlay__detail">{banner.detail}</span>
        </div>
      )}
    </div>
  );
}
