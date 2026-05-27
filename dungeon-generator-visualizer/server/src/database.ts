import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import type { DungeonSnapshot, PathfindingStats } from './types';

export class DungeonDatabase {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private initialized = false;

  constructor(dbPath: string = './data/dungeon.db') {
    this.dbPath = path.resolve(dbPath);
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    const SQL = await initSqlJs({
      locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`)
    });

    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initTables();
    this.initialized = true;
  }

  private initTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seed INTEGER NOT NULL,
        config TEXT NOT NULL,
        tiles TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pathfinding_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshotId INTEGER NOT NULL,
        algorithm TEXT NOT NULL,
        nodesExpanded INTEGER NOT NULL,
        pathLength INTEGER NOT NULL,
        timeMs REAL NOT NULL,
        maxOpenSetSize INTEGER NOT NULL,
        found INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (snapshotId) REFERENCES snapshots(id)
      );

      CREATE TABLE IF NOT EXISTS preset_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        config TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_seed ON snapshots(seed);
      CREATE INDEX IF NOT EXISTS idx_pathfinding_snapshot ON pathfinding_stats(snapshotId);
      CREATE INDEX IF NOT EXISTS idx_pathfinding_algorithm ON pathfinding_stats(algorithm);
    `);

    this.saveToFile();
  }

  private saveToFile(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (e) {
      console.warn('Failed to save database to file:', e);
    }
  }

  saveSnapshot(snapshot: Omit<DungeonSnapshot, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      'INSERT INTO snapshots (seed, config, tiles, createdAt) VALUES (?, ?, ?, ?)'
    );
    stmt.run([
      snapshot.seed,
      snapshot.config,
      snapshot.tiles,
      snapshot.createdAt
    ]);
    stmt.free();

    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
    
    this.saveToFile();
    return id;
  }

  getSnapshot(id: number): DungeonSnapshot | null {
    if (!this.db) return null;

    const result = this.db.exec(
      'SELECT * FROM snapshots WHERE id = ?',
      [id]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const row = result[0].values[0];
    return this.mapSnapshot(row);
  }

  listSnapshots(limit: number = 100): DungeonSnapshot[] {
    if (!this.db) return [];

    const result = this.db.exec(
      'SELECT * FROM snapshots ORDER BY createdAt DESC LIMIT ?',
      [limit]
    );

    if (result.length === 0) return [];

    return result[0].values.map(row => this.mapSnapshot(row));
  }

  savePathfindingStats(stats: Omit<PathfindingStats, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      `INSERT INTO pathfinding_stats 
       (snapshotId, algorithm, nodesExpanded, pathLength, timeMs, maxOpenSetSize, found, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run([
      stats.snapshotId,
      stats.algorithm,
      stats.nodesExpanded,
      stats.pathLength,
      stats.timeMs,
      stats.maxOpenSetSize,
      stats.found ? 1 : 0,
      stats.createdAt
    ]);
    stmt.free();

    const id = this.db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] as number;
    
    this.saveToFile();
    return id;
  }

  getPathfindingStats(snapshotId: number): PathfindingStats[] {
    if (!this.db) return [];

    const result = this.db.exec(
      'SELECT * FROM pathfinding_stats WHERE snapshotId = ? ORDER BY timeMs',
      [snapshotId]
    );

    if (result.length === 0) return [];

    return result[0].values.map(row => this.mapPathfindingStats(row));
  }

  getAlgorithmStats(algorithm: string): { avgTime: number; avgNodes: number; avgLength: number; count: number } {
    if (!this.db) {
      return { avgTime: 0, avgNodes: 0, avgLength: 0, count: 0 };
    }

    const result = this.db.exec(
      `SELECT 
         AVG(timeMs) as avgTime,
         AVG(nodesExpanded) as avgNodes,
         AVG(pathLength) as avgLength,
         COUNT(*) as count
       FROM pathfinding_stats 
       WHERE algorithm = ? AND found = 1`,
      [algorithm]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return { avgTime: 0, avgNodes: 0, avgLength: 0, count: 0 };
    }

    const row = result[0].values[0];
    return {
      avgTime: (row[0] as number) || 0,
      avgNodes: (row[1] as number) || 0,
      avgLength: (row[2] as number) || 0,
      count: (row[3] as number) || 0
    };
  }

  deleteSnapshot(id: number): void {
    if (!this.db) return;

    this.db.run('DELETE FROM pathfinding_stats WHERE snapshotId = ?', [id]);
    this.db.run('DELETE FROM snapshots WHERE id = ?', [id]);
    this.saveToFile();
  }

  clearAll(): void {
    if (!this.db) return;

    this.db.run('DELETE FROM pathfinding_stats');
    this.db.run('DELETE FROM snapshots');
    this.saveToFile();
  }

  private mapSnapshot(row: any[]): DungeonSnapshot {
    return {
      id: row[0] as number,
      seed: row[1] as number,
      config: row[2] as string,
      tiles: row[3] as string,
      createdAt: row[4] as number
    };
  }

  private mapPathfindingStats(row: any[]): PathfindingStats {
    return {
      id: row[0] as number,
      snapshotId: row[1] as number,
      algorithm: row[2] as string,
      nodesExpanded: row[3] as number,
      pathLength: row[4] as number,
      timeMs: row[5] as number,
      maxOpenSetSize: row[6] as number,
      found: row[7] === 1,
      createdAt: row[8] as number
    };
  }

  close(): void {
    if (this.db) {
      this.saveToFile();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

export const db = new DungeonDatabase();
