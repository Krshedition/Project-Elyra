import React from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  volume?: number; // 0 to 1
  active?: boolean;
  className?: string;
  color?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  volume = 0,
  active = true,
  className = '',
  color = '#8B5CF6',
}) => {
  const bars = [0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.6];

  return (
    <div className={`flex items-center gap-[3px] h-6 px-2 ${className}`}>
      {bars.map((weight, index) => {
        const height = active ? Math.max(4, Math.min(22, 5 + volume * 24 * weight)) : 4;
        return (
          <motion.div
            key={index}
            className="w-[3px] rounded-full"
            style={{ backgroundColor: color }}
            animate={{ height }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15,
            }}
          />
        );
      })}
    </div>
  );
};
