import Fastify from 'fastify';
import cors from '@fastify/cors';
import { dbService } from './db/database';
import projectsRoutes from './routes/projects';
import computationRoutes from './routes/computation';
import presetsRoutes from './routes/presets';
import materialsRoutes from './routes/materials';

const fastify = Fastify({
  logger: true
});

fastify.register(cors, {
  origin: true,
  credentials: true
});

fastify.register(projectsRoutes);
fastify.register(computationRoutes);
fastify.register(presetsRoutes);
fastify.register(materialsRoutes);

const start = async () => {
  try {
    await dbService.initialize();
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
