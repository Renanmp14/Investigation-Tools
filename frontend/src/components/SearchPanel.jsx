import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import ResultsTable from './ResultsTable';
import SavedSearches from './SavedSearches';

const FILTER_TYPES = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
];

export default function SearchPanel() {
  const {
    tables,
    searchTabs, activeSearchTabId, setActiveSearchTabId, addSearchTab, closeSearchTab,
    activeSearchTab, updateSearchTab, search,
  } = useApp();

  const tab = activeSearchTab;
  const tableConfig = tables.find(t => t.id === tab.selectedTable);

  useEffect(() => {
    if (!tableConfig?.searchColumns?.length) return;
    const firstCol = tableConfig.searchColumns[0].value;
    if (tab.conditions.every(c => !c.column)) {
      updateSearchTab(tab.id, {
        conditions: [{ column: firstCol, filterType: 'contains', value: '' }],
      });
    }
  }, [tab.selectedTable, tab.id]);

  function setConditions(conditions) { updateSearchTab(tab.id, { conditions }); }
  function setLogic(logic) { updateSearchTab(tab.id, { logic }); }

  function updateCondition(idx, updates) {
    setConditions(tab.conditions.map((c, i) => i === idx ? { ...c, ...updates } : c));
  }

  function addCondition() {
    const col = tableConfig?.searchColumns?.[0]?.value ?? '';
    setConditions([...tab.conditions, { column: col, filterType: 'contains', value: '' }]);
  }

  function removeCondition(idx) {
    setConditions(tab.conditions.filter((_, i) => i !== idx));
  }

  async function doSearch(overridePage) {
    const currentPage = overridePage ?? 1;
    await search(tab.id, {
      table: tab.selectedTable,
      conditions: tab.conditions,
      logic: tab.logic,
      page: currentPage,
      pageSize: 50,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await doSearch(1);
  }

  function loadSavedSearch(saved) {
    if (saved.conditions) {
      updateSearchTab(tab.id, { conditions: saved.conditions, logic: saved.logic ?? 'AND' });
    } else {
      updateSearchTab(tab.id, {
        conditions: [{ column: saved.column, filterType: saved.filterType, value: saved.value }],
        logic: 'AND',
      });
    }
  }

  const currentSearch = {
    table: tab.selectedTable,
    conditions: tab.conditions,
    logic: tab.logic,
  };

  const { results, loading, error, pagination, meta, page } = tab;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Tab bar */}
      <div className="sql-tabs">
        {searchTabs.map(t => {
          const tLabel = t.selectedTable
            ? tables.find(x => x.id === t.selectedTable)?.label ?? t.name
            : t.name;
          return (
            <div
              key={t.id}
              className={`sql-tab ${t.id === activeSearchTabId ? 'active' : ''}`}
              onClick={() => setActiveSearchTabId(t.id)}
              title={tLabel}
            >
              <span className="sql-tab-name">{tLabel}</span>
              <button
                className="sql-tab-close"
                onClick={ev => { ev.stopPropagation(); closeSearchTab(t.id); }}
                title="Fechar aba"
              >×</button>
            </div>
          );
        })}
        <button className="sql-tab-add" onClick={addSearchTab} title="Nova aba de pesquisa">+</button>
      </div>

      {!tableConfig ? (
        <div className="welcome">
          <div className="icon">◈</div>
          <p>Select a table from the sidebar to search</p>
        </div>
      ) : (
        <>
          <div className="search-panel">
            <form onSubmit={handleSubmit}>
              {/* Condition rows */}
              {tab.conditions.map((cond, idx) => (
                <div key={idx}>
                  {idx > 0 && (
                    <div className="condition-logic-divider">
                      <div className="logic-toggle">
                        <button
                          type="button"
                          className={`logic-toggle-btn ${tab.logic === 'AND' ? 'active' : ''}`}
                          onClick={() => setLogic('AND')}
                        >AND</button>
                        <button
                          type="button"
                          className={`logic-toggle-btn ${tab.logic === 'OR' ? 'active' : ''}`}
                          onClick={() => setLogic('OR')}
                        >OR</button>
                      </div>
                    </div>
                  )}
                  <div className="condition-row">
                    <select
                      value={cond.column}
                      onChange={e => updateCondition(idx, { column: e.target.value })}
                    >
                      {tableConfig.searchColumns.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>

                    <select
                      value={cond.filterType}
                      onChange={e => updateCondition(idx, { filterType: e.target.value })}
                    >
                      {FILTER_TYPES.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>

                    <input
                      value={cond.value}
                      onChange={e => updateCondition(idx, { value: e.target.value })}
                      placeholder={`Search in ${cond.column || 'column'}…`}
                      required
                    />

                    {tab.conditions.length > 1 && (
                      <button
                        type="button"
                        className="condition-remove"
                        onClick={() => removeCondition(idx)}
                        title="Remover condição"
                      >×</button>
                    )}
                  </div>
                </div>
              ))}

              <div className="search-actions-row">
                <button
                  type="button"
                  className="add-condition-btn"
                  onClick={addCondition}
                >
                  + Add condition
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><span className="spinner" /> Searching…</> : 'Search'}
                </button>
              </div>
            </form>

            <div className="search-meta-row">
              <div className="search-info">
                {pagination
                  ? `${pagination.total} result${pagination.total !== 1 ? 's' : ''} · page ${pagination.page} of ${pagination.totalPages || 1}`
                  : ''}
              </div>
              <SavedSearches currentSearch={currentSearch} onLoad={loadSavedSearch} />
            </div>

            {error && <div className="form-error" style={{ marginTop: 8 }}>{error}</div>}
          </div>

          <div className="results-area">
            {loading && (
              <div className="loading"><span className="spinner" /> Searching…</div>
            )}
            {!loading && results && (
              <ResultsTable tableId={tab.selectedTable} results={results} meta={meta} />
            )}
            {!loading && !results && !error && (
              <div className="results-empty">
                <div className="icon">⌕</div>
                <p>Enter a search term to find records</p>
              </div>
            )}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {results?.length} of {pagination.total} results
              </div>
              <button className="page-btn" onClick={() => doSearch((page ?? 1) - 1)} disabled={(page ?? 1) <= 1}>← Prev</button>
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} className={`page-btn ${p === (page ?? 1) ? 'active' : ''}`} onClick={() => doSearch(p)}>
                    {p}
                  </button>
                );
              })}
              {pagination.totalPages > 7 && <span style={{ color: 'var(--text-3)' }}>…</span>}
              <button className="page-btn" onClick={() => doSearch((page ?? 1) + 1)} disabled={(page ?? 1) >= pagination.totalPages}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
