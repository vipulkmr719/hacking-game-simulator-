import { useEffect, useState } from 'react';
import { useSoundEffects } from '../audio/useSoundEffects';
import { MissionPanel } from '../components/missions/MissionPanel';
import { StatusBar } from '../components/player/StatusBar';
import { ProgressionScreen } from '../components/progression/ProgressionScreen';
import { Terminal } from '../components/terminal/Terminal';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { EventOverlay, type EventLabels } from '../components/ui/EventOverlay';
import { useGameEngine } from '../hooks/useGameEngine';

type View = 'terminal' | 'progression';

export function App() {
  const {
    state,
    mission,
    progression,
    lines,
    lastStep,
    submit,
    complete,
    recallOlder,
    recallNewer,
  } = useGameEngine();
  const [view, setView] = useState<View>('terminal');
  const sound = useSoundEffects();

  // Sound is a reaction to what the engine reported, not something any command
  // asks for, so it is wired once here rather than threaded through the tree.
  useEffect(() => {
    sound.playFor(lastStep.events);
    // Keyed on the step id: two identical commands produce equal event arrays
    // and both should be heard.
  }, [lastStep, sound]);

  /*
   * Buying and retrying go through the terminal's own submit, so there is one
   * path into the engine and both still appear in the transcript.
   */
  const buyTool = (toolId: string) => {
    submit(`buy ${toolId}`);
  };

  const retryContract = () => {
    submit('retry');
  };

  const labels: EventLabels = {
    missionTitle: (missionId) =>
      progression.contracts.find((contract) => contract.id === missionId)?.title ?? missionId,
    achievementName: (achievementId) =>
      progression.achievements.find((achievement) => achievement.id === achievementId)?.name ??
      achievementId,
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <StatusBar
          state={state}
          threatLevel={mission?.threatLevel ?? null}
          view={view}
          onChangeView={setView}
          muted={sound.muted}
          onToggleMuted={sound.toggleMuted}
        />
        <main
          className="app__main"
          id={`panel-${view}`}
          role="tabpanel"
          aria-labelledby={`tab-${view}`}
        >
          {/* Inside main, so a banner never covers the status bar — which is
              where the figures it is announcing actually change. */}
          <EventOverlay step={lastStep} labels={labels} />
          {view === 'terminal' ? (
            <>
              <MissionPanel mission={mission} onRetry={retryContract} />
              <Terminal
                lines={lines}
                onSubmit={submit}
                onComplete={complete}
                onRecallOlder={recallOlder}
                onRecallNewer={recallNewer}
                onKeypress={sound.playKeypress}
              />
            </>
          ) : (
            <ProgressionScreen progression={progression} onBuyTool={buyTool} />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
