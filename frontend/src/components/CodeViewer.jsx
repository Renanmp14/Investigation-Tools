import { useState, useMemo, useRef, useEffect } from 'react';

// ── JavaScript tokenizer ───────────────────────────────────────────────────────

const JS_KW = new Set([
  'var','let','const','function','return','if','else','for','while','do',
  'switch','case','default','break','continue','class','extends','new',
  'this','super','import','export','async','await','try','catch','finally',
  'throw','typeof','instanceof','void','delete','in','of','null','undefined',
  'true','false','NaN','Infinity','with','yield','static','get','set',
  'from','as','debugger',
]);
const JS_BI = new Set([
  'console','Math','JSON','Object','Array','String','Number','Boolean','Date',
  'RegExp','Error','Promise','Symbol','Map','Set','WeakMap','WeakSet','Proxy',
  'Reflect','parseInt','parseFloat','isNaN','isFinite','encodeURIComponent',
  'decodeURIComponent','encodeURI','decodeURI','setTimeout','setInterval',
  'clearTimeout','clearInterval','fetch','document','window','global','process',
  'require','module','exports','Buffer','__dirname','__filename','alert',
]);

function tokenizeJS(code) {
  const tokens = [];
  let i = 0;
  const n = code.length;
  while (i < n) {
    // // line comment
    if (code[i] === '/' && i+1 < n && code[i+1] === '/') {
      let j = i + 2;
      while (j < n && code[j] !== '\n') j++;
      tokens.push({ type: 'cmt', text: code.slice(i, j) }); i = j; continue;
    }
    // /* block comment */
    if (code[i] === '/' && i+1 < n && code[i+1] === '*') {
      let j = i + 2;
      while (j < n - 1 && !(code[j] === '*' && code[j+1] === '/')) j++;
      j = Math.min(j + 2, n);
      tokens.push({ type: 'cmt', text: code.slice(i, j) }); i = j; continue;
    }
    // template literal `...`
    if (code[i] === '`') {
      let j = i + 1;
      while (j < n && code[j] !== '`') { if (code[j] === '\\') j++; j++; }
      tokens.push({ type: 'str', text: code.slice(i, Math.min(j+1, n)) });
      i = Math.min(j+1, n); continue;
    }
    // single-quoted string
    if (code[i] === "'") {
      let j = i + 1;
      while (j < n && code[j] !== "'" && code[j] !== '\n') { if (code[j] === '\\') j++; j++; }
      tokens.push({ type: 'str', text: code.slice(i, Math.min(j+1, n)) });
      i = Math.min(j+1, n); continue;
    }
    // double-quoted string
    if (code[i] === '"') {
      let j = i + 1;
      while (j < n && code[j] !== '"' && code[j] !== '\n') { if (code[j] === '\\') j++; j++; }
      tokens.push({ type: 'str', text: code.slice(i, Math.min(j+1, n)) });
      i = Math.min(j+1, n); continue;
    }
    // number (incl. hex 0x)
    if (/\d/.test(code[i]) || (code[i] === '.' && i+1 < n && /\d/.test(code[i+1]))) {
      let j = i;
      if (code[j] === '0' && j+1 < n && /[xXbBoO]/.test(code[j+1])) {
        j += 2; while (j < n && /[0-9a-fA-F_]/.test(code[j])) j++;
      } else {
        while (j < n && /[\d._]/.test(code[j])) j++;
        if (j < n && /[eE]/.test(code[j])) { j++; if (j < n && /[+\-]/.test(code[j])) j++; while (j < n && /\d/.test(code[j])) j++; }
        if (j < n && /[nN]/.test(code[j])) j++; // BigInt
      }
      tokens.push({ type: 'num', text: code.slice(i, j) }); i = j; continue;
    }
    // identifier / keyword / builtin
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const w = code.slice(i, j);
      tokens.push({ type: JS_KW.has(w) ? 'kw' : JS_BI.has(w) ? 'bi' : 'word', text: w });
      i = j; continue;
    }
    tokens.push({ type: 'op', text: code[i] }); i++;
  }
  return tokens;
}

// ── Lua tokenizer ──────────────────────────────────────────────────────────────

const LUA_KW = new Set([
  'and','break','do','else','elseif','end','false','for','function','goto',
  'if','in','local','nil','not','or','repeat','return','then','true','until','while',
]);
const LUA_BI = new Set([
  'print','tostring','tonumber','type','pairs','ipairs','next','select','error',
  'assert','pcall','xpcall','rawget','rawset','rawequal','rawlen',
  'setmetatable','getmetatable','require','load','loadfile','dofile',
  'collectgarbage','unpack','table','string','math','io','os',
  'coroutine','debug','package','bit','bit32','utf8',
]);

