import type { DungeonSnapshot, PathfindingStats } from './types';

interface SnapshotRecord {
  id: number;
  seed: number;
  config: string;
  tiles: string;
  createdAt: number;
}

interface PathfindingStatsRecord {
  id: number;
  snapshotId: number;
  algorithm: string;
  nodesExpanded: number;
  pathLength: number;
  timeMs: number;
  maxOpenSetSize: number;
  found: number;
  createdAt: number;
}

export class DungeonDatabase {
  private snapshots: Map<number, SnapshotRecord> = new Map();
  private pathfindingStats: Map<number, PathfindingStatsRecord> = new Map();
  private snapshotIdCounter = 0;
  private statsIdCounter = 0;

  constructor(_dbPath?: string) {
    this.initTables();
  }

  private initTables(): void {
    this.snapshots.clear();
    this.pathfindingStats.clear();
    this.snapshotIdCounter = 0;
    this.statsIdCounter = 0;
  }

  saveSnapshot(snapshot: Omit<DungeonSnapshot, 'id'>): number {
    const id = ++this.snapshotIdCounter;
    const record: SnapshotRecord = {
      id,
      seed: snapshot.seed,
      config: snapshot.config,
      tiles: snapshot.tiles,
      createdAt: snapshot.createdAt
    };
    this.snapshots.set(id, record);
    return id;
  }

  getSnapshot(id: number): DungeonSnapshot | null {
    const record = this.snapshots.get(id);
    return record ? this.mapSnapshot(record) : null;
  }

  listSnapshots(limit: number = 100): DungeonSnapshot[] {
    const records = Array.from(this.snapshots.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    return records.map(r => this.mapSnapshot(r));
  }

  savePathfindingStats(stats: Omit<PathfindingStats, 'id'>): number {
    const id = ++this.statsIdCounter;
    const record: PathfindingStatsRecord = {
      id,
      snapshotId: stats.snapshotId,
      algorithm: stats.algorithm,
      nodesExpanded: stats.nodesExpanded,
      pathLength: stats.pathLength,
      timeMs: stats.timeMs,
      maxOpenSetSize: stats.maxOpenSetSize,
      found: stats.found ? 1 : 0,
      createdAt: stats.createdAt
    };
    this.pathfindingStats.set(id, record);
    return id;
  }

  getPathfindingStats(snapshotId: number): PathfindingStats[] {
    const records = Array.from(this.pathfindingStats.values())
      .filter(r => r.snapshotId === snapshotId)
      .sort((a, b) => a.timeMs - b.timeMs);
    return records.map(r => this.mapPathfindingStats(r));
  }

  getAlgorithmStats(algorithm: string): { avgTime: number; avgNodes: number; avgLength: number; count: number } {
    const records = Array.from(this.pathfindingStats.values())
      .filter(r => r.algorithm === algorithm && r.found === 1);
    
    if (records.length === 0) {
      return { avgTime: 0, avgNodes: 0, avgLength: 0, count: 0 };
    }

    const avgTime = records.reduce((sum, r) => sum + r.timeMs, 0) / records.length;
    const avgNodes = records.reduce((sum, r) => sum + r.nodesExpanded, 0) / records.length;
    const avgLength = records.reduce((sum, r) => sum + r.pathLength, 0) / records.length;

    return {
      avgTime,
      avgNodes,
      avgLength,
      count: records.length
    };
  }

  deleteSnapshot(id: number): void {
    this.snapshots.delete(id);
    const statsToDelete = Array.from(this.pathfindingStats.values())
      .filter(r => r.snapshotId === id)
      .map(r => r.id);
    statsToDelete.forEach(id => this.pathfindingStats.delete(id));
  }

  clearAll(): void {
    this.snapshots.clear();
    this.pathfindingStats.clear();
  }

  private mapSnapshot(record: SnapshotRecord): DungeonSnapshot {
    return {
      id: record.id,
      seed: record.seed,
      config: record.config,
      tiles: record.tiles,
      createdAt: record.createdAt
    };
  }

  private mapPathfindingStats(record: PathfindingStatsRecord): PathfindingStats {
    return {
      id: record.id,
      snapshotId: record.snapshotId,
      algorithm: record.algorithm,
      nodesExpanded: record.nodesExpanded,
      pathLength: record.pathLength,
      timeMs: record.timeMs,
      maxOpenSetSize: record.maxOpenSetSize,
      found: record.found === 1,
      createdAt: record.createdAt
    };
  }

  close(): void {
    // No-op for memory storage
  }
}

export const db = new DungeonDatabase();
