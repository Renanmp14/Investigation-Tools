import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ResultsTable from './ResultsTable';

const EXAMPLE_QUERIES = {
  workflowdatastudio: `SELECT wds.workflowdatastudioid, ws.name, wds.workflow
FROM public.workflowdatastudio wds
LEFT JOIN public.workflowstudio ws ON wds.workflowstudioid = ws.workflowstudioid
WHERE wds.workflow::text ILIKE '%search_term%'
LIMIT 50;`,
  actionsstudio: `SELECT name, caption, type, precommand, poscommand
FROM public.actionsstudio
WHERE precommand::text ILIKE '%search_term%'
LIMIT 50;`,
  formstudio: `SELECT name, caption, type, precommand, poscommand
FROM public.formstudio
WHERE precommand::text ILIKE '%search_term%'
LIMIT 50;`,
  liststudio: `SELECT name, caption, filter, posfilter
FROM public.liststudio
WHERE filter::text ILIKE '%search_term%'
LIMIT 50;`,
};

export default function SqlEditor() {
  const { sqlState, setSqlState, executeSQL, selectedTable } = useApp();
  const [showHelp, setShowHelp] = useState(false);

  async function handleExecute() {
    if (!sqlState.query.trim()) return;
    await executeSQL(sqlState.query);
  }

  function loadExample() {
    const q = selectedTable ? EXAMPLE_QUERIES[selectedTable] : Object.values(EXAMPLE_QUERIES)[0];
    setSqlState(s => ({ ...s, query: q }));
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  }

  const { results, loading, error, duration } = sqlState;

  return (
    <div className="sql-editor">
      <textarea
        className="sql-textarea"
        value={sqlState.query}
        onChange={e => setSqlState(s => ({ ...s, query: e.target.value }))}
        onKeyDown={handleKeyDown}
        placeholder="Enter SQL query… (Ctrl+Enter to execute)"
        spellCheck={false}
      />

      <div className="sql-toolbar">
        <button className="btn btn-primary" onClick={handleExecute} disabled={loading || !sqlState.query.trim()}>
          {loading ? <><span className="spinner" /> Running…</> : '▶ Execute'}
        </button>
        <button className="btn btn-sm" onClick={loadExample}>Load Example</button>
        <button className="btn btn-sm" onClick={() => setSqlState(s => ({ ...s, query: '', results: null, error: null }))}>
          Clear
        </button>
        <span style={{ color: 'var(--text-3)', fontSize: 11, marginLeft: 'auto' }}>Ctrl+Enter to run</span>
      </div>

      <div className="sql-results">
        {error && <div className="sql-error">{error}</div>}

        {results && !error && (
          <>
            <div className="sql-stats">
              <span>{results.length} rows</span> returned in {duration}ms
            </div>
            {results.length > 0 ? (
              <ResultsTable tableId={null} results={results} meta={null} />
            ) : (
              <div className="results-empty">
                <p>Query executed successfully — no rows returned</p>
              </div>
            )}
          </>
        )}

        {!results && !error && !loading && (
          <div className="results-empty">
            <div className="icon">⌨</div>
            <p>Write a query and press Execute or Ctrl+Enter</p>
          </div>
        )}
      </div>
    </div>
  );
}
