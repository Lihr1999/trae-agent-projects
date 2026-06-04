import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from 'koa-cors';
import http from 'http';
import { initDatabase } from './database/init';
import { DatabaseService } from './services/databaseService';
import { WebSocketService } from './services/websocketService';
import { SchedulingService } from './services/schedulingService';
import { createRoutes } from './routes';
import { seedDatabase } from './seed';

const app = new Koa();
const PORT = process.env.PORT || 3000;

const db = initDatabase();
const dbService = new DatabaseService(db);

seedDatabase(dbService);

app.use(cors());
app.use(bodyParser());

const server = http.createServer(app.callback());

const wsService = new WebSocketService(server, dbService);
const schedulingService = new SchedulingService(dbService, wsService);

schedulingService.initScheduler();

const routes = createRoutes(dbService, schedulingService);
app.use(routes.routes());
app.use(routes.allowedMethods());

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket running on ws://localhost:${PORT}/ws`);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  schedulingService.stopSimulation();
  wsService.close();
  db.close();
  server.close();
  process.exit(0);
});
