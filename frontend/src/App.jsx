import { AppProvider, useApp } from './context/AppContext';
import ConnectionForm from './components/ConnectionForm';
import Sidebar from './components/Sidebar';
import SearchPanel from './components/SearchPanel';
import SqlEditor from './components/SqlEditor';
import TableManager from './components/TableManager';

function MainLayout() {
  const { connection, selectedTable, activeTab, setActiveTab } = useApp();

  if (!connection.connected) {
    return <ConnectionForm />;
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <Sidebar />
      <div className="main-content">
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Search
          </button>
          <button
            className={`tab-btn ${activeTab === 'sql' ? 'active' : ''}`}
            onClick={() => setActiveTab('sql')}
          >
            SQL Editor
          </button>
        </div>

        {activeTab === 'search' && (
          selectedTable
            ? <SearchPanel />
            : <div className="welcome">
                <div className="icon">◈</div>
                <p>Select a table from the sidebar to search</p>
              </div>
        )}

        {activeTab === 'sql' && <SqlEditor />}
      </div>
    </div>
  );
}

function AppInner() {
  const { connection, disconnect, showTableManager, setShowTableManager } = useApp();

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Investigation <span>Tools</span></h1>
        <div className="header-spacer" />
        {connection.connected ? (
          <>
            <div className="status-badge">
              <span className="status-dot connected" />
              {connection.type} · {connection.label}
            </div>
            <button className="btn btn-sm btn-danger" onClick={disconnect}>Disconnect</button>
          </>
        ) : (
          <div className="status-badge">
            <span className="status-dot" />
            Not connected
          </div>
        )}
      </header>

      <div className="app-body">
        <MainLayout />
      </div>

      {showTableManager && (
        <TableManager onClose={() => setShowTableManager(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