function tokenizeLua(code) {
  const tokens = [];
  let i = 0;
  const n = code.length;
  while (i < n) {
    // -- comment (line or long block)
    if (code[i] === '-' && i+1 < n && code[i+1] === '-') {
      // --[[ block ]]
      if (i+3 < n && code[i+2] === '[' && code[i+3] === '[') {
        let j = i + 4;
        while (j < n - 1 && !(code[j] === ']' && code[j+1] === ']')) j++;
        j = Math.min(j + 2, n);
        tokens.push({ type: 'cmt', text: code.slice(i, j) }); i = j;
      } else {
        let j = i + 2;
        while (j < n && code[j] !== '\n') j++;
        tokens.push({ type: 'cmt', text: code.slice(i, j) }); i = j;
      }
      continue;
    }
    // [[...]] long string
    if (code[i] === '[' && i+1 < n && code[i+1] === '[') {
      let j = i + 2;
      while (j < n - 1 && !(code[j] === ']' && code[j+1] === ']')) j++;
      j = Math.min(j + 2, n);
      tokens.push({ type: 'str', text: code.slice(i, j) }); i = j; continue;
    }
    // single-quoted string
    if (code[i] === "'") {
      let j = i + 1;
      while (j < n && code[j] !== "'" && code[j] !== '\n') { if (code[j] === '\\') j++; j++; }
      tokens.push({ type: 'str', text: code.slice(i, Math.min(j+1, n)) });
      i = Math.min(j+1, n); continue;
    }
    // double-quoted string
    if (code[i] === '"') {
      let j = i + 1;
      while (j < n && code[j] !== '"' && code[j] !== '\n') { if (code[j] === '\\') j++; j++; }
      tokens.push({ type: 'str', text: code.slice(i, Math.min(j+1, n)) });
      i = Math.min(j+1, n); continue;
    }
    // number
    if (/\d/.test(code[i]) || (code[i] === '.' && i+1 < n && /\d/.test(code[i+1]))) {
      let j = i;
      if (code[j] === '0' && j+1 < n && /[xX]/.test(code[j+1])) {
        j += 2; while (j < n && /[0-9a-fA-F]/.test(code[j])) j++;
      } else {
        while (j < n && /[\d.]/.test(code[j])) j++;
        if (j < n && /[eE]/.test(code[j])) { j++; if (j < n && /[+\-]/.test(code[j])) j++; while (j < n && /\d/.test(code[j])) j++; }
      }
      tokens.push({ type: 'num', text: code.slice(i, j) }); i = j; continue;
    }
    // identifier / keyword / builtin
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const w = code.slice(i, j);
      tokens.push({ type: LUA_KW.has(w) ? 'kw' : LUA_BI.has(w) ? 'bi' : 'word', text: w });
      i = j; continue;
    }
    tokens.push({ type: 'op', text: code[i] }); i++;
  }
  return tokens;
}

// ── SQL tokenizer ──────────────────────────────────────────────────────────────

const SQL_KW = new Set([
  'SELECT','FROM','WHERE','AND','OR','NOT','IN','EXISTS','BETWEEN','LIKE','ILIKE',
  'IS','NULL','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','JOIN','LEFT','RIGHT',
  'INNER','OUTER','FULL','CROSS','ON','AS','WITH','UNION','INTERSECT','EXCEPT',
  'ALL','DISTINCT','INTO','INSERT','UPDATE','DELETE','SET','VALUES','CREATE','DROP',
  'ALTER','TABLE','INDEX','VIEW','RETURNING','CASE','WHEN','THEN','ELSE','END',
  'ASC','DESC','NULLS','FIRST','LAST','BEGIN','COMMIT','ROLLBACK','TRANSACTION',
  'TRUNCATE','CASCADE','REFERENCES','FOREIGN','KEY','PRIMARY','UNIQUE','DEFAULT',
  'CONSTRAINT','CHECK','TRUE','FALSE','FETCH','NEXT','ROWS','ONLY','WINDOW','OVER',
  'PARTITION','LATERAL','USING','RECURSIVE','MATERIALIZED','IF','DO',
]);
const SQL_FN = new Set([
  'COUNT','SUM','AVG','MIN','MAX','COALESCE','NULLIF','NOW','CURRENT_DATE',
  'CURRENT_TIMESTAMP','DATE','EXTRACT','CAST','CONVERT','LENGTH','CHAR_LENGTH',
  'SUBSTRING','SUBSTR','TRIM','LTRIM','RTRIM','UPPER','LOWER','REPLACE','CONCAT',
  'SPLIT_PART','ARRAY_AGG','STRING_AGG','JSON_BUILD_OBJECT','JSONB_BUILD_OBJECT',
  'JSON_AGG','JSONB_AGG','TO_JSON','TO_JSONB','ROW_NUMBER','RANK','DENSE_RANK',
  'LEAD','LAG','FIRST_VALUE','LAST_VALUE','GENERATE_SERIES','UNNEST',
  'TO_CHAR','TO_DATE','TO_NUMBER','TO_TIMESTAMP','ABS','CEIL','FLOOR',
  'ROUND','TRUNC','MOD','POWER','SQRT','RANDOM','GREATEST','LEAST',
]);

