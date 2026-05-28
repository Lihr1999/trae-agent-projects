import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { computeVoronoi, handleDegenerateTriangles, Point } from '../algorithms/fortune.js';

interface VoronoiRequest {
  points: Point[];
  bounds: { width: number; height: number };
}

export async function geometryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/geometry/voronoi',
    async (
      request: FastifyRequest<{ Body: VoronoiRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const { points, bounds } = request.body;

        if (!points || points.length < 3) {
          return reply.status(400).send({
            error: '至少需要3个点来计算Voronoi图',
          });
        }

        let result = computeVoronoi(points, bounds);
        result.cells = handleDegenerateTriangles(result.cells);

        return reply.send({
          cells: result.cells,
          edges: result.edges,
        });
      } catch (error) {
        fastify.log.error(`Voronoi计算错误: ${error}`);
        return reply.status(500).send({
          error: 'Voronoi图计算失败',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
}
