import React from 'react';
import { Check } from 'lucide-react';
import { ElyraOrb } from '../elyra/ElyraOrb';
import type { EmailDraft } from '../../types/chat';

interface EmailActivityProps {
  draft: EmailDraft | null;
}

export const EmailActivity: React.FC<EmailActivityProps> = ({ draft }) => {
  const status = draft?.status || 'drafting';
  const recipientName = draft?.recipientName || draft?.to || 'Rahul';

  const getStepList = () => {
    switch (status) {
      case 'drafting':
        return [
          { label: `Found ${recipientName}`, status: 'completed' },
          { label: 'Writing subject', status: 'completed' },
          { label: 'Writing message', status: 'in_progress' },
          { label: 'Reviewing content', status: 'pending' },
          { label: 'Waiting for approval', status: 'pending' },
        ];
      case 'waiting_approval':
        return [
          { label: `Found ${recipientName}`, status: 'completed' },
          { label: 'Created subject', status: 'completed' },
          { label: 'Wrote message', status: 'completed' },
          { label: 'Reviewed content', status: 'completed' },
          { label: 'Waiting for your approval', status: 'in_progress' },
        ];
      case 'sending':
        return [
          { label: `Found ${recipientName}`, status: 'completed' },
          { label: 'Created subject', status: 'completed' },
          { label: 'Wrote message', status: 'completed' },
          { label: 'Reviewed content', status: 'completed' },
          { label: 'Sending email...', status: 'in_progress' },
          { label: 'Finalizing...', status: 'pending' },
        ];
      case 'sent':
        return [
          { label: `Found ${recipientName}`, status: 'completed' },
          { label: 'Created subject', status: 'completed' },
          { label: 'Wrote message', status: 'completed' },
          { label: 'Reviewed content', status: 'completed' },
          { label: 'Sent email', status: 'completed' },
        ];
      default:
        return [];
    }
  };

  const steps = getStepList();

  return (
    <aside className="w-80 h-full bg-[#0E121E]/80 border-l border-purple-500/10 p-6 flex flex-col justify-between overflow-y-auto select-none">
      <div className="flex flex-col items-center text-center">
        {/* Elyra Particle Orb */}
        <div className="my-4">
          <ElyraOrb
            size="lg"
            state={
              status === 'sent'
                ? 'success'
                : status === 'waiting_approval'
                ? 'approval'
                : status === 'sending'
                ? 'sending'
                : 'working'
            }
          />
        </div>

        {/* Dynamic Status Title */}
        {status === 'sent' ? (
          <div className="flex flex-col items-center mb-6">
            <h3 className="text-base font-bold text-emerald-400 mb-1">Email sent successfully!</h3>
            <p className="text-xs text-slate-300">
              The email has been sent to {recipientName}.
            </p>
          </div>
        ) : status === 'waiting_approval' ? (
          <div className="flex flex-col items-center mb-6">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1">Elyra</span>
            <p className="text-xs text-slate-200 leading-relaxed max-w-xs">
              I've prepared the email for {recipientName}. Please review it and let me know if you'd like me to send it.
            </p>
          </div>
        ) : status === 'sending' ? (
          <div className="flex flex-col items-center mb-6">
            <h3 className="text-sm font-semibold text-purple-300 mb-1">Elyra is sending your email...</h3>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-6">
            <h3 className="text-sm font-semibold text-purple-200 mb-1">Elyra is working...</h3>
          </div>
        )}

        {/* Steps Checklist */}
        <div className="w-full flex flex-col gap-3 text-left">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3 text-xs">
              {step.status === 'completed' ? (
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Check className="w-2.5 h-2.5" />
                </div>
              ) : step.status === 'in_progress' ? (
                <div className="w-4 h-4 rounded-full bg-purple-500/20 border border-purple-400/50 flex items-center justify-center flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_6px_#A855F7]" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                </div>
              )}

              <span
                className={
                  step.status === 'completed'
                    ? 'text-slate-300'
                    : step.status === 'in_progress'
                    ? 'text-purple-200 font-medium'
                    : 'text-slate-500'
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Info Card */}
      <div className="w-full rounded-xl bg-purple-950/20 border border-purple-500/15 p-3 text-[11px] text-slate-400 text-center">
        {status === 'waiting_approval'
          ? 'Explicit user authorization required before sending.'
          : status === 'sent'
          ? 'Logged in dispatch history.'
          : 'Headless SMTP background dispatch active.'}
      </div>
    </aside>
  );
};
