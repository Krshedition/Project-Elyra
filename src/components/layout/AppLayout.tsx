import React, { useState, useEffect } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { ChatView } from '../chat/ChatView';
import { EmailView } from '../email/EmailView';
import { TasksView } from '../tasks/TasksView';
import { SettingsModal } from '../settings/SettingsModal';
import { GoogleLoginModal } from '../auth/GoogleLoginModal';
import type { ChatMessage, EmailDraft, ElyraState, AutomatedTask } from '../../types/chat';

interface AppLayoutProps {
  currentTab: 'chat' | 'email' | 'tasks';
  onSelectTab: (tab: 'chat' | 'email' | 'tasks') => void;
  elyraState: ElyraState;
  volume: number;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  emailDraft: EmailDraft | null;
  onUpdateDraft: (updated: Partial<EmailDraft>) => void;
  onSendEmail: () => void;
  onFinishDrafting: () => void;
  onCreateNewDraft: () => void;
  onToggleVoice: () => void;
  onRefreshSession?: () => void;
  tasks?: AutomatedTask[];
  onTriggerTask?: (taskTitle: string) => void;
  onPauseResumeTask?: (taskId: string) => void;
  onRerunTask?: (taskId: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  elyraState,
  volume,
  messages,
  onSendMessage,
  emailDraft,
  onUpdateDraft,
  onSendEmail,
  onFinishDrafting,
  onCreateNewDraft,
  onToggleVoice,
  onRefreshSession,
  tasks = [],
  onTriggerTask,
  onPauseResumeTask,
  onRerunTask,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGoogleAuthOpen, setIsGoogleAuthOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  const activeTasksCount = tasks.filter(t => t.status === 'in_progress').length;

  useEffect(() => {
    const checkEmail = async () => {
      try {
        if ((window as any).ipcRenderer?.getEmailConfig) {
          const cfg = await (window as any).ipcRenderer.getEmailConfig();
          if (cfg.connected && cfg.email) {
            setGoogleEmail(cfg.email);
          }
        }
      } catch (e) {
        console.error('Failed to get email config:', e);
      }
    };
    checkEmail();
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0B0E17] text-slate-100 overflow-hidden font-sans select-none relative">
      {/* Subtle ambient purple glow in background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none -z-0" />

      {/* Custom Title Bar */}
      <TopBar
        state={elyraState}
        onRefreshSession={onRefreshSession}
        onOpenGoogleAuth={() => setIsGoogleAuthOpen(true)}
        googleEmail={googleEmail}
      />

      {/* Main Desktop Workspace Area */}
      <div className="flex-1 flex overflow-hidden z-10">
        {/* Left Primary Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          hasDraft={emailDraft !== null && emailDraft.status !== 'sent'}
          activeTasksCount={activeTasksCount}
        />

        {/* Tab Content: Chat, Email, or Tasks */}
        <main className="flex-1 h-full overflow-hidden flex flex-col">
          {currentTab === 'chat' ? (
            <ChatView
              messages={messages}
              onSendMessage={onSendMessage}
              onOpenEmail={() => onSelectTab('email')}
              elyraState={elyraState}
              volume={volume}
              onToggleVoice={onToggleVoice}
            />
          ) : currentTab === 'email' ? (
            <EmailView
              draft={emailDraft}
              onUpdateDraft={onUpdateDraft}
              onSendEmail={onSendEmail}
              onFinishDrafting={onFinishDrafting}
              onCreateNewDraft={onCreateNewDraft}
              googleEmail={googleEmail}
              onOpenGoogleAuth={() => setIsGoogleAuthOpen(true)}
            />
          ) : (
            <TasksView
              tasks={tasks}
              onTriggerTask={onTriggerTask}
              onPauseResumeTask={onPauseResumeTask}
              onRerunTask={onRerunTask}
            />
          )}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Google Login & Auth Modal */}
      <GoogleLoginModal
        isOpen={isGoogleAuthOpen}
        onClose={() => setIsGoogleAuthOpen(false)}
        onConnected={(em) => setGoogleEmail(em)}
      />
    </div>
  );
};
