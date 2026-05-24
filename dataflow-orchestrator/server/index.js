const path = require('path');
const fs = require('fs');
const fastify = require('fastify')({ logger: true });
const { DatabaseSync } = require('node:sqlite');
const { nanoid } = require('nanoid');

const DB_PATH = path.join(__dirname, 'dataflow.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'transform',
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    inputs TEXT NOT NULL DEFAULT '[]',
    outputs TEXT NOT NULL DEFAULT '[]',
    op TEXT NOT NULL DEFAULT 'id',
    payload TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    source_port TEXT NOT NULL DEFAULT 'out',
    target_port TEXT NOT NULL DEFAULT 'in',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cache (
    node_id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    stale INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch TEXT NOT NULL DEFAULT 'main',
    snapshot TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(source);
  CREATE INDEX IF NOT EXISTS idx_edges_tgt ON edges(target);
`);

const PRESETS = {
  preset1: {
    name: '线性数据管道',
    nodes: [
      { id: 'p1_src', name: '数据源', kind: 'source', x: -220, y: 0, inputs: [], outputs: ['out'], op: 'emit', payload: { value: 42 } },
      { id: 'p1_a', name: '清洗', kind: 'transform', x: 0, y: 0, inputs: ['in'], outputs: ['out'], op: 'clean', payload: {} },
      { id: 'p1_b', name: '聚合', kind: 'transform', x: 220, y: 0, inputs: ['in'], outputs: ['out'], op: 'sum', payload: {} },
      { id: 'p1_sink', name: '输出', kind: 'sink', x: 440, y: 0, inputs: ['in'], outputs: [], op: 'log', payload: {} }
    ],
    edges: [
      { source: 'p1_src', target: 'p1_a' },
      { source: 'p1_a', target: 'p1_b' },
      { source: 'p1_b', target: 'p1_sink' }
    ]
  },
  preset2: {
    name: '环形依赖陷阱',
    nodes: [
      { id: 'p2_a', name: 'A', kind: 'transform', x: -220, y: -60, inputs: ['in'], outputs: ['out'], op: 'id', payload: {} },
      { id: 'p2_b', name: 'B', kind: 'transform', x: 0, y: 60, inputs: ['in'], outputs: ['out'], op: 'id', payload: {} },
      { id: 'p2_c', name: 'C', kind: 'transform', x: 220, y: -60, inputs: ['in'], outputs: ['out'], op: 'id', payload: {} }
    ],
    edges: [
      { source: 'p2_a', target: 'p2_b' },
      { source: 'p2_b', target: 'p2_c' },
      { source: 'p2_c', target: 'p2_a' }
    ]
  },
  preset3: {
    name: '深度嵌套栈溢出',
    nodes: Array.from({ length: 18 }).map((_, i) => ({
      id: `p3_n${i}`,
      name: `N${i}`,
      kind: 'transform',
      x: -700 + i * 80,
      y: 0,
      inputs: i === 0 ? [] : ['in'],
      outputs: i === 17 ? [] : ['out'],
      op: 'recursive',
      payload: { depth: i }
    })),
    edges: Array.from({ length: 17 }).map((_, i) => ({
      source: `p3_n${i}`,
      target: `p3_n${i + 1}`
    }))
  },
  preset4: {
    name: '并发更新脏读',
    nodes: [
      { id: 'p4_a', name: '生产者', kind: 'source', x: -240, y: -80, inputs: [], outputs: ['out'], op: 'emit', payload: { value: 1 } },
      { id: 'p4_b', name: '缓冲器', kind: 'transform', x: 0, y: 0, inputs: ['in'], outputs: ['out'], op: 'id', payload: {} },
      { id: 'p4_c', name: '消费者 1', kind: 'sink', x: 240, y: -80, inputs: ['in'], outputs: [], op: 'log', payload: {} },
      { id: 'p4_d', name: '消费者 2', kind: 'sink', x: 240, y: 80, inputs: ['in'], outputs: [], op: 'log', payload: {} }
    ],
    edges: [
      { source: 'p4_a', target: 'p4_b' },
      { source: 'p4_b', target: 'p4_c' },
      { source: 'p4_b', target: 'p4_d' }
    ]
  }
};

function serializeSnapshot() {
  const nodes = db.prepare('SELECT * FROM nodes').all();
  const edges = db.prepare('SELECT * FROM edges').all();
  return JSON.stringify({ nodes, edges });
}

function saveVersion(branch = 'main') {
  db.prepare('INSERT INTO versions (branch, snapshot, created_at) VALUES (?, ?, ?)')
    .run(branch, serializeSnapshot(), Date.now());
}

function clearGraph() {
  db.prepare('DELETE FROM edges').run();
  db.prepare('DELETE FROM nodes').run();
  db.prepare('DELETE FROM cache').run();
}

function loadPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return null;
  clearGraph();
  const insertNode = db.prepare(
    'INSERT INTO nodes (id, name, kind, x, y, inputs, outputs, op, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertEdge = db.prepare(
    'INSERT INTO edges (id, source, target, source_port, target_port, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const n of preset.nodes) {
    insertNode.run(
      n.id, n.name, n.kind, n.x, n.y,
      JSON.stringify(n.inputs), JSON.stringify(n.outputs),
      n.op, JSON.stringify(n.payload), Date.now()
    );
  }
  for (const e of preset.edges) {
    insertEdge.run(
      nanoid(10), e.source, e.target,
      e.source_port || 'out', e.target_port || 'in', Date.now()
    );
  }
  saveVersion('main');
  return preset;
}

function getGraph() {
  const nodes = db.prepare('SELECT * FROM nodes').all().map(n => ({
    ...n,
    inputs: JSON.parse(n.inputs),
    outputs: JSON.parse(n.outputs),
    payload: JSON.parse(n.payload)
  }));
  const edges = db.prepare('SELECT * FROM edges').all();
  return { nodes, edges };
}

function buildAdjacency(nodes, edges) {
  const adj = new Map();
  const indeg = new Map();
  for (const n of nodes) {
    adj.set(n.id, []);
    indeg.set(n.id, 0);
  }
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!indeg.has(e.target)) indeg.set(e.target, 0);
    adj.get(e.source).push({ id: e.id, target: e.target });
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
  }
  return { adj, indeg };
}

function detectCycles(nodes, edges) {
  const { adj } = buildAdjacency(nodes, edges);
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const n of nodes) color.set(n.id, WHITE);
  const cycles = [];
  function dfs(u, stack) {
    color.set(u, GRAY);
    stack.push(u);
    for (const { target } of (adj.get(u) || [])) {
      if (color.get(target) === GRAY) {
        const idx = stack.indexOf(target);
        cycles.push(stack.slice(idx).concat(target));
      } else if (color.get(target) === WHITE) {
        dfs(target, stack);
      }
    }
    stack.pop();
    color.set(u, BLACK);
  }
  for (const n of nodes) {
    if (color.get(n.id) === WHITE) dfs(n.id, []);
  }
  return cycles;
}

function topoSort(nodes, edges) {
  const { adj, indeg } = buildAdjacency(nodes, edges);
  const queue = [];
  for (const [id, deg] of indeg.entries()) if (deg === 0) queue.push(id);
  const order = [];
  while (queue.length) {
    const u = queue.shift();
    order.push(u);
    for (const { target } of adj.get(u) || []) {
      indeg.set(target, indeg.get(target) - 1);
      if (indeg.get(target) === 0) queue.push(target);
    }
  }
  if (order.length !== nodes.length) {
    const remaining = nodes.filter(n => !order.includes(n.id)).map(n => n.id);
    return { order, cyclic: true, remaining };
  }
  return { order, cyclic: false, remaining: [] };
}

function deriveDataflow(nodes, edges, opts = {}) {
  const { simulateOverflow = false, ghostEdge = null } = opts;
  const values = new Map();
  const getCache = db.prepare('SELECT value FROM cache WHERE node_id = ? AND stale = 0');
  const setCache = db.prepare('INSERT OR REPLACE INTO cache (node_id, value, updated_at, stale) VALUES (?, ?, ?, 0)');
  const markStale = db.prepare('UPDATE cache SET stale = 1 WHERE node_id = ?');

  function compute(node, stackDepth = 0) {
    if (simulateOverflow && node.op === 'recursive') {
      if (stackDepth > 12) {
        throw new Error(`STACK_OVERFLOW at ${node.name}: depth=${stackDepth}`);
      }
    }
    const cached = getCache.get(node.id);
    if (cached && !simulateOverflow) {
      try { return JSON.parse(cached.value); } catch { /* ignore */ }
    }
    const incoming = edges.filter(e => e.target === node.id && e.id !== ghostEdge);
    const deps = incoming.map(e => {
      const src = nodes.find(n => n.id === e.source);
      return src ? compute(src, stackDepth + 1) : undefined;
    });
    let result;
    switch (node.op) {
      case 'emit': result = node.payload.value ?? 0; break;
      case 'clean': result = (deps[0] ?? 0); break;
      case 'sum': result = deps.reduce((a, b) => (a ?? 0) + (b ?? 0), 0); break;
      case 'log': result = deps[0] ?? null; break;
      case 'id':
      case 'recursive':
      default: result = deps[0] ?? null;
    }
    if (!simulateOverflow) {
      try { setCache.run(node.id, JSON.stringify(result), Date.now()); } catch { /* ignore */ }
    }
    return result;
  }

  const results = {};
  for (const n of nodes) {
    try {
      results[n.id] = { ok: true, value: compute(n, 0) };
    } catch (err) {
      results[n.id] = { ok: false, error: err.message };
      try { markStale.run(n.id); } catch { /* ignore */ }
    }
  }

  if (ghostEdge) {
    const edge = edges.find(e => e.id === ghostEdge);
    if (edge) {
      results.__ghost = {
        type: 'GHOST_FLOW',
        source: edge.source,
        target: edge.target,
        note: '节点被断开后，旧缓存仍被下游消费'
      };
    }
  }
  return results;
}

fastify.register(require('@fastify/cors'), { origin: true });

fastify.get('/api/graph', async () => getGraph());

fastify.post('/api/graph/clear', async () => {
  clearGraph();
  return { ok: true };
});

fastify.post('/api/graph/nodes', async (req) => {
  const { name, kind, x, y, inputs, outputs, op, payload } = req.body || {};
  const id = nanoid(10);
  db.prepare(
    'INSERT INTO nodes (id, name, kind, x, y, inputs, outputs, op, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id, name || '节点', kind || 'transform', x || 0, y || 0,
    JSON.stringify(inputs || ['in']), JSON.stringify(outputs || ['out']),
    op || 'id', JSON.stringify(payload || {}), Date.now()
  );
  saveVersion();
  return db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);
});

fastify.delete('/api/graph/nodes/:id', async (req) => {
  db.prepare('DELETE FROM nodes WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM edges WHERE source = ? OR target = ?').run(req.params.id, req.params.id);
  saveVersion();
  return { ok: true };
});

fastify.post('/api/graph/edges', async (req) => {
  const { source, target, source_port, target_port } = req.body || {};
  const id = nanoid(10);
  db.prepare(
    'INSERT INTO edges (id, source, target, source_port, target_port, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, source, target, source_port || 'out', target_port || 'in', Date.now());
  saveVersion();
  return db.prepare('SELECT * FROM edges WHERE id = ?').get(id);
});

fastify.delete('/api/graph/edges/:id', async (req) => {
  db.prepare('DELETE FROM edges WHERE id = ?').run(req.params.id);
  saveVersion();
  return { ok: true };
});

fastify.get('/api/presets', async () =>
  Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, { name: v.name, nodeCount: v.nodes.length, edgeCount: v.edges.length }]))
);

fastify.post('/api/presets/:key/load', async (req) => {
  const preset = loadPreset(req.params.key);
  if (!preset) return { error: 'unknown preset' };
  return { ok: true, preset };
});

fastify.post('/api/topo/sort', async () => {
  const { nodes, edges } = getGraph();
  const cycles = detectCycles(nodes, edges);
  const sort = topoSort(nodes, edges);
  return { cycles, sort };
});

fastify.post('/api/topo/detect-cycles', async () => {
  const { nodes, edges } = getGraph();
  return { cycles: detectCycles(nodes, edges) };
});

fastify.post('/api/dataflow/derive', async (req) => {
  const { nodes, edges } = getGraph();
  const body = req.body || {};
  const results = deriveDataflow(nodes, edges, {
    simulateOverflow: !!body.simulateOverflow,
    ghostEdge: body.ghostEdge || null
  });
  return { results };
});

fastify.post('/api/dataflow/infinite-loop', async () => {
  const { nodes, edges } = getGraph();
  const cycles = detectCycles(nodes, edges);
  if (cycles.length === 0) {
    return { error: 'no cycles to trigger infinite loop' };
  }
  return {
    warning: 'DEADLOCK_IMMINENT',
    cycles,
    trace: cycles.map(c => c.join(' → '))
  };
});

fastify.post('/api/dataflow/dirty-read', async () => {
  const { nodes, edges } = getGraph();
  const results = {};
  for (let i = 0; i < 3; i++) {
    const key = `read_${i}_${Date.now()}`;
    results[key] = deriveDataflow(nodes, edges);
  }
  return { dirtyReadSimulation: results };
});

fastify.post('/api/dataflow/ghost', async (req) => {
  const { nodes, edges } = getGraph();
  const body = req.body || {};
  const ghostEdgeId = body.edgeId || (edges[0] && edges[0].id);
  if (!ghostEdgeId) return { error: 'no edges to disconnect' };
  const before = deriveDataflow(nodes, edges);
  const after = deriveDataflow(nodes, edges, { ghostEdge: ghostEdgeId });
  return { ghostEdgeId, before, after };
});

fastify.post('/api/version/save', async (req) => {
  saveVersion((req.body && req.body.branch) || 'main');
  return { ok: true };
});

fastify.get('/api/versions', async () =>
  db.prepare('SELECT id, branch, created_at FROM versions ORDER BY id DESC LIMIT 20').all()
);

fastify.get('/api/health', () => ({ ok: true, time: Date.now() }));

const start = async () => {
  try {
    await fastify.listen({ port: 4280, host: '0.0.0.0' });
    console.log('Dataflow orchestrator server listening on http://localhost:4280');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
