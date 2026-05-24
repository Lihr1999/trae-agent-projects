const API_BASE = '/api';

async function req(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const hasBody = options.body !== undefined;
  const headers = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  const init = {
    headers,
    ...options,
    body: hasBody ? JSON.stringify(options.body) : undefined
  };
  if (method !== 'GET' && !hasBody) {
    init.body = '{}';
    init.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(API_BASE + path, init);
  if (!res.ok) {
    const text = await res.text();
    let detail = '';
    try { detail = ' - ' + JSON.parse(text).message; } catch {}
    throw new Error(`HTTP ${res.status}: ${res.statusText}${detail}`);
  }
  return res.json();
}

export const api = {
  graph: () => req('/graph'),
  clear: () => req('/graph/clear', { method: 'POST' }),
  addNode: (body) => req('/graph/nodes', { method: 'POST', body }),
  delNode: (id) => req(`/graph/nodes/${id}`, { method: 'DELETE' }),
  addEdge: (body) => req('/graph/edges', { method: 'POST', body }),
  delEdge: (id) => req(`/graph/edges/${id}`, { method: 'DELETE' }),
  presets: () => req('/presets'),
  loadPreset: (key) => req(`/presets/${key}/load`, { method: 'POST' }),
  topoSort: () => req('/topo/sort', { method: 'POST' }),
  detectCycles: () => req('/topo/detect-cycles', { method: 'POST' }),
  derive: (body) => req('/dataflow/derive', { method: 'POST', body: body || {} }),
  infiniteLoop: () => req('/dataflow/infinite-loop', { method: 'POST' }),
  dirtyRead: () => req('/dataflow/dirty-read', { method: 'POST' }),
  ghost: (body) => req('/dataflow/ghost', { method: 'POST', body: body || {} }),
  versions: () => req('/versions'),
  saveVersion: (branch) => req('/version/save', { method: 'POST', body: { branch } }),
  health: () => req('/health')
};
