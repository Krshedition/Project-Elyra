import React, { useState } from 'react';
import { 
  CheckSquare, 
  Play, 
  Sparkles,
  Bot
} from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskDetail } from './TaskDetail';
import type { AutomatedTask } from '../../types/chat';

interface TasksViewProps {
  tasks: AutomatedTask[];
  onTriggerTask?: (taskTitle: string) => void;
  onPauseResumeTask?: (taskId: string) => void;
  onRerunTask?: (taskId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onTriggerTask,
  onPauseResumeTask,
  onRerunTask,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');

  const allTasks = tasks;

  const filteredTasks = allTasks.filter(t => {
    if (filter === 'active') return t.status === 'in_progress' || t.status === 'planning';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const activeTask = allTasks.find(t => t.id === selectedTaskId) || allTasks[0];

  const presets = [
    {
      title: 'ChatGPT ➔ WhatsApp (Yash)',
      desc: 'Copies latest ChatGPT answer and sends it to Yash on WhatsApp',
    },
    {
      title: 'Hacker News ➔ Email Summary',
      desc: 'Fetches top AI headline and drafts an email digest for Krish',
    },
    {
      title: 'Weather Lookup ➔ Windows Alert',
      desc: 'Checks Bhopal temperature and pops native Windows notification',
    },
  ];

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-[#0B0E17]">
      {/* 1. Left Workflow List & Presets */}
      <aside className="w-80 h-full bg-[#0E121E]/80 border-r border-purple-500/10 p-4 flex flex-col justify-between overflow-y-auto select-none">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold text-white tracking-wider uppercase">Task Progress</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold">
              {allTasks.filter(t => t.status === 'in_progress').length} active
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090C16] border border-purple-500/15 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
                filter === 'all'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({allTasks.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
                filter === 'active'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex-1 py-1 rounded-lg text-center font-medium transition-all ${
                filter === 'completed'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Done
            </button>
          </div>

          {/* Task Cards List */}
          <div className="space-y-2.5">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={task.id === activeTask?.id}
                  onSelect={() => setSelectedTaskId(task.id)}
                />
              ))
            ) : (
              <div className="py-6 px-3 text-center rounded-xl bg-purple-950/10 border border-purple-500/10 text-slate-500 text-xs">
                No {filter !== 'all' ? filter : ''} tasks found.
              </div>
            )}
          </div>
        </div>

        {/* Quick Launch Presets Card */}
        <div className="mt-6 p-3.5 rounded-2xl bg-[#090C16]/90 border border-purple-500/20 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Multi-Step Workflows</span>
          </div>
          <div className="space-y-1.5">
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => onTriggerTask?.(p.title)}
                className="w-full text-left p-2 rounded-xl bg-purple-950/20 hover:bg-purple-900/30 border border-purple-500/10 hover:border-purple-500/30 transition-all text-[11px] group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-purple-300 flex items-center justify-between">
                  <span>{p.title}</span>
                  <Play className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-purple-400" />
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 2. Main Sub-Problem Stepper & Execution Inspection */}
      {activeTask ? (
        <TaskDetail
          task={activeTask}
          onPauseResume={onPauseResumeTask}
          onRerun={onRerunTask}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 select-none">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
            <Bot className="w-7 h-7 text-purple-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No Tasks In Progress</h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-sm leading-relaxed">
            Give Elyra a multi-step task like <span className="text-purple-300">"Copy prompt from ChatGPT and send to Yash on WhatsApp"</span> or click a preset below to see her break it down into verified sub-problems.
          </p>
        </div>
      )}
    </div>
  );
};
