import React from 'react';
import { MessageSquare, Mail, Settings, Sparkles, CheckSquare } from 'lucide-react';

interface SidebarProps {
  currentTab: 'chat' | 'email' | 'tasks';
  onSelectTab: (tab: 'chat' | 'email' | 'tasks') => void;
  onOpenSettings: () => void;
  hasDraft?: boolean;
  activeTasksCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  hasDraft = false,
  activeTasksCount = 0,
}) => {
  return (
    <aside className="w-56 h-full flex flex-col justify-between bg-[#0E121E] border-r border-purple-500/10 px-3 py-4 select-none">
      <div className="flex flex-col gap-6">
        {/* App Logo */}
        <div className="flex items-center gap-2.5 px-3 py-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-violet-400 flex items-center justify-center shadow-[0_0_12px_rgba(147,51,234,0.5)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide text-white font-sans">Elyra</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          <button
            onClick={() => onSelectTab('chat')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              currentTab === 'chat'
                ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <MessageSquare className={`w-4 h-4 ${currentTab === 'chat' ? 'text-purple-400' : 'text-slate-400'}`} />
            <span>Chat</span>
          </button>

          <button
            onClick={() => onSelectTab('email')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              currentTab === 'email'
                ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Mail className={`w-4 h-4 ${currentTab === 'email' ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>Email</span>
            </div>
            {hasDraft && (
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#A855F7] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => onSelectTab('tasks')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              currentTab === 'tasks'
                ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckSquare className={`w-4 h-4 ${currentTab === 'tasks' ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>Tasks</span>
            </div>
            {activeTasksCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold">
                {activeTasksCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Bottom Section: Divider & Settings */}
      <div className="flex flex-col gap-3">
        <div className="h-[1px] w-full bg-slate-800/80" />

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all duration-200"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
