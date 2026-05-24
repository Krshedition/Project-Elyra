import { useEffect } from 'react';
import { WaveWidget } from './WaveWidget';
import { useLiveSession } from './hooks/useLiveSession';

function App() {
  const { connect, disconnect, state, errorMsg, volume } = useLiveSession();

  useEffect(() => {
    connect();
  }, [connect]);

  const handleToggle = () => {
    if (state === 'idle' || state === 'error') {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <div className="w-screen h-screen p-4 flex items-start justify-end bg-transparent pt-8 pr-8">
      <WaveWidget state={state} onToggle={handleToggle} errorMsg={errorMsg} volume={volume} />
    </div>
  );
}

export default App;
