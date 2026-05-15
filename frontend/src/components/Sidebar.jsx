import { useApp } from '../context/AppContext';

const BUILT_IN_ICONS = {
  workflowdatastudio: '⚡',
  actionsstudio: '▶',
  formstudio: '📋',
  liststudio: '≡',
};

export default function Sidebar() {
  const { allTables, builtInTables, customTables, selectedTable, selectTable, setShowTableManager } = useApp();

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        {builtInTables.length > 0 && (
          <>
            <div className="sidebar-label">Tables</div>
            {builtInTables.map(t => (
              <div
                key={t.id}
                className={`sidebar-item ${selectedTable === t.id ? 'active' : ''}`}
                onClick={() => selectTable(t.id)}
              >
                <span className="sidebar-icon">{BUILT_IN_ICONS[t.id] || '▪'}</span>
                <span>{t.label}</span>
              </div>
            ))}
          </>
        )}

        {customTables.length > 0 && (
          <>
            <div className="sidebar-label" style={{ marginTop: 8 }}>Custom</div>
            {customTables.map(t => (
              <div
                key={t.id}
                className={`sidebar-item custom ${selectedTable === t.id ? 'active' : ''}`}
                onClick={() => selectTable(t.id)}
              >
                <span className="sidebar-icon">◆</span>
                <span>{t.label}</span>
                <span className="sidebar-custom-badge">custom</span>
              </div>
            ))}
          </>
        )}

        {allTables.length === 0 && (
          <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--text-3)' }}>
            No tables loaded
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button
          className="btn btn-sm"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => setShowTableManager(true)}
        >
          ⚙ Manage Tables
        </button>
      </div>
    </aside>
  );
}
