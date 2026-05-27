const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const path = require('path');
const Database = require('better-sqlite3');

const gameModule = require('./routes/game');
const aiRoutes = require('./routes/ai');
const presetRoutes = require('./routes/preset');
const { initDatabase } = require('./db/database');

const gameRoutes = gameModule.router;

const app = new Koa();
const router = new Router();

const dbPath = path.join(__dirname, 'db', 'asymmetric_chess.db');
const db = new Database(dbPath);
initDatabase(db);

app.context.db = db;

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

module.exports = app;
