import { Inbox, SendHorizonal, FileText, Trash2, Plus } from 'lucide-react';

interface EmailSidebarProps {
  currentFolder: 'inbox' | 'sent' | 'drafts' | 'trash';
  onSelectFolder: (folder: 'inbox' | 'sent' | 'drafts' | 'trash') => void;
  draftsCount?: number;
  onCompose?: () => void;
}

export const EmailSidebar: React.FC<EmailSidebarProps> = ({
  currentFolder,
  onSelectFolder,
  draftsCount = 1,
  onCompose,
}) => {
  const folders = [
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'sent', label: 'Sent', icon: SendHorizonal },
    { id: 'drafts', label: 'Drafts', icon: FileText, count: draftsCount },
    { id: 'trash', label: 'Trash', icon: Trash2 },
  ] as const;

  return (
    <div className="w-48 h-full bg-[#0E121E]/70 border-r border-purple-500/10 p-3 flex flex-col gap-1 select-none">
      {onCompose && (
        <button
          onClick={onCompose}
          className="mb-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Draft</span>
        </button>
      )}

      <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
        Mailbox
      </div>

      {folders.map((f) => {
        const Icon = f.icon;
        const isActive = currentFolder === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onSelectFolder(f.id)}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              isActive
                ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>{f.label}</span>
            </div>

            {'count' in f && f.count !== undefined && f.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/25 text-[10px] text-purple-300 font-semibold">
                {f.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
