import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { dbService } from '../db/database';
import { Project, OperationLog } from '../types';
import * as crypto from 'crypto';

export default async function projectsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const projects = await dbService.getAllProjects();
      return { success: true, data: projects };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.get('/api/projects/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const project = await dbService.getProject(id);
      if (!project) {
        return reply.status(404).send({ success: false, error: 'Project not found' });
      }
      return { success: true, data: project };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/projects', async (request: FastifyRequest<{ Body: Partial<Project> }>, reply: FastifyReply) => {
    try {
      const body = request.body;
      const id = body.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const project: Project = {
        id,
        name: body.name || 'Untitled Project',
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        config: body.config || {
          id: `cfg_${Date.now()}`,
          name: 'Default Config',
          spaceGroup: {
            type: '2d',
            schlafliSymbol: '{6,3}',
            p: 6,
            q: 3,
            generators: [],
            mirrorAngle: Math.PI / 6,
            mirrorCount: 6
          },
          fragments: [],
          materials: [],
          lights: [],
          animationSpeed: 1,
          causticIntensity: 1,
          interferenceStrength: 1
        },
        csgTree: body.csgTree || {
          id: `csg_${Date.now()}`,
          type: 'operation',
          operation: 'union',
          children: []
        }
      };

      await dbService.saveProject(project);
      return { success: true, data: project };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.put('/api/projects/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<Project> }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const existing = await dbService.getProject(id);
      
      if (!existing) {
        return reply.status(404).send({ success: false, error: 'Project not found' });
      }

      const updated: Project = {
        ...existing,
        ...request.body,
        id,
        updatedAt: new Date().toISOString()
      };

      await dbService.saveProject(updated);
      return { success: true, data: updated };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.delete('/api/projects/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      await dbService.deleteProject(id);
      return { success: true };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/projects/:id/undo', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const logs = await dbService.getOperationLogs(id);
      
      if (logs.length < 2) {
        return reply.status(400).send({ success: false, error: 'No operations to undo' });
      }

      const previousState = logs[1].payload;
      const project = await dbService.getProject(id);
      
      if (project) {
        await dbService.saveProject({ ...project, ...previousState, updatedAt: new Date().toISOString() });
      }

      return { success: true, data: previousState };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.post('/api/projects/:id/log', async (request: FastifyRequest<{ Params: { id: string }; Body: { type: string; payload: any } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { type, payload } = request.body;
      
      const logs = await dbService.getOperationLogs(id);
      const previousHash = logs.length > 0 ? logs[0].hash : '';
      
      const log: OperationLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type,
        payload,
        previousHash,
        hash: crypto.createHash('sha256').update(`${type}${JSON.stringify(payload)}${previousHash}`).digest('hex')
      };

      await dbService.addOperationLog(id, log);
      return { success: true, data: log };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });
}
