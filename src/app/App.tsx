import { StatusBar } from '../components/player/StatusBar';
import { Terminal } from '../components/terminal/Terminal';
import { useGameEngine } from '../hooks/useGameEngine';

export function App() {
  const { state, lines, submit, complete, recallOlder, recallNewer } = useGameEngine();

  return (
    <div className="app">
      <StatusBar state={state} />
      <main className="app__main">
        <Terminal
          lines={lines}
          onSubmit={submit}
          onComplete={complete}
          onRecallOlder={recallOlder}
          onRecallNewer={recallNewer}
        />
      </main>
    </div>
  );
}
