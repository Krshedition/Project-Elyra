import { useState, useEffect } from 'react';

type Fact = {
  id: number;
  category: string;
  key: string;
  value: string;
  confidence: number;
  updated_at: string;
};

export function MemoryManager({ onClose }: { onClose?: () => void }) {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ category: 'personal', key: '', value: '' });

  const fetchFacts = async () => {
    try {
      if ((window as any).ipcRenderer?.getAllFactsDetailed) {
        const data = await (window as any).ipcRenderer.getAllFactsDetailed();
        setFacts(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch facts', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacts();
  }, []);

  const handleDelete = async (key: string) => {
    try {
      if ((window as any).ipcRenderer?.deleteFact) {
        await (window as any).ipcRenderer.deleteFact(key);
        await fetchFacts();
      }
    } catch (e) {
      console.error('Failed to delete fact', e);
    }
  };

  const handleSaveEdit = async (oldKey: string) => {
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

  const handleSaveAdd = async () => {
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

  const startEdit = (fact: Fact) => {
    setEditingKey(fact.key);
    setIsAdding(false);
    setFormData({ category: fact.category || 'personal', key: fact.key, value: fact.value });
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingKey(null);
    setFormData({ category: 'personal', key: '', value: '' });
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingKey(null);
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

  const renderForm = (onSave: () => void, isEdit: boolean) => (
    <div className="flex flex-col gap-2 bg-white/10 p-3 rounded-lg border border-purple-500/30">
      <div className="flex gap-2">
        <select 
          value={formData.category} 
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          className="bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none focus:border-purple-400"
        >
          <option value="personal">personal</option>
          <option value="tech_stack">tech_stack</option>
          <option value="preferences">preferences</option>
          <option value="project_goals">project_goals</option>
        </select>
        <input 
          type="text" 
          placeholder="Fact Key (e.g. date_of_birth)" 
          value={formData.key}
          onChange={(e) => setFormData({...formData, key: e.target.value})}
          className="flex-1 bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none focus:border-purple-400"
        />
      </div>
      <textarea 
        placeholder="Fact Value..." 
        value={formData.value}
        onChange={(e) => setFormData({...formData, value: e.target.value})}
        className="w-full bg-black/50 text-white text-xs border border-white/20 rounded px-2 py-1 outline-none focus:border-purple-400 min-h-[60px]"
      />
      <div className="flex justify-end gap-2 mt-1">
        <button onClick={cancelForm} className="px-3 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors">Cancel</button>
        <button onClick={onSave} className="px-3 py-1 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/50 hover:bg-purple-500/40 rounded transition-colors">
          {isEdit ? 'Save Changes' : 'Add Memory'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-[440px] max-h-[400px] flex flex-col bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 shrink-0">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Elyra Core Memory
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={startAdd}
            className="text-xs bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
          >
            <span>+</span> Add Memory
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search memories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 pl-10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <svg className="w-4 h-4 absolute left-3 top-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Facts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {isAdding && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider pl-1 mb-2">New Memory</h3>
            {renderForm(handleSaveAdd, false)}
          </div>
        )}

        {loading ? (
          <div className="text-center text-white/50 py-8 text-sm animate-pulse">Loading memories...</div>
        ) : filteredFacts.length === 0 && !isAdding ? (
          <div className="text-center text-white/50 py-8 text-sm">No memories found.</div>
        ) : (
          Object.entries(categorizedFacts).map(([category, catFacts]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider pl-1 border-b border-purple-500/20 pb-1">
                {category.replace(/_/g, ' ')}
              </h3>
              <div className="grid gap-2">
                {catFacts.map((fact) => (
                  editingKey === fact.key ? (
                    <div key={fact.id}>{renderForm(() => handleSaveEdit(fact.key), true)}</div>
                  ) : (
                    <div key={fact.id} className="group flex items-start justify-between bg-white/5 border border-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white/90">{fact.key}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
                            lvl {fact.confidence}
                          </span>
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">{fact.value}</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                        <button 
                          onClick={() => startEdit(fact)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-md"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(fact.key)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md"
                          title="Forget"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
