import { useState, useMemo, useEffect } from 'react';
import CodeViewer from './CodeViewer';

// ── JSON helpers ───────────────────────────────────────────────────────────────

function safeJson(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

// ── Node normalization ─────────────────────────────────────────────────────────
// Handles various schemas (AntV X6, custom, etc.)

function getNodeX(n) { return n.x ?? n.position?.x ?? n.geometry?.x ?? 0; }
function getNodeY(n) { return n.y ?? n.position?.y ?? n.geometry?.y ?? 0; }
function getNodeW(n) { return n.width ?? n.size?.width ?? n.geometry?.width ?? 130; }
function getNodeH(n) { return n.height ?? n.size?.height ?? n.geometry?.height ?? 44; }
function getNodeLabel(n) {
  return n.label
    ?? n.attrs?.label?.text
    ?? n.attrs?.body?.label
    ?? n.data?.label
    ?? n.data?.code
    ?? n.name
    ?? String(n.id ?? '');
}
function getNodeType(n) {
  return n.data?.name ?? n.data?.type ?? n.shape ?? n.type ?? n.name ?? '';
}
function getNodePorts(n) {
  if (Array.isArray(n.ports)) return n.ports;
  if (Array.isArray(n.ports?.items)) return n.ports.items;
  return [];
}

function normalizeNodes(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  return arr
    .filter(n => n && (n.id != null))
    .map(n => ({
      id: String(n.id),
      label: getNodeLabel(n),
      type: getNodeType(n),
      x: getNodeX(n),
      y: getNodeY(n),
      w: getNodeW(n),
      h: getNodeH(n),
      ports: getNodePorts(n),
    }));
}

// ── Edge normalization ─────────────────────────────────────────────────────────

function normalizeEdges(raw) {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  return arr
    .filter(e => e)
    .map(e => ({
      id: String(e.id ?? Math.random()),
      sourceCell: String(e.source?.cell ?? e.source ?? e.sourceCell ?? ''),
      sourcePort: String(e.source?.port ?? e.sourcePort ?? ''),
      targetCell: String(e.target?.cell ?? e.target ?? e.targetCell ?? ''),
      targetPort: String(e.target?.port ?? e.targetPort ?? ''),
    }))
    .filter(e => e.sourceCell && e.targetCell && e.sourceCell !== e.targetCell);
}

// ── Workflow logic map ─────────────────────────────────────────────────────────
// Returns: { [nodeLabel]: { entryBindings, executable, code, ... } }

function buildWorkflowMap(rawWorkflow) {
  const wf = safeJson(rawWorkflow);
  if (!wf) return {};
  const nodes = wf.nodes ?? wf;
  if (Array.isArray(nodes)) {
    const map = {};
    nodes.forEach(n => {
      const key = n.code ?? n.label ?? n.name ?? n.id;
      if (key) map[String(key)] = n;
    });
    return map;
  }
  if (typeof nodes === 'object') return nodes;
  return {};
}

function getWorkflowEntry(workflowMap, nodeLabel, nodeType) {
  return workflowMap[nodeLabel] ?? workflowMap[nodeType] ?? null;
}

function getNodeExecutable(workflowMap, nodeLabel, nodeType) {
  const entry = getWorkflowEntry(workflowMap, nodeLabel, nodeType);
  return entry?.executable ?? null;
}

function isLuaNode(workflowMap, nodeLabel, nodeType) {
  const entry = getWorkflowEntry(workflowMap, nodeLabel, nodeType);
  const exec = entry?.executable ?? nodeType ?? '';
  return exec === 'LuaScript' || exec.toLowerCase() === 'lua';
}

function getNodeContent(workflowMap, nodeLabel, nodeType) {
  const entry = getWorkflowEntry(workflowMap, nodeLabel, nodeType);
  if (!entry) return null;
  const b = entry.entryBindings ?? entry.bindings ?? {};
  if (isLuaNode(workflowMap, nodeLabel, nodeType)) {
    return b.SCRIPT ?? b.script ?? entry.script ?? null;
  }
  const keys = Object.keys(b);
  if (keys.length === 0) return entry.script ?? null;
  if (keys.length === 1) return b[keys[0]];
  return b;
}

function hasNodeScript(workflowMap, nodeLabel, nodeType) {
  const entry = getWorkflowEntry(workflowMap, nodeLabel, nodeType);
  if (!entry) return false;
  const b = entry.entryBindings ?? entry.bindings ?? {};
  return Object.keys(b).length > 0 || !!entry.script;
}

// ── Bezier edge path ───────────────────────────────────────────────────────────

function edgePath(src, tgt) {
  const sdx = (tgt.x + tgt.w / 2) - (src.x + src.w / 2);
  const sdy = (tgt.y + tgt.h / 2) - (src.y + src.h / 2);

  let x1, y1, x2, y2, cp1x, cp1y, cp2x, cp2y;

  if (Math.abs(sdy) >= Math.abs(sdx)) {
    // Vertical flow
    if (sdy >= 0) {
      x1 = src.x + src.w / 2; y1 = src.y + src.h;
      x2 = tgt.x + tgt.w / 2; y2 = tgt.y;
    } else {
      x1 = src.x + src.w / 2; y1 = src.y;
      x2 = tgt.x + tgt.w / 2; y2 = tgt.y + tgt.h;
    }
    const curve = Math.max(35, Math.abs(y2 - y1) * 0.42);
    const sign = sdy >= 0 ? 1 : -1;
    cp1x = x1; cp1y = y1 + sign * curve;
    cp2x = x2; cp2y = y2 - sign * curve;
  } else {
    // Horizontal flow
    if (sdx >= 0) {
      x1 = src.x + src.w; y1 = src.y + src.h / 2;
      x2 = tgt.x;         y2 = tgt.y + tgt.h / 2;
    } else {
      x1 = src.x;          y1 = src.y + src.h / 2;
      x2 = tgt.x + tgt.w; y2 = tgt.y + tgt.h / 2;
    }
    const curve = Math.max(35, Math.abs(x2 - x1) * 0.42);
    const sign = sdx >= 0 ? 1 : -1;
    cp1x = x1 + sign * curve; cp1y = y1;
    cp2x = x2 - sign * curve; cp2y = y2;
  }

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

const CANVAS_PAD = 40;

const LANG_OPTIONS = [
  { value: 'lua',  label: 'Lua' },
  { value: 'json', label: 'JSON' },
  { value: 'js',   label: 'JavaScript' },
  { value: 'sql',  label: 'SQL' },
  { value: 'text', label: 'Texto' },
];

export default function WorkflowViewer({ nodesRaw, edgesRaw, workflowRaw, title }) {
  const [selectedId, setSelectedId] = useState(null);
  const [scriptLang, setScriptLang] = useState('json');

  const nodes = useMemo(() => normalizeNodes(safeJson(nodesRaw)), [nodesRaw]);
  const edges = useMemo(() => normalizeEdges(safeJson(edgesRaw)), [edgesRaw]);
  const workflowMap = useMemo(() => buildWorkflowMap(workflowRaw), [workflowRaw]);

  const nodeById = useMemo(() => {
    const m = {};
    nodes.forEach(n => { m[n.id] = n; });
    return m;
  }, [nodes]);

  // Canvas bounds for absolute positioning
  const { minX, minY, canvasW, canvasH } = useMemo(() => {
    if (!nodes.length) return { minX: 0, minY: 0, canvasW: 500, canvasH: 300 };
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const xe = nodes.map(n => n.x + n.w);
    const ye = nodes.map(n => n.y + n.h);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xe);
    const maxY = Math.max(...ye);
    return {
      minX,
      minY,
      canvasW: maxX - minX + CANVAS_PAD * 2,
      canvasH: maxY - minY + CANVAS_PAD * 2,
    };
  }, [nodes]);

  const ox = -minX + CANVAS_PAD;
  const oy = -minY + CANVAS_PAD;

  const selectedNode = selectedId ? nodeById[selectedId] : null;
  const nodeIsLua = selectedNode
    ? isLuaNode(workflowMap, selectedNode.label, selectedNode.type)
    : false;
  const script = selectedNode
    ? getNodeContent(workflowMap, selectedNode.label, selectedNode.type)
    : null;

  useEffect(() => {
    if (!selectedNode) return;
    setScriptLang(nodeIsLua ? 'lua' : 'json');
  }, [selectedId]);

  if (!nodes.length) {
    return (
      <div className="wf-empty">
        Nenhum dado de nós encontrado nas colunas <code>nodes</code> / <code>edges</code>
      </div>
    );
  }

  return (
    <div className="wf-viewer">
      {/* Header */}
      <div className="wf-header">
        <span className="wf-title">{title || 'Diagrama de Workflow'}</span>
        <span className="wf-meta">{nodes.length} nós · {edges.length} conexões</span>
        {selectedNode && (
          <span className="wf-meta" style={{ marginLeft: 'auto', color: 'var(--accent)' }}>
            Selecionado: {selectedNode.label}
          </span>
        )}
      </div>

      <div className="wf-body">
        {/* Scrollable canvas */}
        <div className="wf-canvas-wrap">
          <div className="wf-canvas" style={{ width: canvasW, height: canvasH }}>
            {/* SVG: edges */}
            <svg
              className="wf-svg"
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              width={canvasW}
              height={canvasH}
            >
              <defs>
                <marker id="wf-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="var(--border-light)" />
                </marker>
                <marker id="wf-arr-sel" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" />
                </marker>
              </defs>
              {edges.map(edge => {
                const src = nodeById[edge.sourceCell];
                const tgt = nodeById[edge.targetCell];
                if (!src || !tgt) return null;
                const s = { ...src, x: src.x + ox, y: src.y + oy };
                const t = { ...tgt, x: tgt.x + ox, y: tgt.y + oy };
                const active = selectedId &&
                  (edge.sourceCell === selectedId || edge.targetCell === selectedId);
                return (
                  <path
                    key={edge.id}
                    d={edgePath(s, t)}
                    fill="none"
                    stroke={active ? 'var(--accent)' : 'var(--border-light)'}
                    strokeWidth={active ? 2 : 1.5}
                    markerEnd={active ? 'url(#wf-arr-sel)' : 'url(#wf-arr)'}
                    opacity={selectedId && !active ? 0.35 : 1}
                  />
                );
              })}
            </svg>

            {/* HTML: node cards */}
            {nodes.map(node => {
              const hasScript = hasNodeScript(workflowMap, node.label, node.type);
              const isSelected = node.id === selectedId;
              const isRelated = selectedId && edges.some(
                e => (e.sourceCell === selectedId && e.targetCell === node.id)
                  || (e.targetCell === selectedId && e.sourceCell === node.id)
              );
              const execType = getNodeExecutable(workflowMap, node.label, node.type);
              const subtitle = execType ?? (node.type !== node.label ? node.type : null);
              return (
                <div
                  key={node.id}
                  className={`wf-node${isSelected ? ' selected' : ''}${isRelated ? ' related' : ''}${hasScript ? ' has-script' : ''}`}
                  style={{
                    left: node.x + ox,
                    top: node.y + oy,
                    width: node.w,
                    minHeight: node.h,
                  }}
                  onClick={() => {
                    setSelectedId(isSelected ? null : node.id);
                  }}
                  title={`${node.label}${subtitle ? ` · ${subtitle}` : ''}`}
                >
                  <div className="wf-node-label">{node.label}</div>
                  {subtitle && (
                    <div className="wf-node-type">{subtitle}</div>
                  )}
                  {hasScript && (
                    <div className="wf-node-badge">
                      {isLuaNode(workflowMap, node.label, node.type) ? 'Lua' : 'Script'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel: script viewer */}
        <div className={`wf-panel${selectedNode ? ' open' : ''}`}>
          {selectedNode ? (
            <>
              <div className="wf-panel-header">
                <div style={{ minWidth: 0 }}>
                  <div className="wf-panel-name" title={selectedNode.label}>{selectedNode.label}</div>
                  {selectedNode.type && selectedNode.type !== selectedNode.label && (
                    <div className="wf-panel-type">{selectedNode.type}</div>
                  )}
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => setSelectedId(null)}
                  style={{ flexShrink: 0 }}
                >×</button>
              </div>

              {!nodeIsLua && (
                <div className="wf-panel-lang">
                  <div className="lang-seg">
                    {LANG_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`lang-seg-btn${scriptLang === opt.value ? ' active' : ''}`}
                        onClick={() => setScriptLang(opt.value)}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="wf-panel-body">
                {script != null ? (
                  <CodeViewer code={script} language={scriptLang} maxHeight={260} />
                ) : (
                  <div className="wf-no-script">
                    Nenhum script associado a este nó
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="wf-panel-hint">
              ← Clique em um nó<br />para ver o script
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
