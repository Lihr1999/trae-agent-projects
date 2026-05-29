import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbService } from '../db/database';
import { Material } from '../types';

export default async function materialsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/materials', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const materials = await dbService.getAllMaterials();
      return { success: true, data: materials };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/materials', async (request: FastifyRequest<{ Body: Material }>, reply: FastifyReply) => {
    try {
      const material = request.body;
      material.id = material.id || `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await dbService.saveMaterial(material);
      return { success: true, data: material };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });
}
