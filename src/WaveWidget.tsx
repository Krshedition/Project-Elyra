import { Mic, MicOff, Settings, Keyboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export type SessionState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface WaveWidgetProps {
  state: SessionState;
  onToggle: () => void;
  errorMsg?: string;
  volume?: number;
}

function ReactiveWaveform({ volume, active }: { volume: number, active: boolean }) {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  return (
    <div className="flex items-center gap-[3px] h-[20px]">
      {bars.map((i) => {
        const distance = Math.abs(i - 6);
        const maxScale = Math.max(0.1, 1 - (distance * 0.15));
        const activeHeight = maxScale * (0.2 + volume * 2.5);
        
        return (
          <motion.div 
            key={i}
            className="w-[2px] rounded-full bg-purple-400"
            animate={
              active 
                ? { height: `${Math.min(100, Math.max(10, activeHeight * 100))}%` }
                : { height: ['15%', `${20 + maxScale * 30}%`, '15%'] }
            }
            transition={
              active 
                ? { duration: 0.05 }
                : { duration: 1.5 + (i % 3) * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }
            }
          />
        );
      })}
    </div>
  );
}

function BackgroundParticles({ mouseX, mouseY }: { mouseX: number, mouseY: number }) {
  const particles = Array.from({ length: 15 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-purple-300 rounded-full shadow-[0_0_5px_#d8b4fe]"
          initial={{ 
            x: Math.random() * 480, 
            y: Math.random() * 100,
            opacity: Math.random() * 0.5 + 0.1
          }}
          animate={{
            x: `calc(${Math.random() * 480}px + ${mouseX * (i % 2 === 0 ? 30 : -30)}px)`,
            y: `calc(${Math.random() * 100}px + ${mouseY * (i % 2 === 0 ? 30 : -30)}px)`,
            opacity: [0.1, 0.8, 0.1]
          }}
          transition={{
            x: { duration: 10 + Math.random() * 10, repeat: Infinity, repeatType: 'mirror', ease: 'linear' },
            y: { duration: 10 + Math.random() * 10, repeat: Infinity, repeatType: 'mirror', ease: 'linear' },
            opacity: { duration: 2 + Math.random() * 3, repeat: Infinity, repeatType: 'mirror' }
          }}
        />
      ))}
    </div>
  );
}

