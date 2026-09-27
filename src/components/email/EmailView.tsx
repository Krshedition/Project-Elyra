import React, { useState } from 'react';
import { EmailSidebar } from './EmailSidebar';
import { EmailComposer } from './EmailComposer';
import { EmailActivity } from './EmailActivity';
import type { EmailDraft } from '../../types/chat';

interface EmailViewProps {
  draft: EmailDraft | null;
  onUpdateDraft: (updated: Partial<EmailDraft>) => void;
  onSendEmail: () => void;
  onFinishDrafting: () => void;
  onCreateNewDraft: () => void;
  googleEmail?: string | null;
  onOpenGoogleAuth?: () => void;
}

export const EmailView: React.FC<EmailViewProps> = ({
  draft,
  onUpdateDraft,
  onSendEmail,
  onFinishDrafting,
  onCreateNewDraft,
  googleEmail,
  onOpenGoogleAuth,
}) => {
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'drafts' | 'trash'>('drafts');

  const defaultDraft: EmailDraft = {
    id: 'default_draft',
    to: 'rahul@mits.edu',
    recipientName: 'Rahul Sharma',
    subject: 'Project Presentation Update',
    body: "Hi Rahul,\n\nI'm excited to share that the project presentation is now ready. I've completed all the final changes and the presentation is ready for your review.\n\nPlease let me know if you have any feedback or if there's anything else you'd like me to add.\n\nBest regards,\nKrish",
    status: 'waiting_approval',
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const activeDraft = draft || defaultDraft;

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-[#0B0E17]">
      {/* 1. Left Folder Sidebar */}
      <EmailSidebar
        currentFolder={folder}
        onSelectFolder={setFolder}
        draftsCount={draft ? 1 : 0}
        onCompose={onCreateNewDraft}
      />

      {/* 2. Center Email Composer */}
      <EmailComposer
        draft={activeDraft}
        onUpdateDraft={onUpdateDraft}
        onSendEmail={onSendEmail}
        onFinishDrafting={onFinishDrafting}
        googleEmail={googleEmail}
        onOpenGoogleAuth={onOpenGoogleAuth}
      />

      {/* 3. Right Elyra Activity Panel */}
      <EmailActivity draft={activeDraft} />
    </div>
  );
};
