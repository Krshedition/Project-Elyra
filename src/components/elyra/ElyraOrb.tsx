import React from 'react';
import { motion } from 'framer-motion';
import type { ElyraState } from '../../types/chat';

interface ElyraOrbProps {
  state?: ElyraState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  volume?: number; // 0 to 1
  className?: string;
}

export const ElyraOrb: React.FC<ElyraOrbProps> = ({
  state = 'idle',
  size = 'md',
  volume = 0,
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 32, core: 14, ring1: 26, ring2: 30 },
    md: { box: 48, core: 20, ring1: 38, ring2: 44 },
    lg: { box: 96, core: 40, ring1: 76, ring2: 88 },
    xl: { box: 160, core: 68, ring1: 130, ring2: 152 },
  };

  const dim = sizeMap[size];

  // Dynamic volume scale for speaking/listening
  const audioScale = state === 'speaking' || state === 'listening' ? 1 + Math.min(volume * 1.8, 0.45) : 1;

  // State-specific color palettes
  const getColor = () => {
    switch (state) {
      case 'error':
        return {
          glow: 'rgba(239, 68, 68, 0.4)',
          core: 'from-rose-500 via-purple-600 to-indigo-900',
          ring: 'border-rose-400/40',
        };
      case 'approval':
        return {
          glow: 'rgba(245, 158, 11, 0.45)',
          core: 'from-amber-400 via-purple-600 to-indigo-900',
          ring: 'border-amber-400/40',
        };
      case 'success':
        return {
          glow: 'rgba(16, 185, 129, 0.45)',
          core: 'from-emerald-400 via-purple-500 to-violet-900',
          ring: 'border-emerald-400/40',
        };
      case 'thinking':
      case 'working':
        return {
          glow: 'rgba(168, 85, 247, 0.55)',
          core: 'from-cyan-400 via-purple-500 to-indigo-900',
          ring: 'border-purple-400/50',
        };
      default:
        return {
          glow: 'rgba(139, 92, 246, 0.45)',
          core: 'from-violet-400 via-purple-600 to-indigo-950',
          ring: 'border-purple-400/35',
        };
    }
  };

  const colors = getColor();

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: dim.box, height: dim.box }}
    >
      {/* Outer ambient glow bloom */}
      <motion.div
        className="absolute rounded-full filter blur-xl pointer-events-none"
        style={{
          width: dim.box * 1.1,
          height: dim.box * 1.1,
          background: colors.glow,
        }}
        animate={{
          scale: [audioScale * 0.9, audioScale * 1.15, audioScale * 0.9],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: state === 'working' ? 1.5 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Outer Orbiting Ring 1 */}
      <motion.div
        className={`absolute rounded-full border border-dashed ${colors.ring}`}
        style={{
          width: dim.ring2,
          height: dim.ring2,
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.04, 1],
        }}
        transition={{
          rotate: {
            duration: state === 'thinking' || state === 'working' ? 4 : 12,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      />

      {/* Intermediate Elliptical Ring 2 */}
      <motion.div
        className={`absolute rounded-full border ${colors.ring}`}
        style={{
          width: dim.ring1,
          height: dim.ring1 * 0.85,
        }}
        animate={{
          rotate: [360, 0],
          scale: [1, 0.96, 1],
        }}
        transition={{
          rotate: {
            duration: state === 'thinking' || state === 'working' ? 6 : 16,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      />

      {/* Orbiting particle dust dots (for md, lg, xl sizes) */}
      {size !== 'sm' && (
        <motion.div
          className="absolute w-full h-full pointer-events-none"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute rounded-full bg-purple-300 shadow-[0_0_6px_#A855F7]"
            style={{
              width: 3,
              height: 3,
              top: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
          <div
            className="absolute rounded-full bg-violet-200 shadow-[0_0_6px_#8B5CF6]"
            style={{
              width: 2.5,
              height: 2.5,
              bottom: '15%',
              right: '25%',
            }}
          />
        </motion.div>
      )}

      {/* Inner Glowing Core */}
      <motion.div
        className={`relative rounded-full bg-gradient-to-tr ${colors.core} shadow-[0_0_18px_rgba(168,85,247,0.8)] z-10 flex items-center justify-center overflow-hidden`}
        style={{
          width: dim.core,
          height: dim.core,
        }}
        animate={{
          scale: [audioScale * 0.95, audioScale * 1.05, audioScale * 0.95],
        }}
        transition={{
          duration: state === 'speaking' ? 0.35 : 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Core specular highlight */}
        <div
          className="absolute rounded-full bg-white/40 filter blur-[1px]"
          style={{
            width: dim.core * 0.45,
            height: dim.core * 0.45,
            top: '15%',
            left: '20%',
          }}
        />
      </motion.div>
    </div>
  );
};
