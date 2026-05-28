const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const gameModule = require('./routes/game');
const aiRoutes = require('./routes/ai');
const presetRoutes = require('./routes/preset');
const { initDatabase, wrapDatabase } = require('./db/database');

const gameRoutes = gameModule.router;
const app = new Koa();
const router = new Router();

const dbPath = path.join(__dirname, 'db', 'asymmetric_chess.db');

async function startServer() {
  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file)
  });

  let db;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  const wrappedDb = wrapDatabase(db, dbPath);
  initDatabase(wrappedDb);

  app.context.db = wrappedDb;

  app.use(cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept']
  }));
  app.use(bodyParser());

  router.prefix('/api');
  router.use('/game', gameRoutes.routes(), gameRoutes.allowedMethods());
  router.use('/ai', aiRoutes.routes(), aiRoutes.allowedMethods());
  router.use('/preset', presetRoutes.routes(), presetRoutes.allowedMethods());

  app.use(router.routes());
  app.use(router.allowedMethods());

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Asymmetric Chess Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
