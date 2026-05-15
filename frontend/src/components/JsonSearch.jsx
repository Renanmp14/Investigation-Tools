import { useState, useMemo, useRef, useEffect } from 'react';
import JsonViewer from './JsonViewer';

const FILTER_TYPES = [
  { value: 'contains', label: 'Contém' },
  { value: 'equals', label: 'Igual a' },
  { value: 'startsWith', label: 'Começa com' },
  { value: 'endsWith', label: 'Termina com' },
];

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

function searchJsonFlat(data, term, filterType) {
  if (!term?.trim()) return [];
  const results = [];

  function traverse(obj, path) {
    if (obj === null || obj === undefined) return;
    if (typeof obj !== 'object') {
      if (testMatch(String(obj), term, filterType)) {
        results.push({ path, value: obj, matchIn: 'value' });
      }
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => traverse(item, `${path}[${i}]`));
      return;
    }
    Object.entries(obj).forEach(([key, val]) => {
      const childPath = path ? `${path}.${key}` : key;
      if (testMatch(key, term, filterType)) {
        results.push({ path: childPath, value: val, matchIn: 'key' });
      }
      traverse(val, childPath);
    });
  }

  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    traverse(parsed, '');
  } catch (_) {}

  return results;
}

function displayValue(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'object') {
    return Array.isArray(val) ? `[ ${val.length} items ]` : `{ ${Object.keys(val).length} keys }`;
  }
  const s = String(val);
  return s.length > 160 ? s.slice(0, 160) + '…' : s;
}

function HighlightText({ text, term, filterType }) {
  const str = String(text);
  if (!term) return <>{str}</>;

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

export default function JsonSearch({ value }) {
  const [term, setTerm] = useState('');
  const [filterType, setFilterType] = useState('contains');
  const [currentIdx, setCurrentIdx] = useState(0);
  const matchRefs = useRef([]);

  const matches = useMemo(
    () => searchJsonFlat(value, term, filterType),
    [value, term, filterType]
  );

  useEffect(() => { setCurrentIdx(0); }, [matches.length]);

  useEffect(() => {
    if (matches.length > 0 && matchRefs.current[currentIdx]) {
      matchRefs.current[currentIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentIdx]);

  function prevMatch() { setCurrentIdx(i => (i - 1 + matches.length) % matches.length); }
  function nextMatch() { setCurrentIdx(i => (i + 1) % matches.length); }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && matches.length > 0) {
      e.preventDefault();
      e.shiftKey ? prevMatch() : nextMatch();
    }
  }

  const hasSearch = term.trim().length > 0;

  return (
    <div className="json-search-wrap">
      <div className="json-search-bar">
        <input
          className="json-search-input"
          value={term}
          onChange={e => setTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar no JSON… (Enter = próximo)"
        />
        <select
          className="json-search-type"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          {FILTER_TYPES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {hasSearch && (
          <span className="json-match-count">
            {matches.length === 0
              ? <span style={{ color: 'var(--error)' }}>sem resultados</span>
              : <span style={{ color: 'var(--success)' }}>{currentIdx + 1} / {matches.length}</span>
            }
          </span>
        )}

        {matches.length > 1 && (
          <>
            <button className="btn btn-sm" onClick={prevMatch} title="Anterior (Shift+Enter)">↑</button>
            <button className="btn btn-sm" onClick={nextMatch} title="Próximo (Enter)">↓</button>
          </>
        )}

        {hasSearch && matches.length > 0 && (
          <button className="btn btn-sm" onClick={() => setTerm('')} title="Limpar busca">×</button>
        )}
      </div>

      {hasSearch && matches.length > 0 ? (
        <div className="json-matches-list">
          {matches.map((m, i) => (
            <div
              key={i}
              ref={el => { matchRefs.current[i] = el; }}
              className={`json-match-item ${i === currentIdx ? 'current' : ''}`}
              onClick={() => setCurrentIdx(i)}
            >
              <span className="match-path" title={m.path}>{m.path}</span>
              <span className="match-eq"> = </span>
              <span className={`match-value ${m.matchIn === 'key' ? 'match-in-key' : ''}`}>
                <HighlightText
                  text={displayValue(m.value)}
                  term={m.matchIn === 'value' ? term : ''}
                  filterType={filterType}
                />
              </span>
              {m.matchIn === 'key' && (
                <span className="match-badge">key</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="json-expanded-inner">
          <JsonViewer value={value} />
        </div>
      )}
    </div>
  );
}
