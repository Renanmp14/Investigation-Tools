import { useState } from 'react';
import JsonViewer from './JsonViewer';
import JsonSearch from './JsonSearch';
import WorkflowViewer from './WorkflowViewer';
import CodeViewer from './CodeViewer';

// Columns that default to JavaScript rendering instead of JSON tree
const JS_COLUMNS = {
  actionsstudio: new Set(['precommand', 'poscommand']),
  formstudio:    new Set(['precommand', 'poscommand']),
  liststudio:    new Set(['filter', 'posfilter']),
};

function defaultLang(tableId, col) {
  return JS_COLUMNS[tableId]?.has(col) ? 'js' : 'json';
}

const PREVIEW_COLS = {
  workflowdatastudio: ['wf_name', 'wf_caption', 'ownerrule'],
  actionsstudio: ['name', 'caption', 'type', 'ownerrule'],
  formstudio: ['name', 'caption', 'type', 'ownerrule'],
  liststudio: ['name', 'caption', 'ownerrule'],
};

function getJsonPreview(value) {
  try {
    const obj = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(obj)) return `[ ${obj.length} items ]`;
    if (obj && typeof obj === 'object') return `{ ${Object.keys(obj).length} keys }`;
    return String(value).slice(0, 80);
  } catch {
    return String(value).slice(0, 80);
  }
}

function copyToClipboard(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  navigator.clipboard.writeText(str).catch(() => {});
}

function downloadJson(col, value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${col}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CellValue({ value }) {
  if (value === null || value === undefined) return <span className="tag tag-null">null</span>;
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.length > 80) return <span title={str}>{str.slice(0, 80)}…</span>;
  return <span>{str}</span>;
}

function RowDetail({ row, jsonColumns, tableId }) {
  const [expandedJson, setExpandedJson] = useState(new Set());
  const [fieldLangs, setFieldLangs] = useState(() => {
    const langs = {};
    jsonColumns.forEach(col => { langs[col] = defaultLang(tableId, col); });
    return langs;
  });

  const nonJsonFields = Object.entries(row).filter(([k]) => !jsonColumns.includes(k));
  const jsonFields = Object.entries(row).filter(
    ([k, v]) => jsonColumns.includes(k) && v !== null && v !== undefined
  );

  function toggleJson(col) {
    setExpandedJson(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  }

  function setLang(col, lang) {
    setFieldLangs(prev => ({ ...prev, [col]: lang }));
  }

  const isWorkflow = tableId === 'workflowdatastudio';

  return (
    <tr>
      <td colSpan={100} style={{ padding: 0 }}>
        <div className="row-expander">
          {/* Workflow diagram — only for workflowdatastudio */}
          {isWorkflow && (
            <WorkflowViewer
              nodesRaw={row.nodes}
              edgesRaw={row.edges}
              workflowRaw={row.workflow}
              title={row.wf_name || row.name}
            />
          )}

          {/* Non-JSON fields */}
          <h4 style={{ marginTop: isWorkflow ? 16 : 0 }}>Fields</h4>
          <div className="expander-grid">
            {nonJsonFields.map(([key, value]) => (
              <div key={key} className="field-block">
                <div className="field-label">{key}</div>
                <div className="field-value">
                  {value === null || value === undefined
                    ? <span className="field-null">null</span>
                    : String(value)}
                </div>
              </div>
            ))}
          </div>

          {/* JSON fields - collapsed by default */}
          {jsonFields.length > 0 && (
            <>
              <h4 style={{ marginTop: 16 }}>JSON Fields</h4>
              {jsonFields.map(([col, value]) => {
                const isExpanded = expandedJson.has(col);
                const lang = fieldLangs[col] ?? 'json';
                const isCode = lang !== 'json';
                // Only show lang toggle for tables that have code fields
                const showLangToggle = JS_COLUMNS[tableId]?.has(col);
                return (
                  <div key={col} className="json-field-block">
                    <div className="json-field-header">
                      <span className="json-field-name">
                        {col}
                        <span className={`tag ${isCode ? 'tag-code' : 'tag-json'}`}>
                          {isCode ? lang.toUpperCase() : 'JSON'}
                        </span>
                      </span>
                      <div className="json-field-actions">
                        {showLangToggle && (
                          <div className="lang-seg">
                            <button
                              className={`lang-seg-btn${lang === 'json' ? ' active' : ''}`}
                              onClick={() => setLang(col, 'json')}
                            >JSON</button>
                            <button
                              className={`lang-seg-btn${lang === 'js' ? ' active' : ''}`}
                              onClick={() => setLang(col, 'js')}
                            >JS</button>
                          </div>
                        )}
                        <button className="btn btn-sm" onClick={() => copyToClipboard(value)} title="Copy to clipboard">
                          Copy
                        </button>
                        <button className="btn btn-sm" onClick={() => downloadJson(col, value)} title="Download .json">
                          Export
                        </button>
                        <button className="btn btn-sm" onClick={() => toggleJson(col)}>
                          {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                        </button>
                      </div>
                    </div>
                    {!isExpanded && (
                      <div className="json-preview" onClick={() => toggleJson(col)}>
                        {getJsonPreview(value)}
                      </div>
                    )}
                    {isExpanded && (
                      <div className="json-expanded">
                        {isCode
                          ? <CodeViewer code={value} language={lang} />
                          : <JsonSearch value={value} colName={col} />
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ResultsTable({ tableId, results, meta }) {
  const [expandedRows, setExpandedRows] = useState(new Set());

  if (!results || results.length === 0) {
    return (
      <div className="results-empty">
        <div className="icon">🔍</div>
        <p>No results found</p>
      </div>
    );
  }

  const previewCols = tableId && PREVIEW_COLS[tableId]
    ? PREVIEW_COLS[tableId]
    : Object.keys(results[0]).filter(k => !(meta?.jsonColumns || []).includes(k)).slice(0, 4);
  const jsonColumns = meta?.jsonColumns || [];

  function toggleRow(id) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="results-table-wrap">
      <table className="results-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}></th>
            {previewCols.map(col => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => {
            const pk = meta?.primaryKey;
            const rowId = pk ? row[pk] : i;
            const isExpanded = expandedRows.has(rowId);
            return [
              <tr key={`row-${rowId}`} className={isExpanded ? 'expanded' : ''}>
                <td>
                  <button className="expand-btn" onClick={() => toggleRow(rowId)}>
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </td>
                {previewCols.map(col => (
                  <td key={col}><CellValue value={row[col]} /></td>
                ))}
              </tr>,
              isExpanded && (
                <RowDetail key={`det-${rowId}`} row={row} jsonColumns={jsonColumns} tableId={tableId} />
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
