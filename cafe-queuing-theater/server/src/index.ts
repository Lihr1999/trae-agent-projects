import Koa from 'koa';
import cors from '@koa/cors';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import http from 'http';
import { Database } from './db';
import { WebSocketServer } from './websocket/WebSocketServer';
import { SimulationEngine } from './simulation/SimulationEngine';
import { PresetManager } from './presets';
import { projectRoutes, setDatabase } from './routes/projects';
import { presetRoutes } from './routes/presets';
import { DEFAULT_CONFIG, SimulationConfig, DeltaState, SimulationState } from './types';

const app = new Koa();
const router = new Router();
const server = http.createServer(app.callback());

const db = new Database();
const wsServer = new WebSocketServer(server);
const presetManager = new PresetManager();

let simulationEngine: SimulationEngine | null = null;
let currentProjectId: string = 'default';
let simulationLoopId: ReturnType<typeof setInterval> | null = null;
let lastDelta: DeltaState | null = null;

app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser());

app.use(async (ctx, next) => {
  console.log(`[HTTP] ${ctx.method} ${ctx.path}`);
  await next();
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('[HTTP] Error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
  }
});

router.get('/api/health', (ctx) => {
  ctx.body = {
    success: true,
    data: {
      status: 'ok',
      timestamp: Date.now(),
      wsClients: wsServer.getClientCount(),
      simulation: simulationEngine ? {
        running: simulationEngine.getState().running,
        time: simulationEngine.getState().time,
        agentCount: simulationEngine.getState().agents.length,
      } : null,
    },
  };
});

router.post('/api/simulation/start', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  simulationEngine.start();
  startSimulationLoop();

  ctx.body = {
    success: true,
    message: 'Simulation started',
  };
});

router.post('/api/simulation/pause', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  simulationEngine.pause();
  stopSimulationLoop();

  ctx.body = {
    success: true,
    message: 'Simulation paused',
  };
});

router.post('/api/simulation/reset', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  stopSimulationLoop();
  simulationEngine.reset();

  const state = simulationEngine.getState();
  wsServer.broadcastFullState(state, currentProjectId);

  ctx.body = {
    success: true,
    message: 'Simulation reset',
  };
});

router.post('/api/simulation/speed', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  const { speed } = ctx.request.body as { speed: number };
  simulationEngine.setSpeed(speed);

  ctx.body = {
    success: true,
    data: { speed },
  };
});

router.get('/api/simulation/state', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  ctx.body = {
    success: true,
    data: simulationEngine.getState(),
  };
});

router.put('/api/simulation/config', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  const config = ctx.request.body as Partial<SimulationConfig>;
  simulationEngine.updateConfig(config);

  ctx.body = {
    success: true,
    data: simulationEngine.getConfig(),
  };
});

router.post('/api/simulation/step', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  simulationEngine.step();
  const state = simulationEngine.getState();

  ctx.body = {
    success: true,
    data: state,
  };
});

router.get('/api/simulation/anomalies', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  ctx.body = {
    success: true,
    data: simulationEngine.getAnomalies(),
  };
});

router.get('/api/simulation/deadlock-suggestions', (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  ctx.body = {
    success: true,
    data: simulationEngine.getDeadlockRecoverySuggestions(),
  };
});

router.post('/api/simulation/init', async (ctx) => {
  const body = ctx.request.body as any;
  const { mapElements, seats, employees, config } = body;

  if (!mapElements || !seats || !employees) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      error: 'Missing required fields: mapElements, seats, employees',
    };
    return;
  }

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  simulationEngine = new SimulationEngine(mergedConfig);
  simulationEngine.init(mapElements, seats, employees);

  simulationEngine.subscribe((delta: DeltaState) => {
    lastDelta = delta;
    wsServer.broadcastDelta(delta, currentProjectId);
  });

  const state = simulationEngine.getState();
  wsServer.broadcastFullState(state, currentProjectId);

  if (db.isInitialized()) {
    try {
      const project = db.createProject({
        name: config?.name || `Simulation ${Date.now()}`,
        config: mergedConfig,
        mapElements,
        seats,
      });
      currentProjectId = project.id;
    } catch (error) {
      console.error('[DB] Failed to create project:', error);
    }
  }

  ctx.body = {
    success: true,
    data: {
      projectId: currentProjectId,
      state: simulationEngine.getState(),
      config: simulationEngine.getConfig(),
    },
  };
});

router.post('/api/simulation/load-preset/:id', async (ctx) => {
  const { id } = ctx.params;

  try {
    const loaded = presetManager.loadScenario(id);
    currentProjectId = id;

    simulationEngine = new SimulationEngine(loaded.config);
    simulationEngine.init(loaded.mapElements, loaded.seats, loaded.employees);

    simulationEngine.subscribe((delta: DeltaState) => {
      lastDelta = delta;
      wsServer.broadcastDelta(delta, currentProjectId);
    });

    const state = simulationEngine.getState();
    wsServer.broadcastFullState(state, currentProjectId);

    ctx.body = {
      success: true,
      data: {
        scenario: loaded.scenario,
        config: loaded.config,
        state,
      },
    };
  } catch (error) {
    console.error('[API] Load preset error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load preset',
    };
  }
});

