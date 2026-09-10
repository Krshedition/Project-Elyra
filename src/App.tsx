import { useEffect, useState } from 'react';
import { WaveWidget } from './WaveWidget';
import { useLiveSession } from './hooks/useLiveSession';
import { SettingsModal } from './components/SettingsModal';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { connect, disconnect, state, errorMsg, volume } = useLiveSession();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        if ((window as any).ipcRenderer?.getUserConfig) {
          const config = await (window as any).ipcRenderer.getUserConfig();
          if (!config?.apiKey) {
            setShowSettings(true);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to inspect initial config:', e);
      }
      connect();
    }
    init();

    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if ((window as any).ipcRenderer?.setWindowMode) {
      (window as any).ipcRenderer.setWindowMode(showSettings ? 'expanded' : 'compact');
    }
  }, [showSettings]);

  const handleToggle = () => {
    if (state === 'idle' || state === 'error') {
      connect();
    } else {
      disconnect();
    }
  };

  const handleConfigSaved = () => {
    connect();
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-transparent pointer-events-none pt-4 gap-4">
      <div className="pointer-events-auto">
        <WaveWidget 
          state={state} 
          onToggle={handleToggle} 
          onSettingsClick={() => setShowSettings(prev => !prev)}
          errorMsg={errorMsg} 
          volume={volume} 
        />
      </div>
      
      <div className="pointer-events-auto origin-top">
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <SettingsModal 
                onClose={() => setShowSettings(false)} 
                onConfigSaved={handleConfigSaved}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
