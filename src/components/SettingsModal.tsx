import { useState, useEffect } from 'react';
import { Key, User, Database, Check, Info, MapPin, Sparkles, X, Pencil } from 'lucide-react';

type Fact = {
  id: number;
  category: string;
  key: string;
  value: string;
  confidence: number;
  updated_at: string;
};

interface SettingsModalProps {
  onClose: () => void;
  onConfigSaved?: () => void;
}

export function SettingsModal({ onClose, onConfigSaved }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'memory'>('config');

  // Config Form State
  const [apiKey, setApiKey] = useState('');
  const [userName, setUserName] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [userBio, setUserBio] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Memory State
  const [facts, setFacts] = useState<Fact[]>([]);
  const [search, setSearch] = useState('');
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ category: 'personal', key: '', value: '' });

  // Load existing config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        if ((window as any).ipcRenderer?.getUserConfig) {
          const config = await (window as any).ipcRenderer.getUserConfig();
          if (config) {
            setApiKey(config.apiKey || '');
            setUserName(config.userName || '');
            setUserLocation(config.userLocation || '');
            setUserBio(config.userBio || '');
          }
        }
      } catch (err) {
        console.error('Failed to load user config:', err);
      }
    }
    loadConfig();
  }, []);

  const fetchFacts = async () => {
    try {
      if ((window as any).ipcRenderer?.getAllFactsDetailed) {
        const data = await (window as any).ipcRenderer.getAllFactsDetailed();
        setFacts(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch facts', e);
    } finally {
      setMemoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'memory') {
      fetchFacts();
    }
  }, [activeTab]);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      if ((window as any).ipcRenderer?.saveUserConfig) {
        await (window as any).ipcRenderer.saveUserConfig({
          apiKey: apiKey.trim(),
          userName: userName.trim(),
          userLocation: userLocation.trim(),
          userBio: userBio.trim()
        });
        setSaveStatus('Saved successfully!');
        setTimeout(() => setSaveStatus(null), 3000);
        if (onConfigSaved) onConfigSaved();
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      setSaveStatus('Failed to save config.');
    }
  };

  const handleDeleteFact = async (key: string) => {
    try {
      if ((window as any).ipcRenderer?.deleteFact) {
        await (window as any).ipcRenderer.deleteFact(key);
        await fetchFacts();
      }
    } catch (e) {
      console.error('Failed to delete fact', e);
    }
  };

  const startEditFact = (fact: Fact) => {
    setEditingKey(fact.key);
    setIsAdding(false);
    setFormData({ category: fact.category || 'personal', key: fact.key, value: fact.value });
  };

  const handleSaveEditFact = async (oldKey: string) => {
    try {
      if ((window as any).ipcRenderer?.updateFactManual) {
        await (window as any).ipcRenderer.updateFactManual({
          oldKey,
          category: formData.category,
          key: formData.key,
          value: formData.value
        });
        setEditingKey(null);
        await fetchFacts();
      }
    } catch (e) {
      console.error('Failed to update fact', e);
    }
  };

  const handleSaveAddFact = async () => {
    try {
      if ((window as any).ipcRenderer?.addFactManual) {
        await (window as any).ipcRenderer.addFactManual({
          category: formData.category,
          key: formData.key,
          value: formData.value
        });
        setIsAdding(false);
        await fetchFacts();
      }
    } catch (e) {
      console.error('Failed to add fact', e);
    }
  };

  const filteredFacts = facts.filter(f => 
    f.key.toLowerCase().includes(search.toLowerCase()) || 
    f.value.toLowerCase().includes(search.toLowerCase()) ||
    f.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categorizedFacts = filteredFacts.reduce((acc, fact) => {
    const cat = fact.category || 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(fact);
    return acc;
  }, {} as Record<string, Fact[]>);

  return (
    <div className="w-[460px] max-h-[550px] flex flex-col bg-black/75 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] overflow-hidden font-sans text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
          <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300">
            ELYRA Settings & Preferences
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-black/40 shrink-0">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'config'
              ? 'border-purple-500 text-purple-300 bg-white/5'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Profile & API Key
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex-1 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === 'memory'
              ? 'border-purple-500 text-purple-300 bg-white/5'
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Core Memory Facts ({facts.length})
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
        {activeTab === 'config' && (
          <form onSubmit={handleSaveConfig} className="space-y-4">
            {/* API Key Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Google Gemini API Key
              </label>
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Gemini API Key..."
                  className="w-full bg-white/5 border border-white/15 rounded-lg py-2 px-3 pr-20 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 px-2 py-1 text-[10px] text-white/50 hover:text-white bg-white/10 rounded"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[11px] text-white/40 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                Free API keys available at{' '}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            <div className="border-t border-white/10 my-3" />

            {/* Profile Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Current User Context
              </h3>

              <div className="space-y-1">
                <label className="text-xs text-white/80 font-medium">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. John Doe / Alex"
                  className="w-full bg-white/5 border border-white/15 rounded-lg py-2 px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/80 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-purple-400" />
                  Your Location (City, Country)
                </label>
                <input
                  type="text"
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  placeholder="e.g. New York, USA / Mumbai, India"
                  className="w-full bg-white/5 border border-white/15 rounded-lg py-2 px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/80 font-medium">Bio & Interests</label>
                <textarea
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  placeholder="e.g. Software developer, loves gaming and cybersecurity..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/15 rounded-lg py-2 px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2 flex items-center justify-between">
              {saveStatus && (
                <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {saveStatus}
                </span>
              )}
              {!saveStatus && <span />}
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Save Settings
              </button>
            </div>
          </form>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-4">
            {/* Search and Add */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search facts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-white/5 border border-white/15 rounded-lg py-1.5 px-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={() => {
                  setIsAdding(true);
                  setEditingKey(null);
                  setFormData({ category: 'personal', key: '', value: '' });
                }}
                className="text-xs bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-purple-200"
              >
                + Add Fact
              </button>
            </div>

            {isAdding && (
              <div className="bg-white/10 p-3 rounded-lg border border-purple-500/30 space-y-2">
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none"
                  >
                    <option value="personal">personal</option>
                    <option value="tech_stack">tech_stack</option>
                    <option value="preferences">preferences</option>
                    <option value="project_goals">project_goals</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Fact Key (e.g. favorite_ide)"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    className="flex-1 bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none"
                  />
                </div>
                <textarea
                  placeholder="Fact Value..."
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  rows={2}
                  className="w-full bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAdding(false)}
                    className="px-2.5 py-1 text-xs text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAddFact}
                    className="px-3 py-1 text-xs bg-purple-500/30 border border-purple-500/50 rounded text-purple-200 hover:bg-purple-500/50"
                  >
                    Save Memory
                  </button>
                </div>
              </div>
            )}

            {editingKey && (
              <div className="bg-white/10 p-3 rounded-lg border border-purple-500/30 space-y-2">
                <div className="text-xs text-purple-300 font-semibold">Editing: {editingKey}</div>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none"
                  >
                    <option value="personal">personal</option>
                    <option value="tech_stack">tech_stack</option>
                    <option value="preferences">preferences</option>
                    <option value="project_goals">project_goals</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Fact Key"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    className="flex-1 bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none"
                  />
                </div>
                <textarea
                  placeholder="Fact Value..."
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  rows={2}
                  className="w-full bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingKey(null)}
                    className="px-2.5 py-1 text-xs text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveEditFact(editingKey)}
                    className="px-3 py-1 text-xs bg-purple-500/30 border border-purple-500/50 rounded text-purple-200 hover:bg-purple-500/50"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {memoryLoading ? (
              <div className="text-center text-white/40 py-6 text-xs animate-pulse">
                Loading memories...
              </div>
            ) : Object.keys(categorizedFacts).length === 0 ? (
              <div className="text-center text-white/40 py-6 text-xs">
                No memories found. Elyra automatically learns facts as you speak!
              </div>
            ) : (
              Object.entries(categorizedFacts).map(([cat, catFacts]) => (
                <div key={cat} className="space-y-2">
                  <h4 className="text-[11px] font-bold text-purple-400/80 uppercase tracking-wider">
                    {cat}
                  </h4>
                  <div className="space-y-1.5">
                    {catFacts.map((fact) => (
                      <div
                        key={fact.key}
                        className="flex items-start justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="font-semibold text-purple-200">{fact.key}: </span>
                          <span className="text-white/80 break-words">{fact.value}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => startEditFact(fact)}
                            className="text-white/40 hover:text-purple-300 p-1"
                            title="Edit Fact"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteFact(fact.key)}
                            className="text-white/40 hover:text-red-400 p-1"
                            title="Delete Fact"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Permanent Author Identity Badge */}
      <div className="px-5 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[11px] text-white/50 shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>ELYRA Virtual Friend & Automation Agent</span>
        </div>
        <div className="text-[10px] text-purple-300/80 font-medium">
          Created & Authored by <strong className="text-purple-200">Krish Bhutiya</strong>
        </div>
      </div>
    </div>
  );
}
