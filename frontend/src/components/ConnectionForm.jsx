import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { persistence } from '../utils/persistence';

export default function ConnectionForm() {
  const { connect } = useApp();
  const [form, setForm] = useState({
    id: null, name: '', type: 'postgres',
    host: '', port: '', user: '', password: '', database: '',
  });
  const [savedConns, setSavedConns] = useState(() => persistence.loadConnections());
  const [dbList, setDbList] = useState(null);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (k === 'host' || k === 'user' || k === 'password' || k === 'type') setDbList(null);
  };

  const defaultPort = form.type === 'postgres' ? '5432' : '1433';

  async function handleListDbs() {
    if (!form.host || !form.user) { setError('Enter host and user first'); return; }
    setLoadingDbs(true); setError(null); setDbList(null);
    try {
      const { databases } = await api.listDatabases({
        type: form.type, host: form.host,
        port: form.port || defaultPort,
        user: form.user, password: form.password,
      });
      setDbList(databases);
      if (databases.length > 0 && !form.database) {
        setForm(f => ({ ...f, database: databases[0] }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDbs(false);
    }
  }

  async function handleConnect(e) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await connect({ ...form, port: form.port || defaultPort });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    const id = form.id || Date.now();
    const name = form.name.trim() || `${form.host}/${form.database}`;
    const conn = { ...form, id, name };
    const idx = savedConns.findIndex(c => c.id === id);
    const updated = idx >= 0 ? savedConns.map(c => c.id === id ? conn : c) : [...savedConns, conn];
    persistence.saveConnections(updated);
    setSavedConns(updated);
    setForm(f => ({ ...f, id, name }));
  }

  function handleDelete(connId) {
    const updated = savedConns.filter(c => c.id !== connId);
    persistence.saveConnections(updated);
    setSavedConns(updated);
    if (form.id === connId) resetForm();
  }

  function handleSelectSaved(conn) {
    setForm({ ...conn });
    setDbList(null); setError(null);
  }

  function resetForm() {
    setForm({ id: null, name: '', type: 'postgres', host: '', port: '', user: '', password: '', database: '' });
    setDbList(null); setError(null);
  }

  return (
    <div className="connect-screen">
      <div className="connect-layout">
        {/* Saved connections */}
        <div className="saved-panel">
          <div className="saved-panel-header">
            <span>Saved</span>
            <button className="btn btn-sm" onClick={resetForm} title="New connection">+</button>
          </div>
          {savedConns.length === 0 && (
            <div className="saved-empty">No saved connections</div>
          )}
          {savedConns.map(conn => (
            <div
              key={conn.id}
              className={`saved-item ${form.id === conn.id ? 'active' : ''}`}
              onClick={() => handleSelectSaved(conn)}
            >
              <div className="saved-item-name">{conn.name}</div>
              <div className="saved-item-meta">{conn.type} · {conn.host}</div>
              <button
                className="saved-item-delete"
                onClick={e => { e.stopPropagation(); handleDelete(conn.id); }}
              >×</button>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="connect-card">
          <h2>Investigation Tools</h2>
          <p>Connect to a database to investigate code.</p>

          <form onSubmit={handleConnect}>
            <div className="form-grid">
              <div className="form-row">
                <label>Connection Name</label>
                <input value={form.name} onChange={set('name')} placeholder="Optional label" />
              </div>
              <div className="form-row">
                <label>Type</label>
                <select value={form.type} onChange={set('type')}>
                  <option value="postgres">PostgreSQL</option>
                  <option value="sqlserver">SQL Server</option>
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label>Host</label>
                <input value={form.host} onChange={set('host')} placeholder="localhost" required />
              </div>
              <div className="form-row">
                <label>Port</label>
                <input value={form.port} onChange={set('port')} placeholder={defaultPort} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label>User</label>
                <input value={form.user} onChange={set('user')} placeholder="username" required />
              </div>
              <div className="form-row">
                <label>Password</label>
                <input type="password" value={form.password} onChange={set('password')} placeholder="password" />
              </div>
            </div>

            <div className="form-row">
              <label>Database</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {dbList ? (
                  <select value={form.database} onChange={set('database')} style={{ flex: 1 }} required>
                    <option value="">Select database…</option>
                    {dbList.map(db => <option key={db} value={db}>{db}</option>)}
                  </select>
                ) : (
                  <input value={form.database} onChange={set('database')} placeholder="database name" style={{ flex: 1 }} required />
                )}
                <button type="button" className="btn btn-sm" onClick={handleListDbs} disabled={loadingDbs} title="List available databases">
                  {loadingDbs ? <span className="spinner" /> : '⟳ List'}
                </button>
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? <><span className="spinner" /> Connecting…</> : 'Connect'}
              </button>
              <button type="button" className="btn" onClick={handleSave} title="Save this connection config">
                💾 Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
