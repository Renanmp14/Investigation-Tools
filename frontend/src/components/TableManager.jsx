import { useState } from 'react';
import { useApp } from '../context/AppContext';

function emptyForm() {
  return {
    tableName: '', label: '', schema: 'public',
    nameColumn: 'name', primaryKey: '', orderBy: 'name',
    searchColumns: [{ value: '', label: '' }],
    jsonColumns: '',
  };
}

export default function TableManager({ onClose }) {
  const { builtInTables, customTables, addCustomTable, updateCustomTable, removeCustomTable } = useApp();
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saved, setSaved] = useState(false);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setSaved(false); };

  function selectNew() {
    setSelectedId(null);
    setForm(emptyForm());
    setSaved(false);
  }

  function selectTable(t) {
    setSelectedId(t.id);
    setSaved(false);
    setForm({
      tableName: t.tableName,
      label: t.label,
      schema: t.schema || 'public',
      nameColumn: t.nameColumn || 'name',
      primaryKey: t.primaryKey || '',
      orderBy: t.orderBy || 'name',
      searchColumns: t.searchColumns?.length ? [...t.searchColumns] : [{ value: '', label: '' }],
      jsonColumns: (t.jsonColumns || []).join(', '),
    });
  }

  function handleSave() {
    if (!form.tableName.trim()) return;
    const table = {
      id: selectedId || Date.now(),
      tableName: form.tableName.trim(),
      label: form.label.trim() || form.tableName.trim(),
      schema: form.schema.trim() || 'public',
      nameColumn: form.nameColumn.trim() || 'name',
      primaryKey: form.primaryKey.trim(),
      orderBy: form.orderBy.trim() || 'name',
      searchColumns: form.searchColumns
        .filter(c => c.value.trim())
        .map(c => ({ value: c.value.trim(), label: c.label.trim() || c.value.trim() })),
      jsonColumns: form.jsonColumns.split(',').map(s => s.trim()).filter(Boolean),
      isCustom: true,
    };
    if (selectedId) {
      updateCustomTable(table);
    } else {
      addCustomTable(table);
      setSelectedId(table.id);
    }
    setSaved(true);
  }

  function handleDelete() {
    if (!selectedId) return;
    removeCustomTable(selectedId);
    setSelectedId(null);
    setForm(emptyForm());
    setSaved(false);
  }

  function addSearchCol() {
    setForm(f => ({ ...f, searchColumns: [...f.searchColumns, { value: '', label: '' }] }));
    setSaved(false);
  }

  function updateSearchCol(i, field, val) {
    setForm(f => {
      const cols = [...f.searchColumns];
      cols[i] = { ...cols[i], [field]: val };
      if (field === 'value' && !cols[i].label) cols[i].label = val;
      return { ...f, searchColumns: cols };
    });
    setSaved(false);
  }

  function removeSearchCol(i) {
    if (form.searchColumns.length <= 1) return;
    setForm(f => ({ ...f, searchColumns: f.searchColumns.filter((_, j) => j !== i) }));
    setSaved(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="table-manager">
        <div className="tm-header">
          <h2>Manage Tables</h2>
          <button className="btn btn-sm" onClick={onClose}>× Close</button>
        </div>
        <div className="tm-body">
          {/* Left: table list */}
          <div className="tm-list">
            <div className="sidebar-label">Built-in</div>
            {builtInTables.map(t => (
              <div key={t.id} className="tm-list-item disabled">
                <span>🔒</span>
                <span>{t.label}</span>
              </div>
            ))}

            <div className="sidebar-label" style={{ marginTop: 10 }}>Custom</div>
            {customTables.map(t => (
              <div
                key={t.id}
                className={`tm-list-item ${selectedId === t.id ? 'active' : ''}`}
                onClick={() => selectTable(t)}
              >
                <span style={{ color: '#a78bfa' }}>◆</span>
                <span>{t.label}</span>
              </div>
            ))}
            {customTables.length === 0 && (
              <div style={{ padding: '6px 14px', fontSize: 11, color: 'var(--text-3)' }}>None yet</div>
            )}

            <div style={{ padding: '10px 12px' }}>
              <button className="btn btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={selectNew}>
                + New Table
              </button>
            </div>
          </div>

          {/* Right: edit form */}
          <div className="tm-form">
            <h3>{selectedId ? 'Edit Table' : 'New Custom Table'}</h3>

            <div className="form-grid">
              <div className="form-row">
                <label>Table Name (SQL)</label>
                <input value={form.tableName} onChange={set('tableName')} placeholder="e.g., mytable" />
              </div>
              <div className="form-row">
                <label>Schema</label>
                <input value={form.schema} onChange={set('schema')} placeholder="public" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label>Display Label</label>
                <input value={form.label} onChange={set('label')} placeholder="My Table" />
              </div>
              <div className="form-row">
                <label>Order By</label>
                <input value={form.orderBy} onChange={set('orderBy')} placeholder="name" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label>Name Column (display)</label>
                <input value={form.nameColumn} onChange={set('nameColumn')} placeholder="name" />
              </div>
              <div className="form-row">
                <label>Primary Key</label>
                <input value={form.primaryKey} onChange={set('primaryKey')} placeholder="id" />
              </div>
            </div>

            <div className="form-row">
              <label>JSON Columns (comma-separated)</label>
              <input value={form.jsonColumns} onChange={set('jsonColumns')} placeholder="data, metadata, config" />
            </div>

            <div className="form-row">
              <label>Search Columns</label>
              {form.searchColumns.map((col, i) => (
                <div key={i} className="search-col-row">
                  <input
                    value={col.value}
                    onChange={e => updateSearchCol(i, 'value', e.target.value)}
                    placeholder="column name (SQL)"
                  />
                  <input
                    value={col.label}
                    onChange={e => updateSearchCol(i, 'label', e.target.value)}
                    placeholder="display label"
                  />
                  <button
                    className="btn btn-sm"
                    onClick={() => removeSearchCol(i)}
                    style={{ color: 'var(--error)', flexShrink: 0 }}
                  >×</button>
                </div>
              ))}
              <button className="btn btn-sm" onClick={addSearchCol} style={{ marginTop: 4 }}>+ Add Column</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={!form.tableName.trim()}>
                {selectedId ? 'Update' : 'Create'} Table
              </button>
              {selectedId && (
                <button className="btn" style={{ color: 'var(--error)', borderColor: 'var(--error)' }} onClick={handleDelete}>
                  Delete
                </button>
              )}
              {saved && <span style={{ fontSize: 11, color: 'var(--success)' }}>✓ Saved</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
