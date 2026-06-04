import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'warehouse.db');

export function initDatabase(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables(db);

  return db;
}

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS floors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS racks (
      id TEXT PRIMARY KEY,
      floor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      rows INTEGER NOT NULL,
      columns INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (floor_id) REFERENCES floors(id)
    );

    CREATE TABLE IF NOT EXISTS skus (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      weight REAL NOT NULL,
      volume REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      rack_id TEXT NOT NULL,
      code TEXT NOT NULL,
      row INTEGER NOT NULL,
      column INTEGER NOT NULL,
      level INTEGER NOT NULL,
      status TEXT NOT NULL,
      sku_id TEXT,
      quantity INTEGER NOT NULL,
      max_quantity INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (rack_id) REFERENCES racks(id),
      FOREIGN KEY (sku_id) REFERENCES skus(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL UNIQUE,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      items TEXT NOT NULL,
      wave_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS waves (
      id TEXT PRIMARY KEY,
      wave_no TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      order_ids TEXT NOT NULL,
      robot_ids TEXT NOT NULL,
      priority TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS robots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      floor_id TEXT NOT NULL,
      status TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      target_x INTEGER,
      target_y INTEGER,
      battery INTEGER NOT NULL,
      current_task_id TEXT,
      speed REAL NOT NULL,
      capacity INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      wave_id TEXT,
      order_id TEXT,
      robot_id TEXT,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      from_location_id TEXT,
      to_location_id TEXT,
      sku_id TEXT,
      quantity INTEGER NOT NULL,
      priority INTEGER NOT NULL,
      path TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exceptions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      related_id TEXT,
      related_type TEXT,
      handled_by TEXT,
      resolution TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      related_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS congestion_points (
      id TEXT PRIMARY KEY,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      floor_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      robot_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_locations_rack ON locations(rack_id);
    CREATE INDEX IF NOT EXISTS idx_locations_sku ON locations(sku_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_robot ON tasks(robot_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
  `);
}