function tokenizeSQL(code) {
  const tokens = [];
  let i = 0;
  const n = code.length;
  while (i < n) {
    if (code[i] === '-' && i+1 < n && code[i+1] === '-') {
      let j = i + 2; while (j < n && code[j] !== '\n') j++;
      tokens.push({ type: 'cmt', text: code.slice(i, j) }); i = j; continue;
    }
    if (code[i] === '/' && i+1 < n && code[i+1] === '*') {
      let j = i + 2;
      while (j < n - 1 && !(code[j] === '*' && code[j+1] === '/')) j++;
      j = Math.min(j + 2, n);
      tokens.push({ type: 'cmt', text: code.slice(i, j) }); i = j; continue;
    }
    if (code[i] === "'") {
      let j = i + 1;
      while (j < n) {
        if (j+1 < n && code[j] === "'" && code[j+1] === "'") { j += 2; continue; }
        if (code[j] === "'") { j++; break; } j++;
      }
      tokens.push({ type: 'str', text: code.slice(i, j) }); i = j; continue;
    }
    if (code[i] === '"') {
      let j = i + 1; while (j < n && code[j] !== '"') j++;
      tokens.push({ type: 'key', text: code.slice(i, Math.min(j+1, n)) });
      i = Math.min(j+1, n); continue;
    }
    if (/\d/.test(code[i]) || (code[i] === '.' && i+1 < n && /\d/.test(code[i+1]))) {
      let j = i; while (j < n && /[\d.eE+\-]/.test(code[j])) j++;
      tokens.push({ type: 'num', text: code.slice(i, j) }); i = j; continue;
    }
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i; while (j < n && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const w = code.slice(i, j), u = w.toUpperCase();
      tokens.push({ type: SQL_KW.has(u) ? 'kw' : SQL_FN.has(u) ? 'bi' : 'word', text: w });
      i = j; continue;
    }
    tokens.push({ type: 'op', text: code[i] }); i++;
  }
  return tokens;
}

// ── JSON text tokenizer ────────────────────────────────────────────────────────

function tokenizeJSONText(code) {
  const tokens = [];
  let i = 0;
  const n = code.length;
  while (i < n) {
    if (/\s/.test(code[i])) {
      let j = i; while (j < n && /\s/.test(code[j])) j++;
      tokens.push({ type: 'op', text: code.slice(i, j) }); i = j; continue;
    }
    if (code[i] === '"') {
      let j = i + 1;
      while (j < n && code[j] !== '"') { if (code[j] === '\\') j++; j++; }
      const text = code.slice(i, Math.min(j+1, n));
      i = Math.min(j+1, n);
      // peek past whitespace for ':'
      let peek = i; while (peek < n && code[peek] === ' ') peek++;
      const isKey = peek < n && code[peek] === ':';
      tokens.push({ type: isKey ? 'key' : 'str', text }); continue;
    }
    if (/[-\d]/.test(code[i])) {
      let j = i; if (code[j] === '-') j++;
      while (j < n && /[\d.eE+\-]/.test(code[j])) j++;
      tokens.push({ type: 'num', text: code.slice(i, j) }); i = j; continue;
    }
    if (/[a-z]/.test(code[i])) {
      let j = i; while (j < n && /[a-z]/.test(code[j])) j++;
      const w = code.slice(i, j);
      tokens.push({ type: ['true','false','null'].includes(w) ? 'kw' : 'word', text: w });
      i = j; continue;
    }
    tokens.push({ type: 'op', text: code[i] }); i++;
  }
  return tokens;
}

// ── Render groups (syntax + search combined) ───────────────────────────────────

const TOK_CLASS = {
  kw: 'ck-kw', bi: 'ck-bi', str: 'ck-str',
  cmt: 'ck-cmt', num: 'ck-num', key: 'ck-key',
};

const LANG_LABEL = {
  js: 'JavaScript', lua: 'Lua', sql: 'SQL', json: 'JSON', text: 'Texto',
};

