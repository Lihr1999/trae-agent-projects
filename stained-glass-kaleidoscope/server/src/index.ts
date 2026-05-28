import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { geometryRoutes } from './routes/geometry.js';
import { symmetryRoutes } from './routes/symmetry.js';
import { projectRoutes } from './routes/projects.js';
import { presetRoutes } from './routes/presets.js';

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: true,
  credentials: true,
});

fastify.register(geometryRoutes);
fastify.register(symmetryRoutes);
fastify.register(projectRoutes);
fastify.register(presetRoutes);

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`服务器运行在 http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
