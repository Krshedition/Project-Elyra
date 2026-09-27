import React, { useEffect, useState } from 'react';
import { Minus, Square, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { ElyraState } from '../../types/chat';

interface TopBarProps {
  state: ElyraState;
  onRefreshSession?: () => void;
  onOpenGoogleAuth?: () => void;
  googleEmail?: string | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  onRefreshSession,
  onOpenGoogleAuth,
  googleEmail,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMax = async () => {
      if ((window as any).ipcRenderer?.isWindowMaximized) {
        const max = await (window as any).ipcRenderer.isWindowMaximized();
        setIsMaximized(max);
      }
    };
    checkMax();
  }, []);

  const handleMinimize = () => {
    (window as any).ipcRenderer?.windowMinimize?.();
  };

  const handleMaximize = () => {
    (window as any).ipcRenderer?.windowMaximize?.();
    setIsMaximized(prev => !prev);
  };

  const handleClose = () => {
    (window as any).ipcRenderer?.windowClose?.();
  };

  const renderStatus = () => {
    switch (state) {
      case 'listening':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>Listening...</span>
          </div>
        );
      case 'thinking':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span>Thinking...</span>
          </div>
        );
      case 'working':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-spin" />
            <span>Working...</span>
          </div>
        );
      case 'speaking':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>Speaking</span>
          </div>
        );
      case 'approval':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Waiting for approval</span>
          </div>
        );
      case 'sending':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-spin" />
            <span>Sending email...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Done</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Error</span>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
            <span>Online</span>
          </div>
        );
    }
  };

  return (
    <div className="app-drag-region h-11 w-full flex items-center justify-between px-4 bg-[#0B0E17]/95 border-b border-purple-500/10 select-none z-50">
      {/* Left title / subtitle */}
      <div className="flex items-center gap-2 app-no-drag">
        <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Project Elyra</span>
        <span className="text-[11px] text-purple-400/60">• Desktop Assistant</span>
      </div>

      {/* Right Controls: Status & Window Buttons */}
      <div className="flex items-center gap-2.5 app-no-drag">
        {onOpenGoogleAuth && (
          googleEmail ? (
            <button
              onClick={onOpenGoogleAuth}
              title={`Connected as ${googleEmail}. Click to manage.`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-xs font-medium transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="max-w-[120px] truncate">{googleEmail}</span>
            </button>
          ) : (
            <button
              onClick={onOpenGoogleAuth}
              title="Connect your Google Account to authorize Elyra to send emails"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-medium transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )
        )}

        {renderStatus()}

        {onRefreshSession && (
          <button
            onClick={onRefreshSession}
            title="Reconnect Session"
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            <Square className={`w-3 h-3 ${isMaximized ? 'text-purple-400' : ''}`} />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
