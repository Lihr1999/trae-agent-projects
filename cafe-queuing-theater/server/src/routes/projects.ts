import Router, { RouterContext } from '@koa/router';
import { z } from 'zod';
import { Database } from '../db';
import { DEFAULT_CONFIG, MapElement, Seat, SimulationConfig, Project } from '../types';

const router = new Router({ prefix: '/api/projects' });

let db: Database | null = null;

export function setDatabase(database: Database): void {
  db = database;
}

const ProjectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  config: z.object({}).passthrough().optional(),
  mapElements: z.array(z.object({}).passthrough()).optional(),
  seats: z.array(z.object({}).passthrough()).optional(),
});

const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.object({}).passthrough().optional(),
  mapElements: z.array(z.object({}).passthrough()).optional(),
  seats: z.array(z.object({}).passthrough()).optional(),
});

router.get('/', async (ctx) => {
  if (!db) {
    ctx.status = 500;
    ctx.body = { error: 'Database not initialized' };
    return;
  }

  try {
    const projects = db.getAllProjects();
    ctx.body = {
      success: true,
      data: projects.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        config: {
          name: p.config.name,
          mapWidth: p.config.mapWidth,
          mapHeight: p.config.mapHeight,
          maxAgents: p.config.maxAgents,
        },
        mapElementCount: p.mapElements.length,
        seatCount: p.seats.length,
      })),
    };
  } catch (error) {
    console.error('[API] Get projects error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to get projects' };
  }
});

router.post('/', async (ctx: RouterContext) => {
  if (!db) {
    ctx.status = 500;
    ctx.body = { error: 'Database not initialized' };
    return;
  }

  try {
    const body = ProjectCreateSchema.parse(ctx.request.body);

    const project = db.createProject({
      name: body.name,
      config: { ...DEFAULT_CONFIG, ...body.config } as SimulationConfig,
      mapElements: (body.mapElements || []) as unknown as MapElement[],
      seats: (body.seats || []) as unknown as Seat[],
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      data: project,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Invalid input', details: error.errors };
    } else {
      console.error('[API] Create project error:', error);
      ctx.status = 500;
      ctx.body = { success: false, error: 'Failed to create project' };
    }
  }
});

router.get('/:id', async (ctx) => {
  if (!db) {
    ctx.status = 500;
    ctx.body = { error: 'Database not initialized' };
    return;
  }

  try {
    const { id } = ctx.params;
    const project = db.getProject(id);

    if (!project) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Project not found' };
      return;
    }

    ctx.body = {
      success: true,
      data: project,
    };
  } catch (error) {
    console.error('[API] Get project error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to get project' };
  }
});

router.put('/:id', async (ctx: RouterContext) => {
  if (!db) {
    ctx.status = 500;
    ctx.body = { error: 'Database not initialized' };
    return;
  }

  try {
    const { id } = ctx.params;
    const body = ProjectUpdateSchema.parse(ctx.request.body);

    const updated = db.updateProject(id, body as Partial<Omit<Project, 'id' | 'createdAt'>>);

    if (!updated) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Project not found' };
      return;
    }

    ctx.body = {
      success: true,
      data: updated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      ctx.status = 400;
      ctx.body = { success: false, error: 'Invalid input', details: error.errors };
    } else {
      console.error('[API] Update project error:', error);
      ctx.status = 500;
      ctx.body = { success: false, error: 'Failed to update project' };
    }
  }
});

router.delete('/:id', async (ctx: RouterContext) => {
  if (!db) {
    ctx.status = 500;
    ctx.body = { error: 'Database not initialized' };
    return;
  }

  try {
    const { id } = ctx.params;
    const deleted = db.deleteProject(id);

    if (!deleted) {
      ctx.status = 404;
      ctx.body = { success: false, error: 'Project not found' };
      return;
    }

    ctx.body = {
      success: true,
      message: 'Project deleted',
    };
  } catch (error) {
    console.error('[API] Delete project error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to delete project' };
  }
});

router.get('/:id/snapshots', async (ctx: RouterContext) => {
  if (!db) {
    ctx.status = 500;
    ctx.body = { error: 'Database not initialized' };
    return;
  }

  try {
    const { id } = ctx.params;
    const limit = ctx.query.limit ? parseInt(ctx.query.limit as string) : 10;

    const snapshots = db.getSnapshotsByProjectId(id, limit);
    ctx.body = {
      success: true,
      data: snapshots,
    };
  } catch (error) {
    console.error('[API] Get snapshots error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to get snapshots' };
  }
});

router.post('/:id/snapshots', async (ctx: RouterContext) => {
  if (!db) {
    ctx.status = 500;
    ctx.body = { error: 'Database not initialized' };
    return;
  }

  try {
    const { id } = ctx.params;
    const body = ctx.request.body as any;

    const snapshot = db.createSnapshot(id, {
      timestamp: Date.now(),
      nodes: body.nodes || [],
      depthDistribution: body.depthDistribution || [],
      maxDepth: body.maxDepth || 0,
    });

    if (body.sirMatrix) {
      db.createSIRMatrix(snapshot.id, body.sirMatrix);
    }

    ctx.status = 201;
    ctx.body = {
      success: true,
      data: snapshot,
    };
  } catch (error) {
    console.error('[API] Create snapshot error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to create snapshot' };
  }
});

router.get('/:id/events', async (ctx: RouterContext) => {
  if (!db) {
    ctx.status = 500;
    ctx.body = { error: 'Database not initialized' };
    return;
  }

  try {
    const { id } = ctx.params;
    const options = {
      eventType: ctx.query.eventType as string | undefined,
      startTime: ctx.query.startTime ? parseInt(ctx.query.startTime as string) : undefined,
      endTime: ctx.query.endTime ? parseInt(ctx.query.endTime as string) : undefined,
      limit: ctx.query.limit ? parseInt(ctx.query.limit as string) : 100,
    };

    const events = db.getEventLogsByProjectId(id, options);
    ctx.body = {
      success: true,
      data: events,
    };
  } catch (error) {
    console.error('[API] Get events error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: 'Failed to get events' };
  }
});

export const projectRoutes = router;
