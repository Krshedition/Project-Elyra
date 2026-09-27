import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Terminal, 
  Layers, 
  Cpu, 
  ArrowRight,
  Check,
  ShieldCheck
} from 'lucide-react';
import { ElyraOrb } from '../elyra/ElyraOrb';
import type { AutomatedTask } from '../../types/chat';

interface TaskDetailProps {
  task: AutomatedTask;
  onPauseResume?: (taskId: string) => void;
  onRerun?: (taskId: string) => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  onPauseResume,
  onRerun,
}) => {
  const completedCount = task.steps.filter(s => s.status === 'completed').length;
  const totalCount = task.steps.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 h-full flex flex-col bg-[#0B0E17] overflow-y-auto">
      {/* Top Banner: Task Info & Progress */}
      <div className="p-6 border-b border-purple-500/10 bg-[#0E1220]/70 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-purple-400" />
                <span>Multi-Step Task Decomposition</span>
              </span>
              {task.sourceApp && task.targetApp && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <span className="text-purple-300 font-medium">{task.sourceApp}</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-purple-300 font-medium">{task.targetApp}</span>
                </div>
              )}
            </div>

            <h2 className="text-lg font-bold text-white tracking-wide">{task.title}</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {task.goal}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onPauseResume && task.status !== 'completed' && (
              <button
                onClick={() => onPauseResume(task.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                {task.status === 'paused' ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            )}

            {onRerun && (
              <button
                onClick={() => onRerun(task.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-xs font-semibold text-purple-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-300" />
                <span>Rerun Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">
              Sub-Problems: <span className="text-purple-200 font-semibold">{completedCount} of {totalCount} completed</span>
            </span>
            <span className="text-purple-300 font-semibold">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-violet-400 to-cyan-400 transition-all duration-300 shadow-[0_0_12px_rgba(139,92,246,0.5)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6 flex-1">
        {/* Section: Sub-Problems Execution Chain */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Problem Breakdown & Sub-Step Hierarchy
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">Autonomous Chain Execution</span>
          </div>

          {/* Stepper Chain */}
          <div className="space-y-3">
            {task.steps.map((step, idx) => {
              const isCompleted = step.status === 'completed';
              const isInProgress = step.status === 'in_progress';

              return (
                <div
                  key={step.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex items-start gap-4 ${
                    isInProgress
                      ? 'bg-purple-950/25 border-purple-500/40 shadow-[0_0_25px_rgba(139,92,246,0.15)] ring-1 ring-purple-500/20'
                      : isCompleted
                      ? 'bg-[#121626]/60 border-emerald-500/20'
                      : 'bg-[#101424]/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  {/* Step Status Icon / Orb */}
                  <div className="mt-0.5 shrink-0">
                    {isCompleted ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : isInProgress ? (
                      <div className="w-7 h-7 flex items-center justify-center">
                        <ElyraOrb size="sm" state="working" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500 text-xs font-semibold">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  {/* Step Description */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-semibold ${
                          isInProgress
                            ? 'text-purple-200'
                            : isCompleted
                            ? 'text-slate-200'
                            : 'text-slate-400'
                        }`}
                      >
                        Sub-problem {idx + 1}: {step.title}
                      </h4>

                      {step.timestamp && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {step.timestamp} {step.durationMs ? `(${step.durationMs}ms)` : ''}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {step.subProblem}
                    </p>

                    {/* Action Payload Preview */}
                    {step.actionName && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-black/40 border border-purple-500/20 text-[10px] font-mono text-purple-300">
                          {step.actionName}
                        </span>
                        {step.actionDetails && (
                          <span className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                            {step.actionDetails}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Step Verification Proof */}
                    {(step.verificationResult || step.verificationMethod) && (
                      <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-emerald-400">
                          {step.verificationResult ? 'Verification Proof:' : 'Verifier Check:'}
                        </span>
                        <span className="text-emerald-200/90 truncate">
                          {step.verificationResult || step.verificationMethod}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: Live Terminal / Execution Stream */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Live Automation Logs & IPC Trace
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Auto-scrolling</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#070912] border border-purple-500/15 font-mono text-xs text-slate-300 max-h-56 overflow-y-auto space-y-1 select-text shadow-inner">
            {task.logs.length === 0 ? (
              <div className="text-slate-600 text-xs italic">Waiting for execution stream...</div>
            ) : (
              task.logs.map((log, i) => (
                <div key={i} className="leading-relaxed flex items-start gap-2">
                  <span className="text-purple-400/80 shrink-0">❯</span>
                  <span className={log.includes('Success') || log.includes('✓') ? 'text-emerald-300' : log.includes('Error') ? 'text-rose-400' : 'text-slate-300'}>
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
