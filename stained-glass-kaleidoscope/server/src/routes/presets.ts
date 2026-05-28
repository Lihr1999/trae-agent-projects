import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPresets, getPreset } from '../db/database.js';

interface PresetParams {
  id: string;
}

export async function presetRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/presets', async (_request, reply) => {
    try {
      const presets = getPresets();
      return reply.send({ presets });
    } catch (error) {
      fastify.log.error(`获取预设列表错误: ${error}`);
      return reply.status(500).send({
        error: '获取预设列表失败',
      });
    }
  });

  fastify.get(
    '/api/presets/:id',
    async (
      request: FastifyRequest<{ Params: PresetParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const preset = getPreset(id);

        if (!preset) {
          return reply.status(404).send({ error: '预设不存在' });
        }

        return reply.send(preset);
      } catch (error) {
        fastify.log.error(`加载预设错误: ${error}`);
        return reply.status(500).send({
          error: '加载预设失败',
        });
      }
    }
  );
}