router.get('/api/simulation/snapshot', async (ctx) => {
  if (!simulationEngine) {
    ctx.status = 400;
    ctx.body = { success: false, error: 'Simulation not initialized' };
    return;
  }

  const state = simulationEngine.getState();
  const snapshot = state.quadtreeSnapshot;

  if (!snapshot) {
    ctx.status = 404;
    ctx.body = { success: false, error: 'No snapshot available' };
    return;
  }

  if (db.isInitialized() && currentProjectId !== 'default') {
    try {
      const savedSnapshot = db.createSnapshot(currentProjectId, {
        timestamp: Date.now(),
        nodes: snapshot.nodes,
        depthDistribution: snapshot.depthDistribution,
        maxDepth: snapshot.maxDepth,
      });

      if (state.sirMatrix) {
        db.createSIRMatrix(savedSnapshot.id, state.sirMatrix);
      }
    } catch (error) {
      console.error('[DB] Failed to save snapshot:', error);
    }
  }

  ctx.body = {
    success: true,
    data: snapshot,
  };
});

app.use(router.routes());
app.use(projectRoutes.routes());
app.use(presetRoutes.routes());
app.use(router.allowedMethods());

setDatabase(db);

function startSimulationLoop(): void {
  if (simulationLoopId) return;

  simulationLoopId = setInterval(() => {
    if (simulationEngine && simulationEngine.getState().running) {
      simulationEngine.step();
    }
  }, 16);
}

function stopSimulationLoop(): void {
  if (simulationLoopId) {
    clearInterval(simulationLoopId);
    simulationLoopId = null;
  }
}

wsServer.onSubscribe = async (clientId: string, projectId: string) => {
  currentProjectId = projectId;

  if (simulationEngine) {
    const state = simulationEngine.getState();
    wsServer.sendToClient(clientId, 'full_state', state);
  }
};

wsServer.onCommand = (clientId: string, command: string, params: any) => {
  if (!simulationEngine) {
    wsServer.sendError(clientId, 'Simulation not initialized');
    return;
  }

  try {
    switch (command) {
      case 'start':
        simulationEngine.start();
        startSimulationLoop();
        break;
      case 'pause':
        simulationEngine.pause();
        stopSimulationLoop();
        break;
      case 'reset':
        stopSimulationLoop();
        simulationEngine.reset();
        const state = simulationEngine.getState();
        wsServer.broadcastFullState(state, currentProjectId);
        break;
      case 'step':
        simulationEngine.step();
        break;
      case 'set_speed':
        if (typeof params.speed === 'number') {
          simulationEngine.setSpeed(params.speed);
        }
        break;
      default:
        wsServer.sendError(clientId, `Unknown command: ${command}`);
        return;
    }

    wsServer.sendToClient(clientId, 'command', {
      success: true,
      command,
      result: { state: simulationEngine.getState() },
    });
  } catch (error) {
    wsServer.sendError(
      clientId,
      `Command failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

wsServer.onConfigUpdate = (clientId: string, projectId: string, config: any) => {
  if (!simulationEngine) {
    wsServer.sendError(clientId, 'Simulation not initialized');
    return;
  }

  try {
    simulationEngine.updateConfig(config);
    wsServer.sendToClient(clientId, 'config_update', {
      success: true,
      config: simulationEngine.getConfig(),
    });
  } catch (error) {
    wsServer.sendError(
      clientId,
      `Config update failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

wsServer.onDisconnect = (clientId: string, projectId: string | null) => {
  console.log(`[WS] Client ${clientId} disconnected from project ${projectId}`);

  if (wsServer.getClientCount() === 0) {
    stopSimulationLoop();
    if (simulationEngine) {
      simulationEngine.pause();
    }
  }
};

async function startServer(): Promise<void> {
  try {
    await db.init();
    console.log('[DB] Database initialized');

    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    server.listen(PORT, () => {
      console.log(`[SERVER] HTTP server listening on port ${PORT}`);
      console.log(`[SERVER] WebSocket endpoint: ws://localhost:${PORT}/ws`);
    });

    const defaultScenario = presetManager.loadScenario('scenario-1');
    simulationEngine = new SimulationEngine(defaultScenario.config);
    simulationEngine.init(
      defaultScenario.mapElements,
      defaultScenario.seats,
      defaultScenario.employees
    );

    simulationEngine.subscribe((delta: DeltaState) => {
      lastDelta = delta;
    });

    console.log('[SIM] Default simulation initialized with scenario-1');
  } catch (error) {
    console.error('[SERVER] Failed to start:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('[SERVER] Shutting down...');
  stopSimulationLoop();
  wsServer.close();
  db.close();
  server.close(() => {
    console.log('[SERVER] Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('[SERVER] Received SIGTERM');
  process.emit('SIGINT');
});

startServer();
