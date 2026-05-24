import { prepare } from '../db.js';

export function computeInfluence(flows, nodeId) {
  const graph = new Map();
  flows.forEach((f) => {
    if (!graph.has(f.from)) graph.set(f.from, []);
    if (!graph.has(f.to)) graph.set(f.to, []);
    graph.get(f.from).push({ to: f.to, weight: f.value });
  });

  const visited = new Map();
  const queue = [{ id: nodeId, depth: 0, acc: 1 }];

  while (queue.length) {
    const cur = queue.shift();
    if (cur.depth > 3) continue;
    visited.set(cur.id, (visited.get(cur.id) || 0) + cur.acc);
    const edges = graph.get(cur.id) || [];
    edges.forEach((e) => {
      queue.push({ id: e.to, depth: cur.depth + 1, acc: cur.acc * (e.weight || 1) * 0.5 });
    });
  }

  return Array.from(visited.entries()).map(([id, score]) => ({ id, score }));
}

export function aggregateDrillDown(db, parentId) {
  const children = prepare(db, 'SELECT id, name, parent_id, gdp, population FROM regions WHERE parent_id = ?').all(parentId);
  const totalGDP = children.reduce((s, c) => s + (Number(c.gdp) || 0), 0);
  const totalPop = children.reduce((s, c) => s + (Number(c.population) || 0), 0);
  return { parentId, children, aggregate: { gdp: totalGDP, population: totalPop } };
}
