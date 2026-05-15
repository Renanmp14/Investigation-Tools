import { useRef } from 'react';
import { useApp } from '../context/AppContext';
import ResultsTable from './ResultsTable';

// ── SQL Tokenizer ──────────────────────────────────────────────────────────────

const SQL_KEYWORDS = new Set([
  'SELECT','FROM','WHERE','AND','OR','NOT','IN','EXISTS','BETWEEN','LIKE','ILIKE',
  'IS','NULL','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','JOIN','LEFT','RIGHT',
  'INNER','OUTER','FULL','CROSS','ON','AS','WITH','UNION','INTERSECT','EXCEPT',
  'ALL','DISTINCT','INTO','INSERT','UPDATE','DELETE','SET','VALUES','CREATE','DROP',
  'ALTER','TABLE','INDEX','VIEW','RETURNING','CASE','WHEN','THEN','ELSE','END',
  'ASC','DESC','NULLS','FIRST','LAST','BEGIN','COMMIT','ROLLBACK','TRANSACTION',
  'TRUNCATE','CASCADE','REFERENCES','FOREIGN','KEY','PRIMARY','UNIQUE','DEFAULT',
  'CONSTRAINT','CHECK','TRUE','FALSE','FETCH','NEXT','ROWS','ONLY','WINDOW','OVER',
  'PARTITION','LATERAL','USING','RECURSIVE','MATERIALIZED','IF','REPLACE','DO',
  'LANGUAGE','RETURNS','FUNCTION','PROCEDURE','TRIGGER','SCHEMA','DATABASE',
  'GRANT','REVOKE','TO','PUBLIC','COLUMN','TYPE','CAST','BETWEEN','SIMILAR',
]);

const SQL_FUNCTIONS = new Set([
  'COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','NOW','CURRENT_DATE',
  'CURRENT_TIMESTAMP','DATE','EXTRACT','CAST','CONVERT','LENGTH','CHAR_LENGTH',
  'SUBSTRING','SUBSTR','TRIM','LTRIM','RTRIM','UPPER','LOWER','REPLACE','CONCAT',
  'SPLIT_PART','POSITION','OVERLAY','ARRAY_AGG','STRING_AGG','ARRAY_LENGTH',
  'CARDINALITY','JSON_BUILD_OBJECT','JSONB_BUILD_OBJECT','JSON_AGG','JSONB_AGG',
  'TO_JSON','TO_JSONB','ROW_NUMBER','RANK','DENSE_RANK','NTILE','LEAD','LAG',
  'FIRST_VALUE','LAST_VALUE','NTH_VALUE','CUME_DIST','PERCENT_RANK',
  'GENERATE_SERIES','UNNEST','TO_CHAR','TO_DATE','TO_NUMBER','TO_TIMESTAMP',
  'ABS','CEIL','CEILING','FLOOR','ROUND','TRUNC','MOD','POWER','SQRT','RANDOM',
  'GREATEST','LEAST','ISNULL','IFNULL','NVL','DECODE','IIF','FORMAT',
  'ARRAY','ROW','NEXTVAL','CURRVAL','SETVAL','REGCLASS','PG_GET_EXPR',
  'JSON_EXTRACT_PATH','JSONB_EXTRACT_PATH','JSONB_ARRAY_ELEMENTS',
]);

