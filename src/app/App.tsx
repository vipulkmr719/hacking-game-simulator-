import { StatusBar } from '../components/player/StatusBar';
import { Terminal } from '../components/terminal/Terminal';
import { useGameEngine } from '../hooks/useGameEngine';

export function App() {
  const { state, lines, history, submit } = useGameEngine();

  return (
    <div className="app">
      <StatusBar state={state} />
      <main className="app__main">
        <Terminal lines={lines} history={history} onSubmit={submit} />
      </main>
    </div>
  );
}
