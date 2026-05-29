import Koa from 'koa';
import Router from 'koa-router';
import { koaBody } from 'koa-body';
import cors from 'koa-cors';
import { initDatabase, closeDatabase } from './db/database';
import polygonsRouter from './routes/polygons';
import nestingRouter from './routes/nesting';
import projectsRouter from './routes/projects';
import presetsRouter from './routes/presets';
import sizeConfigsRouter from './routes/size-configs';

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization']
}));

app.use(koaBody({
  jsonLimit: '10mb',
  multipart: true
}));

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Server error:', error);
    ctx.status = 500;
    ctx.body = {
      error: error instanceof Error ? error.message : 'Internal server error'
    };
  }
});

router.get('/api/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: Date.now(),
    service: 'garment-pattern-optimizer'
  };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(polygonsRouter.routes());
app.use(polygonsRouter.allowedMethods());

app.use(nestingRouter.routes());
app.use(nestingRouter.allowedMethods());

app.use(projectsRouter.routes());
app.use(projectsRouter.allowedMethods());

app.use(presetsRouter.routes());
app.use(presetsRouter.allowedMethods());

app.use(sizeConfigsRouter.routes());
app.use(sizeConfigsRouter.allowedMethods());

let server: any;

async function startServer() {
  try {
    initDatabase();
    console.log('Database initialized successfully');
    
    server = app.listen(PORT, () => {
      console.log(`🚀 Garment Pattern Optimizer Server is running on http://localhost:${PORT}`);
      console.log(`📁 API endpoints:
  GET    /api/health
  GET    /api/presets
  GET    /api/presets/:id
  GET    /api/presets/:id/load
  GET    /api/projects
  POST   /api/projects
  GET    /api/projects/:id
  PUT    /api/projects/:id
  DELETE /api/projects/:id
  POST   /api/nesting/compute
  POST   /api/nesting/nfp
  POST   /api/polygons/validate
  POST   /api/polygons/transform
  POST   /api/size-configs
`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  if (server) {
    server.close();
  }
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  if (server) {
    server.close();
  }
  closeDatabase();
  process.exit(0);
});

startServer();

export default app;
