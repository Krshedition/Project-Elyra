import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Mail, KeyRound, LogOut, Loader2 } from 'lucide-react';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (email: string) => void;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [displayName, setDisplayName] = useState('Krish Bhutiya');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [connectedConfig, setConnectedConfig] = useState<{ connected: boolean; email?: string; displayName?: string } | null>(null);

  const fetchConfig = async () => {
    try {
      if ((window as any).ipcRenderer?.getEmailConfig) {
        const cfg = await (window as any).ipcRenderer.getEmailConfig();
        setConnectedConfig(cfg);
        if (cfg.connected && cfg.email) {
          setEmail(cfg.email);
          if (cfg.displayName) setDisplayName(cfg.displayName);
        }
      }
    } catch (e) {
      console.error('Failed to get email config:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenAppPasswordsGuide = () => {
    if ((window as any).ipcRenderer?.openGoogleAppPasswords) {
      (window as any).ipcRenderer.openGoogleAppPasswords();
    } else {
      window.open('https://myaccount.google.com/apppasswords', '_blank');
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if ((window as any).ipcRenderer?.connectGoogle) {
        const result = await (window as any).ipcRenderer.connectGoogle({
          email: email.trim(),
          appPassword: appPassword.trim(),
          displayName: displayName.trim() || 'Krish Bhutiya',
        });

        if (result.success) {
          setSuccessMsg(`Google account connected successfully for ${email}!`);
          setConnectedConfig({ connected: true, email: email.trim(), displayName: displayName.trim() });
          onConnected?.(email.trim());
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setError(result.message || 'Failed to authenticate Google account.');
        }
      } else {
        setError('Electron IPC is not available.');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      if ((window as any).ipcRenderer?.disconnectGoogle) {
        await (window as any).ipcRenderer.disconnectGoogle();
        setConnectedConfig({ connected: false });
        setEmail('');
        setAppPassword('');
        setSuccessMsg('Google account disconnected.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#0F1424] border border-purple-500/25 shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/10 bg-[#141B30]/50">
          <div className="flex items-center gap-3">
            {/* Google "G" Badge */}
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Google Account Authorization</h2>
              <p className="text-[11px] text-slate-400">Authorize Elyra to send emails directly from your Gmail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          {connectedConfig?.connected ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Google Account Connected</div>
                  <div className="text-[11px] text-emerald-300/80">{connectedConfig.email}</div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-purple-100">Secure Direct Access: </span>
                Google requires a 16-character <strong>App Password</strong> for desktop AI assistants like Elyra to send emails securely.
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span>Google / Gmail Address</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090C15] border border-purple-500/20 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  <span>Google App Password (16-characters)</span>
                </label>
                <button
                  type="button"
                  onClick={handleOpenAppPasswordsGuide}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 underline transition-colors"
                >
                  <span>Get App Password</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090C15] border border-purple-500/20 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-2.5 text-[11px] text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Display Sender Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Krish Bhutiya"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090C15] border border-purple-500/20 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 transition-all"
              />
            </div>

            {/* Quick 3-Step Guide */}
            <div className="p-3 rounded-xl bg-[#0A0D18] border border-purple-500/10 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">How to get a Google App Password:</div>
              <div>1. Go to <button type="button" onClick={handleOpenAppPasswordsGuide} className="text-purple-400 underline">Google Account Security</button> (ensure 2-Step Verification is ON).</div>
              <div>2. Search or click on <strong>App passwords</strong>.</div>
              <div>3. Type <strong>Elyra</strong> as the app name and copy the 16 letters here.</div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying with Google...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{connectedConfig?.connected ? 'Update Account' : 'Connect Google Account'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
