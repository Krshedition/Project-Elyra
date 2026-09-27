import React from 'react';
import { ElyraOrb } from '../elyra/ElyraOrb';
import { ActivityCard } from './ActivityCard';
import type { ChatMessage } from '../../types/chat';
import { CheckCircle2, Mail } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  onOpenEmail?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOpenEmail }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-3 my-3">
        <div className="flex flex-col items-end max-w-lg">
          <div className="rounded-2xl rounded-tr-sm bg-[#1E2438] border border-purple-500/20 px-4 py-3 text-sm text-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
            <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 px-1">{message.timestamp}</span>
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-xs font-semibold text-white shadow-[0_0_8px_rgba(124,58,237,0.4)] flex-shrink-0 mt-0.5">
          K
        </div>
      </div>
    );
  }

  // Assistant / Elyra Message
  return (
    <div className="flex items-start gap-3 my-3">
      {/* Elyra Avatar Orb */}
      <div className="flex-shrink-0 mt-0.5">
        <ElyraOrb size="sm" state={message.isSuccess ? 'success' : 'idle'} />
      </div>

      <div className="flex flex-col items-start max-w-xl gap-2.5">
        {/* Main Text Bubble */}
        {message.text && (
          <div className="rounded-2xl rounded-tl-sm bg-[#131726]/90 border border-purple-500/15 px-4 py-3 text-sm text-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-sm">
            <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
          </div>
        )}

        {/* Inline Activity Checklist Card if active/in-progress */}
        {message.activity && message.activity.steps.length > 0 && (
          <ActivityCard
            title={message.activity.title}
            steps={message.activity.steps}
            onOpenEmail={onOpenEmail}
          />
        )}

        {/* Success Alert Card (e.g. Email Sent) */}
        {message.isSuccess && (
          <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-3.5 flex items-center justify-between gap-4 max-w-md shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-emerald-300">Email sent successfully!</span>
                <span className="text-[11px] text-slate-300">
                  {message.emailDraft ? `Sent to ${message.emailDraft.to}` : 'Delivered to recipient'}
                </span>
              </div>
            </div>

            {onOpenEmail && (
              <button
                onClick={onOpenEmail}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/25 transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3 h-3" />
                <span>View</span>
              </button>
            )}
          </div>
        )}

        <span className="text-[10px] text-slate-500 px-1">{message.timestamp}</span>
      </div>
    </div>
  );
};
