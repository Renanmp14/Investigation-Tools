import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function SavedSearches({ currentSearch, onLoad }) {
  const { savedSearches, addSavedSearch, removeSavedSearch, importSavedSearches } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const fileRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  function handleSave() {
    if (!saveName.trim() || !currentSearch?.table) return;
    addSavedSearch({ ...currentSearch, name: saveName.trim() });
    setSaveName('');
    setShowSaveForm(false);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(savedSearches, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'saved-searches.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) importSavedSearches(data);
      } catch (_) {}
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="saved-searches-wrap" ref={panelRef}>
      <button
        className={`btn btn-sm ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(v => !v)}
      >
        ★ Saved ({savedSearches.length})
      </button>

      {isOpen && (
        <div className="saved-searches-panel">
          <div className="ss-header">
            <span>Saved Searches</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn btn-sm"
                onClick={() => { setShowSaveForm(v => !v); setSaveName(''); }}
                title="Save current search"
              >
                + Save
              </button>
              <button className="btn btn-sm" onClick={handleExport} title="Export all as JSON">↓ Export</button>
              <button className="btn btn-sm" onClick={() => fileRef.current?.click()} title="Import from JSON">↑ Import</button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </div>
          </div>

          {showSaveForm && (
            <div className="ss-save-form">
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Search name…"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
              />
              <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={!saveName.trim()}>
                Save
              </button>
            </div>
          )}

          <div className="ss-list">
            {savedSearches.length === 0 && (
              <div className="ss-empty">No saved searches yet</div>
            )}
            {savedSearches.map(s => (
              <div key={s.id} className="ss-item">
                <div className="ss-item-info" onClick={() => { onLoad(s); setIsOpen(false); }}>
                  <div className="ss-item-name">{s.name}</div>
                  <div className="ss-item-meta">
                    {s.table} · {s.column} · {s.filterType}: "{s.value}"
                  </div>
                </div>
                <button className="ss-item-delete" onClick={() => removeSavedSearch(s.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
