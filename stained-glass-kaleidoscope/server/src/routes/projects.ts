import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getProjects, getProject, saveProject, deleteProject } from '../db/database.js';
import crypto from 'crypto';

interface Vertex {
  id: string;
  x: number;
  y: number;
}

interface Fragment {
  id: string;
  vertices: string[];
  color: string;
  transparency: number;
  refractiveIndex: number;
}

interface Symmetry {
  type: string;
  order: number;
  mirrorAngle: number;
  schlafli?: string;
}

interface LightSource {
  angle: number;
  colorTemperature: number;
  intensity: number;
  position: { x: number; y: number; z: number };
}

interface SaveProjectRequest {
  id?: string;
  name: string;
  vertices: Vertex[];
  fragments: Fragment[];
  symmetry: Symmetry;
  lightSource: LightSource;
}

interface ProjectParams {
  id: string;
}

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/projects', async (_request, reply) => {
    try {
      const projects = getProjects();
      return reply.send({ projects });
    } catch (error) {
      fastify.log.error(`获取工程列表错误: ${error}`);
      return reply.status(500).send({
        error: '获取工程列表失败',
      });
    }
  });

  fastify.get(
    '/api/projects/:id',
    async (
      request: FastifyRequest<{ Params: ProjectParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const project = getProject(id);

        if (!project) {
          return reply.status(404).send({ error: '工程不存在' });
        }

        return reply.send({
          id: project.id,
          name: project.name,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          vertices: project.vertices,
          fragments: project.fragments,
          symmetry: project.symmetry,
          lightSource: project.lightSource,
        });
      } catch (error) {
        fastify.log.error(`加载工程错误: ${error}`);
        return reply.status(500).send({
          error: '加载工程失败',
        });
      }
    }
  );

  fastify.post(
    '/api/projects',
    async (
      request: FastifyRequest<{ Body: SaveProjectRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const projectId = request.body.id || crypto.randomUUID();

        saveProject({
          id: projectId,
          name: request.body.name,
          created_at: Date.now(),
          updated_at: Date.now(),
          vertices: request.body.vertices,
          fragments: request.body.fragments,
          symmetry: request.body.symmetry,
          lightSource: request.body.lightSource,
        });

        return reply.send({
          id: projectId,
          success: true,
        });
      } catch (error) {
        fastify.log.error(`保存工程错误: ${error}`);
        return reply.status(500).send({
          error: '保存工程失败',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  fastify.delete(
    '/api/projects/:id',
    async (
      request: FastifyRequest<{ Params: ProjectParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        deleteProject(id);
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(`删除工程错误: ${error}`);
        return reply.status(500).send({
          error: '删除工程失败',
        });
      }
    }
  );
}
