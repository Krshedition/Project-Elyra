import React from 'react';
import { ArrowRight, CheckCircle2, Loader2, PauseCircle, XCircle } from 'lucide-react';
import type { AutomatedTask } from '../../types/chat';

interface TaskCardProps {
  task: AutomatedTask;
  isSelected: boolean;
  onSelect: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSelected,
  onSelect,
}) => {
  const completedSteps = task.steps.filter(s => s.status === 'completed').length;
  const totalSteps = task.steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const getStatusBadge = () => {
    switch (task.status) {
      case 'in_progress':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[10px] font-semibold">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>Running</span>
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Completed</span>
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-semibold">
            <PauseCircle className="w-2.5 h-2.5" />
            <span>Paused</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[10px] font-semibold">
            <XCircle className="w-2.5 h-2.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[10px] font-semibold">
            <span>Planning</span>
          </span>
        );
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border text-left ${
        isSelected
          ? 'bg-purple-950/30 border-purple-500/40 shadow-[0_4px_20px_rgba(139,92,246,0.15)] ring-1 ring-purple-500/20'
          : 'bg-[#121626]/70 hover:bg-[#151B2E] border-purple-500/10 hover:border-purple-500/25'
      }`}
    >
      {/* Header: Title & Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-xs font-semibold text-slate-100 line-clamp-1">{task.title}</h4>
        {getStatusBadge()}
      </div>

      {/* Cross-App Path if present */}
      {task.sourceApp && task.targetApp && (
        <div className="flex items-center gap-1.5 text-[11px] text-purple-300/80 mb-2 font-mono">
          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">{task.sourceApp}</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">{task.targetApp}</span>
        </div>
      )}

      {/* Sub-Problems Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Sub-problems: {completedSteps}/{totalSteps}</span>
          <span className="font-semibold text-purple-300">{progressPct}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              task.status === 'completed'
                ? 'bg-emerald-400'
                : 'bg-gradient-to-r from-purple-500 to-cyan-400'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Footer Timestamp */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500">
        <span>Started {task.startedAt}</span>
        {task.completedAt && <span>Finished {task.completedAt}</span>}
      </div>
    </div>
  );
};
