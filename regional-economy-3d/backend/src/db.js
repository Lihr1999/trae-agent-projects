import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

let SQL = null;

async function ensureSQL() {
  if (!SQL) SQL = await initSqlJs();
  return SQL;
}

export async function openDatabase(dbPath) {
  const S = await ensureSQL();
  let db;
  if (existsSync(dbPath)) {
    const buf = readFileSync(dbPath);
    db = new S.Database(buf);
  } else {
    db = new S.Database();
  }
  db._path = dbPath;
  return db;
}

export function saveDatabase(db) {
  if (!db || !db._path) return;
  const data = db.export();
  writeFileSync(db._path, Buffer.from(data));
}

export function prepare(db, sql) {
  const paramSlotCount = (sql.match(/\?/g) || []).length;
  return {
    run: (...params) => {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params.slice(0, paramSlotCount));
        stmt.step();
      } finally {
        stmt.free();
      }
    },
    get: (...params) => {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params.slice(0, paramSlotCount));
        if (stmt.step()) {
          return stmt.getAsObject();
        }
        return null;
      } finally {
        stmt.free();
      }
    },
    all: (...params) => {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params.slice(0, paramSlotCount));
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        return rows;
      } finally {
        stmt.free();
      }
    },
  };
}

export function transaction(db, fn) {
  db.run('BEGIN TRANSACTION');
  try {
    fn();
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}
