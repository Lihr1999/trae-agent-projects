import { prepare } from '../db.js';
import { computeInfluence } from '../utils/graphInfluence.js';

export async function influenceRoutes(fastify) {
  fastify.get('/api/influence/:id', async (request, reply) => {
    const { id } = request.params;
    const db = fastify.db;
    const flows = prepare(db, 'SELECT from_id as from, to_id as to, value FROM flows WHERE from_id = ?').all(id);
    const result = computeInfluence(flows, id);
    reply.send({ id, influences: result });
  });
}
