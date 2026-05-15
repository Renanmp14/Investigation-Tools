import { useState, useEffect } from 'react';
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
  const { selectedTable, tables, searchState, setSearchState, search } = useApp();
  const [page, setPage] = useState(1);

  const tableConfig = tables.find(t => t.id === selectedTable);

  useEffect(() => {
    if (tableConfig?.searchColumns?.length > 0) {
      setSearchState(s => ({ ...s, column: tableConfig.searchColumns[0].value }));
    }
    setPage(1);
  }, [selectedTable]);

  async function doSearch(overridePage) {
    const currentPage = overridePage ?? 1;
    setPage(currentPage);
    await search({
      table: selectedTable,
      column: searchState.column,
      filterType: searchState.filterType,
      value: searchState.value,
      page: currentPage,
      pageSize: 50,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await doSearch(1);
  }

  function loadSavedSearch(saved) {
    setSearchState(s => ({
      ...s,
      column: saved.column,
      filterType: saved.filterType,
      value: saved.value,
    }));
  }

  if (!tableConfig) return null;

  const { results, loading, error, pagination, meta } = searchState;

  const currentSearch = {
    table: selectedTable,
    column: searchState.column,
    filterType: searchState.filterType,
    value: searchState.value,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="search-panel">
        <form onSubmit={handleSubmit} className="search-controls">
          <div className="form-row">
            <label>Column</label>
            <select
              value={searchState.column}
              onChange={e => setSearchState(s => ({ ...s, column: e.target.value }))}
            >
              {tableConfig.searchColumns.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Filter</label>
            <select
              value={searchState.filterType}
              onChange={e => setSearchState(s => ({ ...s, filterType: e.target.value }))}
            >
              {FILTER_TYPES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="form-row grow">
            <label>Search</label>
            <input
              value={searchState.value}
              onChange={e => setSearchState(s => ({ ...s, value: e.target.value }))}
              placeholder={`Search in ${searchState.column || 'column'}…`}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginBottom: 1 }}>
            {loading ? <><span className="spinner" /> Searching…</> : 'Search'}
          </button>
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
          <ResultsTable tableId={selectedTable} results={results} meta={meta} />
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
          <button className="page-btn" onClick={() => doSearch(page - 1)} disabled={page <= 1}>← Prev</button>
          {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => doSearch(p)}>
                {p}
              </button>
            );
          })}
          {pagination.totalPages > 7 && <span style={{ color: 'var(--text-3)' }}>…</span>}
          <button className="page-btn" onClick={() => doSearch(page + 1)} disabled={page >= pagination.totalPages}>Next →</button>
        </div>
      )}
    </div>
  );
}
