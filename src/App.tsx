import { useEffect, useState } from 'react';
import { WaveWidget } from './WaveWidget';
import { useLiveSession } from './hooks/useLiveSession';
import { MemoryManager } from './components/MemoryManager';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { connect, disconnect, state, errorMsg, volume } = useLiveSession();
  const [showMemory, setShowMemory] = useState(false);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if ((window as any).ipcRenderer?.setWindowMode) {
      (window as any).ipcRenderer.setWindowMode(showMemory ? 'expanded' : 'compact');
    }
  }, [showMemory]);

  const handleToggle = () => {
    if (state === 'idle' || state === 'error') {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-transparent pointer-events-none pt-4 gap-4">
      <div className="pointer-events-auto">
        <WaveWidget 
          state={state} 
          onToggle={handleToggle} 
          onSettingsClick={() => setShowMemory(prev => !prev)}
          errorMsg={errorMsg} 
          volume={volume} 
        />
      </div>
      
      <div className="pointer-events-auto origin-top">
        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <MemoryManager onClose={() => setShowMemory(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
