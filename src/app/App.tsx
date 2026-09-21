import { useCallback, useEffect, useState } from 'react';
import { useSoundEffects } from '../audio/useSoundEffects';
import { MissionBriefing } from '../components/missions/MissionBriefing';
import { MissionPanel } from '../components/missions/MissionPanel';
import { MissionSelect } from '../components/missions/MissionSelect';
import { StatusBar } from '../components/player/StatusBar';
import { ProgressionScreen } from '../components/progression/ProgressionScreen';
import { Terminal } from '../components/terminal/Terminal';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { EventOverlay, type EventLabels } from '../components/ui/EventOverlay';
import { MainMenu } from '../components/ui/MainMenu';
import { useGameEngine, type View } from '../hooks/useGameEngine';

export function App() {
  const {
    state,
    loadResult,
    mission,
    missionList,
    progression,
    lines,
    lastStep,
    muted,
    toggleMuted,
    submit,
    complete,
    recallOlder,
    recallNewer,
  } = useGameEngine();

  /*
   * A returning player lands in the terminal, where their contract is. A new
   * one lands at the menu: opening the game is not the same as agreeing to a
   * job.
   */
  const [view, setView] = useState<View>(() => (loadResult.ok ? 'terminal' : 'menu'));
  const [briefingId, setBriefingId] = useState<string | null>(null);
  const sound = useSoundEffects(muted);

  // Sound is a reaction to what the engine reported, not something any command
  // asks for, so it is wired once here rather than threaded through the tree.
  useEffect(() => {
    sound.playFor(lastStep.events);
  }, [lastStep, sound]);

  /*
   * Buying, retrying and starting all go through the terminal's own submit, so
   * there is one path into the engine and every action still appears in the
   * transcript.
   */
  const buyTool = useCallback((toolId: string) => { submit(`buy ${toolId}`); }, [submit]);
  const retryContract = useCallback(() => { submit('retry'); }, [submit]);

  const startContract = useCallback(
    (missionId: string) => {
      submit(`start ${missionId}`);
      setBriefingId(null);
      setView('terminal');
    },
    [submit],
  );

  const labels: EventLabels = {
    missionTitle: (missionId) =>
      missionList.find((entry) => entry.id === missionId)?.title ?? missionId,
    achievementName: (achievementId) =>
      progression.achievements.find((achievement) => achievement.id === achievementId)?.name ??
      achievementId,
  };

  const briefing = briefingId === null ? null : missionList.find((e) => e.id === briefingId);

  return (
    <ErrorBoundary>
      <div className="app">
        <StatusBar
          state={state}
          threatLevel={mission?.threatLevel ?? null}
          view={view}
          onChangeView={(next) => {
            setBriefingId(null);
            setView(next);
          }}
          muted={muted}
          onToggleMuted={toggleMuted}
          currentMission={
            mission === null
              ? null
              : {
                  objectives: mission.objectives.map((obj) => ({
                    id: obj.id,
                    description: obj.description,
                    complete: obj.complete,
                  })),
                }
          }
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

          {view === 'menu' && (
            <MainMenu
              progression={progression}
              hasSave={loadResult.ok}
              onOpenContracts={() => { setView('contracts'); }}
              onOpenTerminal={() => { setView('terminal'); }}
              onOpenProgression={() => { setView('progression'); }}
            />
          )}

          {view === 'terminal' && (
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
          )}

          {view === 'contracts' &&
            (briefing === undefined || briefing === null ? (
              <MissionSelect missions={missionList} onSelect={setBriefingId} />
            ) : (
              <MissionBriefing
                mission={briefing}
                briefing={briefing.briefing}
                objectives={briefing.objectiveDescriptions}
                onStart={startContract}
                onBack={() => { setBriefingId(null); }}
              />
            ))}

          {view === 'progression' && (
            <ProgressionScreen progression={progression} onBuyTool={buyTool} />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
