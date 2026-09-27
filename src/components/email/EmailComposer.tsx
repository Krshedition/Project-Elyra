import React, { useState, useEffect } from 'react';
import { Minus, Maximize2, X, Send, Check, Bold, Italic, Underline, List, Link as LinkIcon, Paperclip, Loader2, Edit3 } from 'lucide-react';
import type { EmailDraft } from '../../types/chat';

interface EmailComposerProps {
  draft: EmailDraft;
  onUpdateDraft: (updated: Partial<EmailDraft>) => void;
  onSendEmail: () => void;
  onFinishDrafting: () => void;
  googleEmail?: string | null;
  onOpenGoogleAuth?: () => void;
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  draft,
  onUpdateDraft,
  onSendEmail,
  onFinishDrafting,
  googleEmail,
  onOpenGoogleAuth,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayedBody, setDisplayedBody] = useState('');
  const isDrafting = draft.status === 'drafting';
  const isWaitingApproval = draft.status === 'waiting_approval';
  const isSending = draft.status === 'sending';
  const isSent = draft.status === 'sent';

  // Realistic Typewriter effect when Elyra is drafting
  useEffect(() => {
    if (!isDrafting) {
      setDisplayedBody(draft.body);
      return;
    }

    const fullText = draft.body;
    let index = 0;
    setDisplayedBody('');

    const interval = setInterval(() => {
      index += 2; // type 2 characters at a time for smooth realistic speed
      if (index >= fullText.length) {
        setDisplayedBody(fullText);
        clearInterval(interval);
        setTimeout(() => {
          onFinishDrafting();
        }, 500);
      } else {
        setDisplayedBody(fullText.slice(0, index));
      }
    }, 28);

    return () => clearInterval(interval);
  }, [draft.body, isDrafting]);

  return (
    <div className="flex-1 h-full p-6 flex flex-col items-center justify-center bg-[#0B0E17]/50 overflow-hidden">
      <div className="w-full max-w-2xl bg-[#121626] border border-purple-500/20 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#15192C] border-b border-purple-500/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">
              New Email {isDrafting ? '(Elyra is drafting...)' : isSent ? '(Sent)' : '(Draft)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <button className="p-1 hover:text-slate-200 hover:bg-slate-800 rounded">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 hover:text-slate-200 hover:bg-slate-800 rounded">
              <Maximize2 className="w-3 h-3" />
            </button>
            <button className="p-1 hover:text-rose-400 hover:bg-rose-500/20 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* From: Field (Google Account Status) */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-purple-500/10 text-xs bg-[#111628]/40">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium w-12">From:</span>
            {googleEmail ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-200 font-medium">Krish Bhutiya</span>
                <span className="text-purple-300 font-mono text-[11px]">&lt;{googleEmail}&gt;</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  Google Verified
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xs font-medium">No Google Account Connected</span>
                {onOpenGoogleAuth && (
                  <button
                    type="button"
                    onClick={onOpenGoogleAuth}
                    className="text-purple-400 hover:text-purple-300 underline font-semibold text-xs ml-1"
                  >
                    Connect with Google →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* To: Field */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-slate-400 font-medium w-12">To:</span>
            {isEditing ? (
              <input
                type="text"
                value={draft.to}
                onChange={(e) => onUpdateDraft({ to: e.target.value })}
                className="flex-1 bg-slate-900/60 border border-purple-500/30 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
              />
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-200 font-medium">
                <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                  {draft.recipientName ? draft.recipientName[0].toUpperCase() : 'R'}
                </div>
                <span>{draft.recipientName || draft.to}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <span className="hover:text-slate-300 cursor-pointer">Cc</span>
            <span className="hover:text-slate-300 cursor-pointer">Bcc</span>
          </div>
        </div>

        {/* Subject Field */}
        <div className="flex items-center px-5 py-3 border-b border-slate-800/80 text-xs">
          <span className="text-slate-400 font-medium w-12">Subject:</span>
          {isEditing ? (
            <input
              type="text"
              value={draft.subject}
              onChange={(e) => onUpdateDraft({ subject: e.target.value })}
              className="flex-1 bg-slate-900/60 border border-purple-500/30 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none"
            />
          ) : (
            <span className="text-slate-200 font-medium flex-1">{draft.subject}</span>
          )}
        </div>

        {/* Email Body Area with progressive typing */}
        <div className="flex-1 p-5 min-h-[220px] max-h-[300px] overflow-y-auto font-sans text-sm text-slate-300 leading-relaxed bg-[#0F1322]/40">
          {isEditing ? (
            <textarea
              value={draft.body}
              onChange={(e) => onUpdateDraft({ body: e.target.value })}
              rows={8}
              className="w-full h-full bg-transparent resize-none text-slate-200 text-sm focus:outline-none leading-relaxed"
            />
          ) : (
            <div className="whitespace-pre-wrap">
              {displayedBody}
              {isDrafting && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-purple-400 animate-pulse align-middle" />
              )}
            </div>
          )}
        </div>

        {/* Bottom Toolbar & Action Buttons */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#15192C]/90 border-t border-purple-500/10">
          {/* Rich Text Format Tools */}
          <div className="flex items-center gap-1 text-slate-400">
            <button className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded">
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded">
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded">
              <Underline className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-700 mx-1" />
            <button className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded">
              <List className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded">
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Explicit User Approval Actions */}
          <div className="flex items-center gap-2.5">
            {isWaitingApproval && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-1.5 rounded-xl border border-purple-500/30 hover:border-purple-400 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                <span>{isEditing ? 'Done Editing' : 'Edit'}</span>
              </button>
            )}

            {isDrafting && (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Writing message...</span>
              </div>
            )}

            {isWaitingApproval && (
              <button
                type="button"
                onClick={() => {
                  if (!googleEmail && onOpenGoogleAuth) {
                    onOpenGoogleAuth();
                  } else {
                    onSendEmail();
                  }
                }}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-[0_0_16px_rgba(147,51,234,0.5)] active:scale-95 flex items-center gap-2"
              >
                <span>{googleEmail ? 'Send Email' : 'Sign in & Send'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}

            {isSending && (
              <button
                disabled
                className="px-5 py-2 rounded-xl bg-purple-700/60 text-purple-200 text-xs font-semibold flex items-center gap-2 cursor-wait"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending...</span>
              </button>
            )}

            {isSent && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>Sent</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