export function WaveWidget({ state, onToggle, errorMsg, volume = 0 }: WaveWidgetProps) {
  const [bootPhase, setBootPhase] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Boot sequence
    const t1 = setTimeout(() => setBootPhase(1), 200);
    const t2 = setTimeout(() => setBootPhase(2), 500);
    const t3 = setTimeout(() => setBootPhase(3), 800);
    const t4 = setTimeout(() => setBootPhase(4), 1200);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ 
        x: (e.clientX / window.innerWidth) - 0.5, 
        y: (e.clientY / window.innerHeight) - 0.5 
      });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  let orbClass = 'border-white/20';
  let orbGlow = '';
  let statusText = 'Click to Connect';
  let statusColor = 'text-gray-400';

  if (state === 'connecting') {
    statusText = 'Connecting...';
    statusColor = 'text-yellow-400';
    orbClass = 'border-yellow-400/50';
    orbGlow = 'shadow-[0_0_20px_rgba(250,204,21,0.4)] border-yellow-400/30';
  } else if (state === 'listening') {
    statusText = 'Listening...';
    statusColor = 'text-purple-300';
    orbClass = 'border-purple-400/80 shadow-[inset_0_0_15px_rgba(168,85,247,0.3)]';
    orbGlow = 'shadow-[0_0_30px_rgba(168,85,247,0.5)] border-purple-500/50 animate-pulse';
  } else if (state === 'speaking') {
    statusText = 'Speaking...';
    statusColor = 'text-cyan-300';
    orbClass = 'border-cyan-400/80 shadow-[inset_0_0_15px_rgba(34,211,238,0.3)]';
    orbGlow = 'shadow-[0_0_30px_rgba(34,211,238,0.5)] border-cyan-400/50';
  } else if (state === 'error') {
    statusText = 'Connection Error';
    statusColor = 'text-red-400';
    orbClass = 'border-red-500/80';
  }

  const isAudioActive = state === 'speaking' || state === 'listening';

  return (
    <motion.div 
      className="h-[100px] rounded-[50px] relative shadow-[0_0_40px_rgba(168,85,247,0.15)] flex items-center gap-6 mx-auto" 
      initial={{ width: 100, paddingLeft: 18, paddingRight: 18, opacity: 0 }}
      animate={{ 
        width: bootPhase >= 3 ? 480 : 100,
        paddingLeft: bootPhase >= 3 ? 24 : 18,
        paddingRight: bootPhase >= 3 ? 24 : 18,
        opacity: bootPhase >= 1 ? 1 : 0
      }}
      transition={{ duration: 0.6, type: "spring", bounce: 0.2 }}
      style={{ WebkitAppRegion: 'drag', background: 'transparent' } as any}
    >
      {/* Revolving Conic Gradient Border */}
      {bootPhase >= 1 && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-[50px]">
          <motion.div 
            className="w-[800px] h-[800px] bg-[conic-gradient(from_0deg,transparent_0_320deg,rgba(168,85,247,1)_360deg)] opacity-70"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Glass Specular Sweep */}
      {bootPhase >= 4 && (
        <motion.div 
          className="absolute top-0 left-[-100%] w-[100px] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-30deg] pointer-events-none z-20"
          animate={{ left: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 10, ease: 'linear' }}
        />
      )}

      {/* Inner Mask (Aurora background) */}
      <div className="absolute inset-[1px] rounded-[49px] bg-[#090410]/90 backdrop-blur-3xl overflow-hidden pointer-events-none z-0">
        {bootPhase >= 3 && (
          <>
            <motion.div 
              className="absolute -top-[50px] -left-[20%] w-[200px] h-[200px] bg-purple-600/30 rounded-full blur-[40px]"
              animate={{ x: [0, 50, 0], y: [0, 20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div 
              className="absolute -bottom-[50px] right-[10%] w-[250px] h-[250px] bg-blue-600/20 rounded-full blur-[50px]"
              animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}
      </div>
      
      <div className="absolute inset-0 rounded-[50px] border border-white/5 pointer-events-none z-0" />

      {/* Background Particles */}
      {bootPhase >= 3 && <BackgroundParticles mouseX={mousePos.x} mouseY={mousePos.y} />}

      {/* 0.0s Ignition Pinpoint */}
      {bootPhase === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <motion.div 
            className="w-2 h-2 bg-white rounded-full shadow-[0_0_20px_10px_rgba(255,255,255,0.8)]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {/* Orb / Avatar Area */}
      <div className="relative w-[64px] h-[64px] flex items-center justify-center z-10 shrink-0 ml-2">
        {/* Orbital Rings */}
        {bootPhase >= 1 && (
          <>
            <motion.div 
              className="absolute inset-[-4px] rounded-full border border-purple-500/30 border-t-purple-400/80 pointer-events-none"
              animate={{ rotate: 360, opacity: [0.6, 1, 0.6] }}
              transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, opacity: { duration: 2, repeat: Infinity } }}
            />
            <motion.div 
              className="absolute inset-[-8px] rounded-full border border-blue-500/20 border-b-blue-400/60 pointer-events-none"
              animate={{ rotate: -360, opacity: [0.4, 0.8, 0.4] }}
              transition={{ rotate: { duration: 5, repeat: Infinity, ease: "linear" }, opacity: { duration: 3, repeat: Infinity } }}
            />
          </>
        )}
        
        {/* Outer glowing ring */}
        <div className={`absolute inset-0 rounded-full border border-white/10 ${orbGlow} transition-all duration-300 pointer-events-none`} />
        
        {/* Inner glass sphere */}
        <button 
          onClick={onToggle}
          className={`relative w-[50px] h-[50px] rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/20 backdrop-blur-md shadow-[inset_0_4px_20px_rgba(255,255,255,0.1)] flex items-center justify-center transition-all duration-300 overflow-hidden ${orbClass}`}
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {/* Animated Fluid Inner Waves */}
          {bootPhase >= 2 && (
            <>
              {/* Idle continuous wave */}
              <motion.div 
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t ${state === 'speaking' ? 'from-cyan-400/60' : 'from-purple-500/60'} to-transparent blur-[2px] transition-colors duration-500`}
                animate={{ 
                  height: isAudioActive 
                    ? [`${30 + volume * 70}%`, `${20 + volume * 50}%`] 
                    : ['20%', '25%', '20%'] 
                }}
                transition={
                  isAudioActive 
                    ? { type: 'spring', stiffness: 200, damping: 10 }
                    : { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }
              />
              <motion.div 
                className={`absolute inset-0 bg-[radial-gradient(circle_at_center,${state === 'speaking' ? 'rgba(34,211,238,0.5)' : 'rgba(168,85,247,0.5)'}_0%,transparent_70%)] transition-colors duration-500`}
                animate={{ opacity: isAudioActive ? 0.5 + volume : [0.3, 0.5, 0.3] }}
                transition={
                  isAudioActive 
                    ? { duration: 0.1 }
                    : { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }
              />
            </>
          )}
          
          <div className="relative z-10">
            {state === 'idle' || state === 'error' ? <MicOff className="w-5 h-5 text-white/50" /> : <Mic className="w-5 h-5 text-white drop-shadow-md" />}
          </div>
        </button>
      </div>

      {/* Text Area & Glitch reveal */}
      {bootPhase >= 4 && (
        <motion.div 
          className="flex flex-col flex-1 z-10 overflow-hidden"
          initial={{ opacity: 0, x: -10, filter: 'blur(4px) hue-rotate(90deg)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px) hue-rotate(0deg)' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <h1 className="text-white text-xl font-semibold tracking-wide m-0 leading-tight">ELYRA</h1>
          <p className={`text-sm ${statusColor} m-0 font-medium tracking-wide truncate`} title={errorMsg || ''}>
            {errorMsg || statusText}
          </p>
        </motion.div>
      )}

      {/* Action Icons & Reactive Waveform */}
      {bootPhase >= 4 && (
        <motion.div 
          className="flex items-center gap-4 z-10 pr-2 shrink-0" 
          style={{ WebkitAppRegion: 'no-drag' } as any}
          initial={{ opacity: 0, x: 10, filter: 'blur(4px) hue-rotate(-90deg)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px) hue-rotate(0deg)' }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="mr-2">
            <ReactiveWaveform volume={volume} active={isAudioActive} />
          </div>
          <button className="text-white/50 hover:text-white transition-colors">
            <Keyboard className="w-5 h-5" />
          </button>
          <button className="text-white/50 hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
