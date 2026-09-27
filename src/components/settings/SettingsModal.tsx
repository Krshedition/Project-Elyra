import React, { useState, useEffect } from 'react';
import { X, Mail, Database, Info, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { MemoryManager } from '../MemoryManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'email' | 'memory' | 'about'>('email');
  const [verifyStatus, setVerifyStatus] = useState<{ configured: boolean; details: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'email') {
      checkEmailConfig();
    }
  }, [isOpen, activeTab]);

  const checkEmailConfig = async () => {
    setVerifying(true);
    try {
      if ((window as any).ipcRenderer?.verifyEmailConfig) {
        const res = await (window as any).ipcRenderer.verifyEmailConfig();
        setVerifyStatus(res);
      }
    } catch (e: any) {
      setVerifyStatus({ configured: false, details: e.message });
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 select-none">
      <div className="w-full max-w-2xl max-h-[85vh] bg-[#121626] border border-purple-500/25 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/15 bg-[#151A2C]">
          <h2 className="text-base font-bold text-white tracking-wide">Elyra Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center border-b border-purple-500/10 px-6 bg-[#0E121E]">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'email'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email (SMTP)</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'memory'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Core Memory</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'about'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0F1322]">
          {activeTab === 'email' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="rounded-xl bg-purple-950/20 border border-purple-500/20 p-4">
                <h4 className="font-semibold text-purple-200 mb-1 text-sm">SMTP Dispatch Configuration</h4>
                <p className="text-slate-400 leading-relaxed">
                  Elyra uses background SMTP to silently send emails. Configure your Gmail App Password or custom SMTP credentials in the <code className="text-purple-300">.env</code> file:
                </p>
                <div className="mt-3 bg-black/40 rounded-lg p-3 font-mono text-[11px] text-slate-300 border border-slate-800">
                  SMTP_HOST=smtp.gmail.com<br />
                  SMTP_PORT=465<br />
                  SMTP_USER=your_email@gmail.com<br />
                  SMTP_PASS=your_gmail_app_password
                </div>
              </div>

              {/* Status Verification Card */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-3">
                  {verifying ? (
                    <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                  ) : verifyStatus?.configured ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-200">
                      {verifying ? 'Verifying SMTP...' : verifyStatus?.configured ? 'SMTP Configured' : 'SMTP Not Configured'}
                    </span>
                    <p className="text-[11px] text-slate-400">
                      {verifyStatus?.details || 'Check your .env settings'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={checkEmailConfig}
                  disabled={verifying}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
                >
                  Verify Now
                </button>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="h-full">
              <MemoryManager onClose={onClose} />
            </div>
          )}

          {activeTab === 'about' && (
            <div className="flex flex-col gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20">
                <h3 className="font-bold text-base text-white mb-1">Project Elyra</h3>
                <p className="text-purple-300 font-medium mb-3">Version 1.0.0 • Milestone 3 Active</p>
                <p className="leading-relaxed text-slate-300">
                  Engineered for <strong>Krish Bhutiya</strong> (BTech AI & ML, MITS Bhopal).
                  Driven by Gemini Multimodal Live API (<code className="text-purple-300">gemini-3.1-flash-live-preview</code>),
                  Brave Browser Playwright orchestration, custom C++ native automation addon, and SQLite core memory.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Desktop Container</span>
                  <span className="font-medium text-slate-200">Electron 42.2.0 / React 19</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">Audio Engine</span>
                  <span className="font-medium text-slate-200">PCM16 (16kHz in / 24kHz out)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
