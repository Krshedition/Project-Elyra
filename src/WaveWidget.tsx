
import { Mic, MicOff, Settings, Keyboard, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export type SessionState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface WaveWidgetProps {
  state: SessionState;
  onToggle: () => void;
  errorMsg?: string;
  volume?: number;
}

export function WaveWidget({ state, onToggle, errorMsg, volume = 0 }: WaveWidgetProps) {
  let orbClass = 'border-white/20';
  let orbGlow = '';
  let statusText = 'Click to Connect';
  let statusColor = 'text-gray-400';

  if (state === 'connecting') {
    statusText = 'Connecting...';
    statusColor = 'text-yellow-400';
    orbClass = 'border-yellow-400/50';
    orbGlow = 'shadow-[0_0_20px_rgba(250,204,21,0.4)]';
  } else if (state === 'listening') {
    statusText = 'Listening...';
    statusColor = 'text-pink-400';
    orbClass = 'border-pink-500/80';
    orbGlow = 'shadow-[0_0_30px_rgba(236,72,153,0.6)] animate-pulse';
  } else if (state === 'speaking') {
    statusText = 'Speaking...';
    statusColor = 'text-cyan-400';
    orbClass = 'border-cyan-400/80';
    orbGlow = 'shadow-[0_0_30px_rgba(34,211,238,0.6)]';
  } else if (state === 'error') {
    statusText = 'Connection Error';
    statusColor = 'text-red-400';
    orbClass = 'border-red-500/80';
  }

  return (
    <div 
      className="w-full max-w-[480px] h-[100px] rounded-[50px] overflow-hidden relative bg-[#0a0514]/80 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.15)] flex items-center px-6 gap-6" 
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Decorative glowing lines */}
      <div className="absolute inset-0 rounded-[50px] border border-white/5 pointer-events-none" />
      <div className="absolute bottom-0 left-[30%] w-[40%] h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_10px_rgba(168,85,247,1)]" />

      {/* Orb / Avatar Area */}
      <button 
        onClick={onToggle}
        className={`relative w-[60px] h-[60px] rounded-full border-2 bg-gradient-to-tr from-indigo-900 to-purple-800 flex items-center justify-center z-10 transition-all duration-300 ${orbClass} ${orbGlow}`}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* Animated Inner Waves based on volume */}
        {state === 'speaking' && (
          <motion.div 
            className="absolute inset-1 rounded-full bg-cyan-400/30 blur-md"
            animate={{ scale: 1 + volume * 1.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        )}
        {state === 'listening' && (
          <motion.div 
            className="absolute inset-1 rounded-full bg-pink-400/30 blur-md"
            animate={{ scale: 1 + volume * 1.5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        )}
        {state === 'idle' || state === 'error' ? <MicOff className="w-6 h-6 text-white/50" /> : <Mic className="w-6 h-6 text-white" />}
      </button>

      {/* Text Area */}
      <div className="flex flex-col flex-1 z-10 overflow-hidden">
        <h1 className="text-white text-xl font-semibold tracking-wide m-0 leading-tight">ELYRA</h1>
        <p className={`text-sm ${statusColor} m-0 font-medium tracking-wide truncate`} title={errorMsg || ''}>
          {errorMsg || statusText}
        </p>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-4 z-10 pr-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button className="text-white/50 hover:text-white transition-colors">
          <Activity className="w-5 h-5" />
        </button>
        <button className="text-white/50 hover:text-white transition-colors">
          <Keyboard className="w-5 h-5" />
        </button>
        <button className="text-white/50 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