function buildGroups(code, language, searchTerm) {
  if (!code) return [];

  let tokens;
  if (language === 'lua') tokens = tokenizeLua(code);
  else if (language === 'sql') tokens = tokenizeSQL(code);
  else if (language === 'json') tokens = tokenizeJSONText(code);
  else if (language === 'text') tokens = [{ type: 'op', text: code }];
  else tokens = tokenizeJS(code);

  // char-level syntax class
  const cls = new Array(code.length).fill(null);
  let pos = 0;
  for (const tok of tokens) {
    const c = TOK_CLASS[tok.type] ?? null;
    if (c) for (let k = 0; k < tok.text.length; k++) cls[pos + k] = c;
    pos += tok.text.length;
  }

  // char-level search match flag
  const hi = new Array(code.length).fill(false);
  if (searchTerm?.trim()) {
    const lower = code.toLowerCase();
    const lt = searchTerm.toLowerCase();
    let idx = lower.indexOf(lt);
    while (idx !== -1) {
      for (let k = idx; k < idx + searchTerm.length; k++) hi[k] = true;
      idx = lower.indexOf(lt, idx + 1);
    }
  }

  // group consecutive chars with same (cls, hi)
  const groups = [];
  let i = 0;
  while (i < code.length) {
    const c = cls[i], h = hi[i];
    let j = i + 1;
    while (j < code.length && cls[j] === c && hi[j] === h) j++;
    groups.push({ text: code.slice(i, j), cls: c, hi: h });
    i = j;
  }

  // assign match indices (increments when hi transitions false→true)
  let mIdx = -1, prevHi = false;
  return groups.map(g => {
    if (g.hi && !prevHi) mIdx++;
    prevHi = g.hi;
    return { ...g, mIdx: g.hi ? mIdx : -1 };
  });
}

// ── Extract code string from raw value ────────────────────────────────────────

function extractCodeStr(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      if (typeof p === 'string') return p;
      return typeof p === 'object' ? JSON.stringify(p, null, 2) : String(p);
    } catch {
      return raw;
    }
  }
  if (typeof raw === 'object') return JSON.stringify(raw, null, 2);
  return String(raw);
}

// ── CodeViewer component ───────────────────────────────────────────────────────

export default function CodeViewer({ code, language = 'js', maxHeight = 340 }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const matchRefs = useRef({});

  const codeStr = useMemo(() => extractCodeStr(code), [code]);

  const groups = useMemo(
    () => buildGroups(codeStr, language, searchTerm),
    [codeStr, language, searchTerm]
  );

  const matchCount = useMemo(() => {
    let max = -1;
    for (const g of groups) if (g.mIdx > max) max = g.mIdx;
    return max + 1;
  }, [groups]);

  useEffect(() => { setCurrentMatch(0); }, [searchTerm]);

  useEffect(() => {
    const el = matchRefs.current[currentMatch];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentMatch, matchCount]);

  function handleKey(e) {
    if (e.key === 'Enter' && matchCount > 0) {
      e.preventDefault();
      setCurrentMatch(i => e.shiftKey ? (i - 1 + matchCount) % matchCount : (i + 1) % matchCount);
    }
  }

  // Render — track which mIdx have had their ref attached
  matchRefs.current = {};
  const seen = {};
  const langLabel = LANG_LABEL[language] ?? language;

  const content = groups.map((g, i) => {
    if (!g.hi) {
      return g.cls ? <span key={i} className={g.cls}>{g.text}</span> : g.text;
    }
    const firstOfMatch = !seen[g.mIdx];
    if (firstOfMatch) seen[g.mIdx] = true;
    const isCurrent = g.mIdx === currentMatch;
    const mark = (
      <mark
        key={i}
        ref={firstOfMatch ? el => { matchRefs.current[g.mIdx] = el; } : null}
        className={`code-hl${isCurrent ? ' active' : ''}`}
      >
        {g.text}
      </mark>
    );
    return g.cls ? <span key={`w${i}`} className={g.cls}>{mark}</span> : mark;
  });

  if (!codeStr) {
    return <div className="code-empty">Sem conteúdo</div>;
  }

  return (
    <div className="code-viewer">
      <div className="code-search-bar">
        <span className="code-lang-badge">{langLabel}</span>
        <input
          className="code-search-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Buscar no ${langLabel}… (Enter = próximo)`}
        />
        {searchTerm && (
          <span className="code-match-count">
            {matchCount === 0
              ? <span style={{ color: 'var(--error)' }}>sem resultados</span>
              : <span style={{ color: 'var(--success)' }}>{currentMatch + 1} / {matchCount}</span>
            }
          </span>
        )}
        {matchCount > 1 && (
          <>
            <button className="btn btn-sm" onClick={() => setCurrentMatch(i => (i - 1 + matchCount) % matchCount)} title="Anterior (Shift+Enter)">↑</button>
            <button className="btn btn-sm" onClick={() => setCurrentMatch(i => (i + 1) % matchCount)} title="Próximo (Enter)">↓</button>
          </>
        )}
        {searchTerm && (
          <button className="btn btn-sm" onClick={() => setSearchTerm('')}>×</button>
        )}
      </div>
      <div className="code-content" style={{ maxHeight }}>
        <pre className="code-pre">{content}</pre>
      </div>
    </div>
  );
}
