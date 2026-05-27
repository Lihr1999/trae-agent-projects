import Database from 'better-sqlite3';
import path from 'path';
import type { DungeonSnapshot, PathfindingStats } from './types';

export class DungeonDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/dungeon.db') {
    const fullPath = path.resolve(dbPath);
    this.db = new Database(fullPath);
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
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
  }

  saveSnapshot(snapshot: Omit<DungeonSnapshot, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO snapshots (seed, config, tiles, createdAt)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      snapshot.seed,
      snapshot.config,
      snapshot.tiles,
      snapshot.createdAt
    );
    return Number(result.lastInsertRowid);
  }

  getSnapshot(id: number): DungeonSnapshot | null {
    const stmt = this.db.prepare('SELECT * FROM snapshots WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapSnapshot(row) : null;
  }

  listSnapshots(limit: number = 100): DungeonSnapshot[] {
    const stmt = this.db.prepare('SELECT * FROM snapshots ORDER BY createdAt DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    return rows.map(row => this.mapSnapshot(row));
  }

  savePathfindingStats(stats: Omit<PathfindingStats, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO pathfinding_stats 
      (snapshotId, algorithm, nodesExpanded, pathLength, timeMs, maxOpenSetSize, found, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      stats.snapshotId,
      stats.algorithm,
      stats.nodesExpanded,
      stats.pathLength,
      stats.timeMs,
      stats.maxOpenSetSize,
      stats.found ? 1 : 0,
      stats.createdAt
    );
    return Number(result.lastInsertRowid);
  }

  getPathfindingStats(snapshotId: number): PathfindingStats[] {
    const stmt = this.db.prepare('SELECT * FROM pathfinding_stats WHERE snapshotId = ? ORDER BY timeMs');
    const rows = stmt.all(snapshotId) as any[];
    return rows.map(row => this.mapPathfindingStats(row));
  }

  getAlgorithmStats(algorithm: string): { avgTime: number; avgNodes: number; avgLength: number; count: number } {
    const stmt = this.db.prepare(`
      SELECT 
        AVG(timeMs) as avgTime,
        AVG(nodesExpanded) as avgNodes,
        AVG(pathLength) as avgLength,
        COUNT(*) as count
      FROM pathfinding_stats 
      WHERE algorithm = ? AND found = 1
    `);
    const row = stmt.get(algorithm) as any;
    return {
      avgTime: row?.avgTime || 0,
      avgNodes: row?.avgNodes || 0,
      avgLength: row?.avgLength || 0,
      count: row?.count || 0
    };
  }

  deleteSnapshot(id: number): void {
    this.db.prepare('DELETE FROM pathfinding_stats WHERE snapshotId = ?').run(id);
    this.db.prepare('DELETE FROM snapshots WHERE id = ?').run(id);
  }

  clearAll(): void {
    this.db.exec('DELETE FROM pathfinding_stats');
    this.db.exec('DELETE FROM snapshots');
  }

  private mapSnapshot(row: any): DungeonSnapshot {
    return {
      id: row.id,
      seed: row.seed,
      config: row.config,
      tiles: row.tiles,
      createdAt: row.createdAt
    };
  }

  private mapPathfindingStats(row: any): PathfindingStats {
    return {
      id: row.id,
      snapshotId: row.snapshotId,
      algorithm: row.algorithm,
      nodesExpanded: row.nodesExpanded,
      pathLength: row.pathLength,
      timeMs: row.timeMs,
      maxOpenSetSize: row.maxOpenSetSize,
      found: row.found === 1,
      createdAt: row.createdAt
    };
  }

  close(): void {
    this.db.close();
  }
}

export const db = new DungeonDatabase();
