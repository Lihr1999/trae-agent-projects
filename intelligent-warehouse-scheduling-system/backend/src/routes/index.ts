import Router from 'koa-router';
import type { DatabaseService } from '../services/databaseService';
import type { SchedulingService } from '../services/schedulingService';

export function createRoutes(
  dbService: DatabaseService,
  schedulingService: SchedulingService
): Router {
  const router = new Router({ prefix: '/api' });

  router.get('/health', async (ctx) => {
    ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
  });

  router.get('/floors', async (ctx) => {
    ctx.body = dbService.getFloors();
  });

  router.get('/floors/:id', async (ctx) => {
    const floor = dbService.getFloorById(ctx.params.id);
    if (!floor) {
      ctx.status = 404;
      ctx.body = { error: 'Floor not found' };
      return;
    }
    ctx.body = floor;
  });

  router.post('/floors', async (ctx) => {
    const body = ctx.request.body as any;
    const floor = dbService.createFloor({
      name: body.name,
      level: body.level,
      width: body.width,
      height: body.height,
    });
    ctx.body = floor;
  });

  router.put('/floors/:id', async (ctx) => {
    const body = ctx.request.body as any;
    const floor = dbService.updateFloor(ctx.params.id, body);
    if (!floor) {
      ctx.status = 404;
      ctx.body = { error: 'Floor not found' };
      return;
    }
    ctx.body = floor;
  });

  router.delete('/floors/:id', async (ctx) => {
    const deleted = dbService.deleteFloor(ctx.params.id);
    ctx.body = { success: deleted };
  });

  router.get('/racks', async (ctx) => {
    const floorId = ctx.query.floorId as string;
    ctx.body = dbService.getRacks(floorId);
  });

  router.get('/racks/:id', async (ctx) => {
    const rack = dbService.getRackById(ctx.params.id);
    if (!rack) {
      ctx.status = 404;
      ctx.body = { error: 'Rack not found' };
      return;
    }
    ctx.body = rack;
  });

  router.post('/racks', async (ctx) => {
    const body = ctx.request.body as any;
    const rack = dbService.createRack({
      floorId: body.floorId,
      name: body.name,
      x: body.x,
      y: body.y,
      width: body.width,
      height: body.height,
      rows: body.rows,
      columns: body.columns,
    });
    ctx.body = rack;
  });

  router.put('/racks/:id', async (ctx) => {
    const body = ctx.request.body as any;
    const rack = dbService.updateRack(ctx.params.id, body);
    if (!rack) {
      ctx.status = 404;
      ctx.body = { error: 'Rack not found' };
      return;
    }
    ctx.body = rack;
  });

  router.delete('/racks/:id', async (ctx) => {
    const deleted = dbService.deleteRack(ctx.params.id);
    ctx.body = { success: deleted };
  });

  router.get('/locations', async (ctx) => {
    const rackId = ctx.query.rackId as string;
    ctx.body = dbService.getLocations(rackId);
  });

  router.put('/locations/:id', async (ctx) => {
    const body = ctx.request.body as any;
    const location = dbService.updateLocation(ctx.params.id, body);
    if (!location) {
      ctx.status = 404;
      ctx.body = { error: 'Location not found' };
      return;
    }
    ctx.body = location;
  });

  router.get('/skus', async (ctx) => {
    ctx.body = dbService.getSKUs();
  });

  router.post('/skus', async (ctx) => {
    const body = ctx.request.body as any;
    const sku = dbService.createSKU({
      code: body.code,
      name: body.name,
      category: body.category,
      weight: body.weight,
      volume: body.volume,
    });
    ctx.body = sku;
  });

  router.get('/orders', async (ctx) => {
    const status = ctx.query.status as any;
    ctx.body = dbService.getOrders(status);
  });

  router.post('/orders', async (ctx) => {
    const body = ctx.request.body as any;
    const order = dbService.createOrder({
      orderNo: body.orderNo,
      priority: body.priority,
      status: 'pending',
      items: body.items,
    });
    ctx.body = order;
  });

  router.put('/orders/:id', async (ctx) => {
    const body = ctx.request.body as any;
    const order = dbService.updateOrder(ctx.params.id, body);
    if (!order) {
      ctx.status = 404;
      ctx.body = { error: 'Order not found' };
      return;
    }
    ctx.body = order;
  });

  router.get('/waves', async (ctx) => {
    ctx.body = dbService.getWaves();
  });

  router.post('/waves/generate', async (ctx) => {
    const waves = schedulingService.generateWaves();
    ctx.body = waves;
  });

  router.put('/waves/:id', async (ctx) => {
    const body = ctx.request.body as any;
    const wave = dbService.updateWave(ctx.params.id, body);
    if (!wave) {
      ctx.status = 404;
      ctx.body = { error: 'Wave not found' };
      return;
    }
    ctx.body = wave;
  });

  router.get('/robots', async (ctx) => {
    const floorId = ctx.query.floorId as string;
    ctx.body = dbService.getRobots(floorId);
  });

  router.post('/robots', async (ctx) => {
    const body = ctx.request.body as any;
    const robot = dbService.createRobot({
      name: body.name,
      floorId: body.floorId,
      status: 'idle',
      x: body.x,
      y: body.y,
      battery: body.battery || 100,
      speed: body.speed || 2,
      capacity: body.capacity || 100,
    });
    ctx.body = robot;
  });

  router.put('/robots/:id', async (ctx) => {
    const body = ctx.request.body as any;
    const robot = dbService.updateRobot(ctx.params.id, body);
    if (!robot) {
      ctx.status = 404;
      ctx.body = { error: 'Robot not found' };
      return;
    }
    ctx.body = robot;
  });

  router.get('/tasks', async (ctx) => {
    const status = ctx.query.status as any;
    const waveId = ctx.query.waveId as string;
    ctx.body = dbService.getTasks(status, waveId);
  });

  router.post('/tasks/assign', async (ctx) => {
    const assignments = schedulingService.assignTasks();
    ctx.body = assignments;
  });

  router.put('/tasks/:id/cancel', async (ctx) => {
    const task = schedulingService.cancelTask(ctx.params.id);
    if (!task) {
      ctx.status = 404;
      ctx.body = { error: 'Task not found' };
      return;
    }
    ctx.body = task;
  });

  router.put('/tasks/:id/reassign', async (ctx) => {
    const body = ctx.request.body as any;
    const task = schedulingService.reassignTask(ctx.params.id, body.robotId);
    if (!task) {
      ctx.status = 404;
      ctx.body = { error: 'Task not found' };
      return;
    }
    ctx.body = task;
  });

  router.get('/exceptions', async (ctx) => {
    const status = ctx.query.status as any;
    ctx.body = dbService.getExceptions(status);
  });

  router.put('/exceptions/:id', async (ctx) => {
    const body = ctx.request.body as any;
    const exception = dbService.updateException(ctx.params.id, body);
    if (!exception) {
      ctx.status = 404;
      ctx.body = { error: 'Exception not found' };
      return;
    }
    ctx.body = exception;
  });

  router.get('/logs', async (ctx) => {
    const limit = parseInt(ctx.query.limit as string) || 100;
    ctx.body = dbService.getLogs(limit);
  });

  router.post('/simulation/start', async (ctx) => {
    schedulingService.startSimulation();
    ctx.body = { success: true };
  });

  router.post('/simulation/stop', async (ctx) => {
    schedulingService.stopSimulation();
    ctx.body = { success: true };
  });

  return router;
}
