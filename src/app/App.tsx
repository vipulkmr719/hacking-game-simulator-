import { useState } from 'react';
import { MissionPanel } from '../components/missions/MissionPanel';
import { StatusBar } from '../components/player/StatusBar';
import { ProgressionScreen } from '../components/progression/ProgressionScreen';
import { Terminal } from '../components/terminal/Terminal';
import { useGameEngine } from '../hooks/useGameEngine';

type View = 'terminal' | 'progression';

export function App() {
  const { state, mission, progression, lines, submit, complete, recallOlder, recallNewer } =
    useGameEngine();
  const [view, setView] = useState<View>('terminal');

  /*
   * Buying from the progression screen goes through the terminal's own submit,
   * so there is one path into the engine and the purchase still appears in the
   * transcript.
   */
  const buyTool = (toolId: string) => {
    submit(`buy ${toolId}`);
  };

  const retryContract = () => {
    submit('retry');
  };

  return (
    <div className="app">
      <StatusBar
        state={state}
        threatLevel={mission?.threatLevel ?? null}
        view={view}
        onChangeView={setView}
      />
      <main className="app__main" id={`panel-${view}`} role="tabpanel" aria-labelledby={`tab-${view}`}>
        {view === 'terminal' ? (
          <>
            <MissionPanel mission={mission} onRetry={retryContract} />
            <Terminal
              lines={lines}
              onSubmit={submit}
              onComplete={complete}
              onRecallOlder={recallOlder}
              onRecallNewer={recallNewer}
            />
          </>
        ) : (
          <ProgressionScreen progression={progression} onBuyTool={buyTool} />
        )}
      </main>
    </div>
  );
}