function tokenizeSQL(code) {
  const tokens = [];
  let i = 0;
  const n = code.length;

  while (i < n) {
    // Line comment
    if (code[i] === '-' && i + 1 < n && code[i + 1] === '-') {
      let j = i + 2;
      while (j < n && code[j] !== '\n') j++;
      tokens.push({ type: 'cmt', text: code.slice(i, j) });
      i = j;
      continue;
    }
    // Block comment
    if (code[i] === '/' && i + 1 < n && code[i + 1] === '*') {
      let j = i + 2;
      while (j < n - 1 && !(code[j] === '*' && code[j + 1] === '/')) j++;
      j = Math.min(j + 2, n);
      tokens.push({ type: 'cmt', text: code.slice(i, j) });
      i = j;
      continue;
    }
    // Single-quoted string
    if (code[i] === "'") {
      let j = i + 1;
      while (j < n) {
        if (j + 1 < n && code[j] === "'" && code[j + 1] === "'") { j += 2; continue; }
        if (code[j] === "'") { j++; break; }
        j++;
      }
      tokens.push({ type: 'str', text: code.slice(i, j) });
      i = j;
      continue;
    }
    // Double-quoted identifier
    if (code[i] === '"') {
      let j = i + 1;
      while (j < n && code[j] !== '"') j++;
      tokens.push({ type: 'ident', text: code.slice(i, Math.min(j + 1, n)) });
      i = Math.min(j + 1, n);
      continue;
    }
    // Dollar-quoted string (PostgreSQL: $$...$$ or $tag$...$tag$)
    if (code[i] === '$') {
      const dollarEnd = code.indexOf('$', i + 1);
      if (dollarEnd !== -1) {
        const tag = code.slice(i, dollarEnd + 1);
        const closeTag = code.indexOf(tag, dollarEnd + 1);
        if (closeTag !== -1) {
          const j = closeTag + tag.length;
          tokens.push({ type: 'str', text: code.slice(i, j) });
          i = j;
          continue;
        }
      }
      tokens.push({ type: 'op', text: code[i] });
      i++;
      continue;
    }
    // Number
    if (/\d/.test(code[i]) || (code[i] === '.' && i + 1 < n && /\d/.test(code[i + 1]))) {
      let j = i;
      while (j < n && /[\d.eE]/.test(code[j])) j++;
      if (j < n && (code[j] === '+' || code[j] === '-') && j > i && /[eE]/.test(code[j - 1])) j++;
      while (j < n && /\d/.test(code[j])) j++;
      tokens.push({ type: 'num', text: code.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier / keyword / function
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);
      const upper = word.toUpperCase();
      const type = SQL_KEYWORDS.has(upper) ? 'kw' : SQL_FUNCTIONS.has(upper) ? 'fn' : 'word';
      tokens.push({ type, text: word });
      i = j;
      continue;
    }
    tokens.push({ type: 'op', text: code[i] });
    i++;
  }

  return tokens;
}

const TOK_CLASS = { kw: 'sql-kw', fn: 'sql-fn', str: 'sql-str', cmt: 'sql-cmt', num: 'sql-num', ident: 'sql-ident' };

function HighlightedSQL({ code }) {
  const tokens = tokenizeSQL(code);
  return (
    <>
      {tokens.map((tok, i) => {
        const cls = TOK_CLASS[tok.type];
        return cls ? <span key={i} className={cls}>{tok.text}</span> : tok.text;
      })}
      {code.endsWith('\n') ? ' ' : ''}
    </>
  );
}

// ── Example Queries ────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function SqlEditor() {
  const {
    sqlTabs, activeSqlTabId, setActiveSqlTabId,
    activeSqlTab, updateSqlTab, addSqlTab, closeSqlTab, executeSQL,
    selectedTable,
  } = useApp();

  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const fileInputRef = useRef(null);

  const tab = activeSqlTab;

  async function handleExecute() {
    if (!tab?.query.trim()) return;
    await executeSQL(tab.id, tab.query);
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newQuery = tab.query.slice(0, start) + '  ' + tab.query.slice(end);
      const newCursor = start + 2;
      updateSqlTab(tab.id, { query: newQuery });
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursor;
          textareaRef.current.selectionEnd = newCursor;
        }
      });
    }
  }

  function syncScroll() {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }

  function loadExample() {
    const q = (selectedTable && EXAMPLE_QUERIES[selectedTable])
      ? EXAMPLE_QUERIES[selectedTable]
      : Object.values(EXAMPLE_QUERIES)[0];
    updateSqlTab(tab.id, { query: q });
  }

  function exportQuery() {
    if (!tab.query.trim()) return;
    const blob = new Blob([tab.query], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab.name.replace(/\s+/g, '_')}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = String(evt.target.result);
      const name = file.name.replace(/\.sql$/i, '');
      addSqlTab(content, name);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (!tab) return null;

  const { results, loading, error, duration } = tab;

  return (
    <div className="sql-editor">
      {/* Tab bar */}
      <div className="sql-tabs">
        {sqlTabs.map(t => (
          <div
            key={t.id}
            className={`sql-tab ${t.id === activeSqlTabId ? 'active' : ''}`}
            onClick={() => setActiveSqlTabId(t.id)}
            title={t.name}
          >
            <span className="sql-tab-name">{t.name}</span>
            <button
              className="sql-tab-close"
              onClick={ev => { ev.stopPropagation(); closeSqlTab(t.id); }}
              title="Fechar aba"
            >×</button>
          </div>
        ))}
        <button className="sql-tab-add" onClick={() => addSqlTab()} title="Nova aba (Ctrl+T)">+</button>
      </div>

      <div className="sql-editor-inner">
        {/* Syntax-highlighted editor area */}
        <div className="sql-editor-area">
          <pre ref={preRef} className="sql-highlight-pre" aria-hidden="true">
            <HighlightedSQL code={tab.query} />
          </pre>
          <textarea
            ref={textareaRef}
            className="sql-textarea sql-textarea-overlay"
            value={tab.query}
            onChange={e => updateSqlTab(tab.id, { query: e.target.value })}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            placeholder="Write a SQL query… (Ctrl+Enter to execute)"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>

        {/* Toolbar */}
        <div className="sql-toolbar">
          <button
            className="btn btn-primary"
            onClick={handleExecute}
            disabled={loading || !tab.query.trim()}
          >
            {loading ? <><span className="spinner" /> Running…</> : '▶ Execute'}
          </button>
          <button className="btn btn-sm" onClick={loadExample}>Load Example</button>
          <button
            className="btn btn-sm"
            onClick={() => updateSqlTab(tab.id, { query: '', results: null, error: null, duration: null })}
          >
            Clear
          </button>
          <div className="sql-toolbar-sep" />
          <button
            className="btn btn-sm"
            onClick={exportQuery}
            disabled={!tab.query.trim()}
            title="Exportar query como .sql"
          >
            ↓ Export .sql
          </button>
          <button
            className="btn btn-sm"
            onClick={handleImportClick}
            title="Importar arquivo .sql"
          >
            ↑ Import .sql
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sql,.txt"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <span className="sql-hint">Ctrl+Enter to run · Tab = 2 spaces</span>
        </div>

        {/* Results */}
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
    </div>
  );
}
