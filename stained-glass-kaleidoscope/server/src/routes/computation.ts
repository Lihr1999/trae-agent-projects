import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { delaunay } from '../algorithms/delaunay';
import { csgOperator } from '../algorithms/csg';
import { photonTracer } from '../algorithms/photonTracing';
import { spaceGroupGenerator } from '../algorithms/spaceGroup';
import { Point, GlassFragment, Material, LightSource, SpaceGroup } from '../types';

export default async function computationRoutes(fastify: FastifyInstance) {
  fastify.post('/api/compute/delaunay', async (request: FastifyRequest<{ Body: { points: Point[] } }>, reply: FastifyReply) => {
    try {
      const { points } = request.body;
      const result = delaunay.triangulate(points);
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/compute/csg', async (request: FastifyRequest<{ Body: { operation: string; polygonA: Point[]; polygonB: Point[] } }>, reply: FastifyReply) => {
    try {
      const { operation, polygonA, polygonB } = request.body;
      let result: Point[];

      switch (operation) {
        case 'union':
          result = csgOperator.union(polygonA, polygonB);
          break;
        case 'intersection':
          result = csgOperator.intersection(polygonA, polygonB);
          break;
        case 'difference':
          result = csgOperator.difference(polygonA, polygonB);
          break;
        default:
          return reply.status(400).send({ success: false, error: 'Invalid operation' });
      }

      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/compute/photons', async (request: FastifyRequest<{ Body: { lights: LightSource[]; fragments: GlassFragment[]; materials: Material[]; bounds: { width: number; height: number } } }>, reply: FastifyReply) => {
    try {
      const { lights, fragments, materials, bounds } = request.body;
      const photons = photonTracer.tracePhotons(lights, fragments, materials, bounds);
      const causticPattern = photonTracer.generateCausticPattern(photons);
      return { success: true, data: { photons, causticPattern } };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/compute/spacegroup', async (request: FastifyRequest<{ Body: { type: string; p: number; q: number } }>, reply: FastifyReply) => {
    try {
      const { type, p, q } = request.body;
      let spaceGroup: SpaceGroup;

      switch (type) {
        case '2d':
          spaceGroup = spaceGroupGenerator.generate2DGroup(p, q);
          break;
        case 'spherical':
          spaceGroup = spaceGroupGenerator.generateSphericalGroup(p, q);
          break;
        case 'hyperbolic':
          spaceGroup = spaceGroupGenerator.generateHyperbolicGroup(p, q);
          break;
        default:
          return reply.status(400).send({ success: false, error: 'Invalid space group type' });
      }

      return { success: true, data: spaceGroup };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/compute/tessellation', async (request: FastifyRequest<{ Body: { basePoints: Point[]; spaceGroup: SpaceGroup; iterations: number } }>, reply: FastifyReply) => {
    try {
      const { basePoints, spaceGroup, iterations } = request.body;
      const cells = spaceGroupGenerator.generateTessellation(basePoints, spaceGroup, iterations);
      return { success: true, data: cells };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/compute/slerp', async (request: FastifyRequest<{ Body: { matrix1: number[]; matrix2: number[]; t: number } }>, reply: FastifyReply) => {
    try {
      const { matrix1, matrix2, t } = request.body;
      const result = spaceGroupGenerator.slerp(matrix1, matrix2, t);
      return { success: true, data: result };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });
}
