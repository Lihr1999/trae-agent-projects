import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { openDatabase, saveDatabase } from './db.js';
import { geoRoutes } from './routes/geoRoutes.js';
import { economyRoutes } from './routes/economyRoutes.js';
import { drillRoutes } from './routes/drillRoutes.js';
import { influenceRoutes } from './routes/influenceRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: true });

const dbPath = path.resolve(__dirname, '../data/economy.db');
const db = await openDatabase(dbPath);
fastify.decorate('db', db);

fastify.addHook('onClose', async () => saveDatabase(db));

fastify.register(geoRoutes);
fastify.register(economyRoutes);
fastify.register(drillRoutes);
fastify.register(influenceRoutes);

const start = async () => {
  try {
    const port = process.env.PORT || 4000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Regional Economy API listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
