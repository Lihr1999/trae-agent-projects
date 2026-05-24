import { prepare } from '../db.js';
import { aggregateDrillDown } from '../utils/graphInfluence.js';

export async function drillRoutes(fastify) {
  fastify.get('/api/drill/:id', async (request, reply) => {
    const { id } = request.params;
    const db = fastify.db;
    try {
      const result = aggregateDrillDown(db, id);
      reply.send(result);
    } catch (err) {
      reply.status(500).send({ error: 'aggregate failed', detail: String(err.message || err) });
    }
  });

  fastify.get('/api/hierarchy/:id', async (request, reply) => {
    const { id } = request.params;
    const db = fastify.db;
    const path = [];
    let current = prepare(db, 'SELECT id, name, parent_id, level FROM regions WHERE id = ?').get(id);
    while (current) {
      path.unshift(current);
      if (!current.parent_id) break;
      current = prepare(db, 'SELECT id, name, parent_id, level FROM regions WHERE id = ?').get(current.parent_id);
    }
    reply.send({ path });
  });
}
