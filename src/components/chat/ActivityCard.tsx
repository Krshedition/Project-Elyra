import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { ActivityStep } from '../../types/chat';

interface ActivityCardProps {
  title?: string;
  steps: ActivityStep[];
  onOpenEmail?: () => void;
  className?: string;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  title = 'Elyra is working...',
  steps,
  onOpenEmail,
  className = '',
}) => {
  return (
    <div className={`rounded-2xl bg-[#141928]/90 border border-purple-500/20 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md max-w-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-500/10 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-sm">✨</span>
          <span className="text-xs font-semibold text-purple-200 tracking-wide">{title}</span>
        </div>
        {onOpenEmail && (
          <button
            onClick={onOpenEmail}
            className="flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-200 transition-colors"
          >
            <span>Open Email</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Steps List */}
      <div className="flex flex-col gap-2.5">
        {steps.map((step) => {
          return (
            <div key={step.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                {step.status === 'completed' && (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                {step.status === 'in_progress' && (
                  <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-400/50 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_6px_#A855F7]" />
                  </div>
                )}
                {step.status === 'pending' && (
                  <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  </div>
                )}

                <span
                  className={`transition-colors ${
                    step.status === 'completed'
                      ? 'text-slate-300'
                      : step.status === 'in_progress'
                      ? 'text-purple-200 font-medium'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {step.timestamp && (
                <span className="text-[10px] text-slate-500">{step.timestamp}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
