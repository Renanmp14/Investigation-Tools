import { useState } from 'react';

function testMatch(str, term, filterType) {
  const s = String(str).toLowerCase();
  const t = term.toLowerCase();
  switch (filterType) {
    case 'equals': return s === t;
    case 'startsWith': return s.startsWith(t);
    case 'endsWith': return s.endsWith(t);
    default: return s.includes(t);
  }
}

function HighlightMatch({ text, term, filterType }) {
  const str = String(text);
  if (!term || !testMatch(str, term, filterType)) return <>{str}</>;

  const lc = str.toLowerCase();
  const lt = term.toLowerCase();
  let start = -1;

  if (filterType === 'contains' || filterType === 'equals') start = lc.indexOf(lt);
  else if (filterType === 'startsWith') start = lc.startsWith(lt) ? 0 : -1;
  else if (filterType === 'endsWith') start = lc.endsWith(lt) ? str.length - lt.length : -1;

  if (start === -1) return <>{str}</>;

  return (
    <>
      {str.slice(0, start)}
      <mark className="json-highlight">{str.slice(start, start + term.length)}</mark>
      {str.slice(start + term.length)}
    </>
  );
}

function JsonNode({ value, depth = 0, searchTerm, filterType, searchMode }) {
  // When searching, start all nodes expanded so highlights are visible
  const [collapsed, setCollapsed] = useState(!searchMode && depth > 2);
  const indent = Array(depth).fill(null).map((_, i) => <span key={i} className="json-indent" />);

  if (value === null) return <span className="json-null">null</span>;
  if (typeof value === 'boolean') return <span className="json-boolean">{String(value)}</span>;
  if (typeof value === 'number') return <span className="json-number">{value}</span>;
  if (typeof value === 'string') {
    return (
      <span className="json-string">
        &quot;
        {searchTerm
          ? <HighlightMatch text={value} term={searchTerm} filterType={filterType} />
          : value}
        &quot;
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="json-bracket">[]</span>;
    if (collapsed) {
      return (
        <span>
          <span className="json-collapsed" onClick={() => setCollapsed(false)}>
            [{value.length} items]
          </span>
        </span>
      );
    }
    return (
      <span>
        <button className="json-toggle" onClick={() => setCollapsed(true)}>▼</button>
        <span className="json-bracket">[</span>
        {value.map((item, i) => (
          <div key={i} className="json-line">
            {...Array(depth + 1).fill(null).map((_, j) => <span key={j} className="json-indent" />)}
            <JsonNode value={item} depth={depth + 1} searchTerm={searchTerm} filterType={filterType} searchMode={searchMode} />
            {i < value.length - 1 && <span className="json-bracket">,</span>}
          </div>
        ))}
        <div className="json-line">
          {indent}
          <span className="json-bracket">]</span>
        </div>
      </span>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return <span className="json-bracket">{'{}'}</span>;
    if (collapsed) {
      return (
        <span>
          <span className="json-collapsed" onClick={() => setCollapsed(false)}>
            {'{'}…{keys.length} keys{'}'}
          </span>
        </span>
      );
    }
    return (
      <span>
        <button className="json-toggle" onClick={() => setCollapsed(true)}>▼</button>
        <span className="json-bracket">{'{'}</span>
        {keys.map((key, i) => (
          <div key={key} className="json-line">
            {...Array(depth + 1).fill(null).map((_, j) => <span key={j} className="json-indent" />)}
            <span className="json-key">
              &quot;
              {searchTerm
                ? <HighlightMatch text={key} term={searchTerm} filterType={filterType} />
                : key}
              &quot;
            </span>
            <span className="json-colon">:</span>
            <JsonNode value={value[key]} depth={depth + 1} searchTerm={searchTerm} filterType={filterType} searchMode={searchMode} />
            {i < keys.length - 1 && <span className="json-bracket">,</span>}
          </div>
        ))}
        <div className="json-line">
          {indent}
          <span className="json-bracket">{'}'}</span>
        </div>
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

export default function JsonViewer({ value, searchTerm = '', filterType = 'contains' }) {
  let parsed = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (_) {
      return (
        <span style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {value}
        </span>
      );
    }
  }

  const searchMode = Boolean(searchTerm);

  return (
    <div className="json-viewer">
      {/* key forces re-mount (and re-initialization of collapsed state) when switching modes */}
      <JsonNode
        key={searchMode ? 'search' : 'browse'}
        value={parsed}
        depth={0}
        searchTerm={searchTerm}
        filterType={filterType}
        searchMode={searchMode}
      />
    </div>
  );
}
