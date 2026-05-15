import { useState } from 'react';

function JsonNode({ value, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const indent = Array(depth).fill(null).map((_, i) => <span key={i} className="json-indent" />);

  if (value === null) return <span className="json-null">null</span>;
  if (typeof value === 'boolean') return <span className="json-boolean">{String(value)}</span>;
  if (typeof value === 'number') return <span className="json-number">{value}</span>;
  if (typeof value === 'string') return <span className="json-string">"{value}"</span>;

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
            <JsonNode value={item} depth={depth + 1} />
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
            <span className="json-key">"{key}"</span>
            <span className="json-colon">:</span>
            <JsonNode value={value[key]} depth={depth + 1} />
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

export default function JsonViewer({ value }) {
  let parsed = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (_) {
      return <span style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>;
    }
  }

  return (
    <div className="json-viewer">
      <JsonNode value={parsed} depth={0} />
    </div>
  );
}
