import initSqlJs, { Database as SqlJsDatabase, Statement, SqlJsStatic, QueryExecResult } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  Project,
  MapElement,
  SimulationConfig,
  SIRMatrix,
  QuadTreeSnapshot,
  EventLog,
  Seat,
  QueuingTopology,
} from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Database {
  private db: SqlJsDatabase | null = null;
  private SQL: SqlJsStatic | null = null;
  private initialized = false;

  async init(data?: ArrayLike<number> | Buffer | null): Promise<void> {
    if (this.initialized) return;

    this.SQL = await initSqlJs({
      locateFile: (file: string) => join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
    });

    this.db = new this.SQL.Database(data);
    await this.executeSchema();
    this.initialized = true;
  }

  private async executeSchema(): Promise<void> {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db!.exec(schema);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized && this.db !== null;
  }

  run(sql: string, params: any[] = []): void {
    this.checkInitialized();
    this.db!.run(sql, params);
  }

  prepare(sql: string): Statement {
    this.checkInitialized();
    return this.db!.prepare(sql);
  }

  exec(sql: string, params: any[] = []): QueryExecResult[] {
    this.checkInitialized();
    return this.db!.exec(sql, params);
  }

  getOne<T>(sql: string, params: any[] = []): T | null {
    this.checkInitialized();
    const stmt = this.db!.prepare(sql, params);
    try {
      if (stmt.step()) {
        return stmt.getAsObject() as T;
      }
      return null;
    } finally {
      stmt.free();
    }
  }

  getAll<T>(sql: string, params: any[] = []): T[] {
    this.checkInitialized();
    const stmt = this.db!.prepare(sql, params);
    const results: T[] = [];
    try {
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      return results;
    } finally {
      stmt.free();
    }
  }

  transaction<T>(callback: () => T): T {
    this.checkInitialized();
    this.db!.run('BEGIN TRANSACTION');
    try {
      const result = callback();
      this.db!.run('COMMIT');
      return result;
    } catch (error) {
      this.db!.run('ROLLBACK');
      throw error;
    }
  }

  async transactionAsync<T>(callback: () => Promise<T>): Promise<T> {
    this.checkInitialized();
    this.db!.run('BEGIN TRANSACTION');
    try {
      const result = await callback();
      this.db!.run('COMMIT');
      return result;
    } catch (error) {
      this.db!.run('ROLLBACK');
      throw error;
    }
  }

  export(): Uint8Array {
    this.checkInitialized();
    return this.db!.export();
  }

  async import(data: ArrayLike<number> | Buffer): Promise<void> {
    this.close();
    await this.init(data);
  }

  private checkInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
  }

  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    return this.transaction(() => {
      const id = uuidv4();
      const now = Date.now();

      const configId = this.upsertSimulationConfig(project.config);

      const stmt = this.prepare(
        'INSERT INTO projects (id, name, created_at, updated_at, config_id) VALUES (?, ?, ?, ?, ?)'
      );
      stmt.run([id, project.name, now, now, configId]);
      stmt.free();

      project.mapElements.forEach((element) => {
        this.createMapElement(id, element);
      });

      project.seats.forEach((seat) => {
        this.createSeat(id, seat);
      });

      return {
        ...project,
        id,
        createdAt: now,
        updatedAt: now,
      };
    });
  }

  getProject(id: string): Project | null {
    const projectRow = this.getOne<any>(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );

    if (!projectRow) return null;

    const config = this.getSimulationConfig(projectRow.config_id);
    if (!config) return null;

    const mapElements = this.getMapElementsByProjectId(id);
    const seats = this.getSeatsByProjectId(id);

    return {
      id: projectRow.id,
      name: projectRow.name,
      createdAt: projectRow.created_at,
      updatedAt: projectRow.updated_at,
      config,
      mapElements,
      seats,
    };
  }

  getAllProjects(): Project[] {
    const projectRows = this.getAll<any>('SELECT * FROM projects ORDER BY updated_at DESC');
    return projectRows
      .map((row) => this.getProject(row.id))
      .filter((p): p is Project => p !== null);
  }

  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    return this.transaction(() => {
      const existing = this.getProject(id);
      if (!existing) return null;

      const now = Date.now();
      const updatesToApply: string[] = ['updated_at = ?'];
      const params: any[] = [now];

      if (updates.name !== undefined) {
        updatesToApply.push('name = ?');
        params.push(updates.name);
      }

      if (updates.config !== undefined) {
        const configId = this.upsertSimulationConfig(updates.config);
        updatesToApply.push('config_id = ?');
        params.push(configId);
      }

      params.push(id);

      const stmt = this.prepare(
        `UPDATE projects SET ${updatesToApply.join(', ')} WHERE id = ?`
      );
      stmt.run(params);
      stmt.free();

      if (updates.mapElements !== undefined) {
        this.deleteMapElementsByProjectId(id);
        updates.mapElements.forEach((element) => {
          this.createMapElement(id, element);
        });
      }

      if (updates.seats !== undefined) {
        this.deleteSeatsByProjectId(id);
        updates.seats.forEach((seat) => {
          this.createSeat(id, seat);
        });
      }

      return this.getProject(id);
    });
  }

  deleteProject(id: string): boolean {
    const stmt = this.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    return this.db!.getRowsModified() > 0;
  }

  private createMapElement(projectId: string, element: MapElement): void {
    const stmt = this.prepare(
      'INSERT INTO map_elements (id, project_id, type, polygon, properties) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run([
      element.id,
      projectId,
      element.type,
      JSON.stringify(element.polygon),
      JSON.stringify(element.properties),
    ]);
    stmt.free();
  }

  private getMapElementsByProjectId(projectId: string): MapElement[] {
    const rows = this.getAll<any>(
      'SELECT * FROM map_elements WHERE project_id = ?',
      [projectId]
    );
    return rows.map((row) => ({
      id: row.id,
      type: row.type as MapElement['type'],
      polygon: JSON.parse(row.polygon),
      properties: JSON.parse(row.properties),
    }));
  }

  private deleteMapElementsByProjectId(projectId: string): void {
    const stmt = this.prepare('DELETE FROM map_elements WHERE project_id = ?');
    stmt.run([projectId]);
    stmt.free();
  }

  private createSeat(projectId: string, seat: Seat): void {
    const stmt = this.prepare(
      'INSERT INTO seats (id, project_id, position, capacity, occupied, group_id, reserved) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run([
      seat.id,
      projectId,
      JSON.stringify(seat.position),
      seat.capacity,
      seat.occupied,
      seat.groupId ?? null,
      seat.reserved ? 1 : 0,
    ]);
    stmt.free();
  }

  private getSeatsByProjectId(projectId: string): Seat[] {
    const rows = this.getAll<any>(
      'SELECT * FROM seats WHERE project_id = ?',
      [projectId]
    );
    return rows.map((row) => ({
      id: row.id,
      position: JSON.parse(row.position),
      capacity: row.capacity,
      occupied: row.occupied,
      groupId: row.group_id ?? undefined,
      reserved: row.reserved === 1,
    }));
  }

  private deleteSeatsByProjectId(projectId: string): void {
    const stmt = this.prepare('DELETE FROM seats WHERE project_id = ?');
    stmt.run([projectId]);
    stmt.free();
  }

  private upsertQueueTopology(topology: QueuingTopology, existingId?: string): string {
    const id = existingId || uuidv4();
    const stmt = this.prepare(
      'INSERT OR REPLACE INTO queue_topologies (id, order_queue, pickup_queue, roaming_queue) VALUES (?, ?, ?, ?)'
    );
    stmt.run([
      id,
      JSON.stringify(topology.orderQueue),
      JSON.stringify(topology.pickupQueue),
      JSON.stringify(topology.roamingQueue),
    ]);
    stmt.free();
    return id;
  }

  private getQueueTopology(id: string): QueuingTopology | null {
    const row = this.getOne<any>(
      'SELECT * FROM queue_topologies WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      orderQueue: JSON.parse(row.order_queue),
      pickupQueue: JSON.parse(row.pickup_queue),
      roamingQueue: JSON.parse(row.roaming_queue),
    };
  }

  private upsertSimulationConfig(config: SimulationConfig, existingId?: string): string {
    return this.transaction(() => {
      const id = existingId || config.id || uuidv4();
      const queuingTopologyId = this.upsertQueueTopology(config.queuingTopology);

      const stmt = this.prepare(
        `INSERT OR REPLACE INTO simulation_configs (
          id, name, map_width, map_height, queuing_topology_id,
          arrival_model, social_force, lbm_params, sir_params,
          employee_config, time_step, max_agents, anomaly_detection, deadlock_detection
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      stmt.run([
        id,
        config.name,
        config.mapWidth,
        config.mapHeight,
        queuingTopologyId,
        JSON.stringify(config.arrivalModel),
        JSON.stringify(config.socialForce),
        JSON.stringify(config.lbmParams),
        JSON.stringify(config.sirParams),
        JSON.stringify(config.employeeConfig),
        config.timeStep,
        config.maxAgents,
        config.anomalyDetection ? 1 : 0,
        config.deadlockDetection ? 1 : 0,
      ]);
      stmt.free();
      return id;
    });
  }

  private getSimulationConfig(id: string): SimulationConfig | null {
    const row = this.getOne<any>(
      'SELECT * FROM simulation_configs WHERE id = ?',
      [id]
    );
    if (!row) return null;

    const queuingTopology = this.getQueueTopology(row.queuing_topology_id);
    if (!queuingTopology) return null;

    return {
      id: row.id,
      name: row.name,
      mapWidth: row.map_width,
      mapHeight: row.map_height,
      queuingTopology,
      arrivalModel: JSON.parse(row.arrival_model),
      socialForce: JSON.parse(row.social_force),
      lbmParams: JSON.parse(row.lbm_params),
      sirParams: JSON.parse(row.sir_params),
      employeeConfig: JSON.parse(row.employee_config),
      timeStep: row.time_step,
      maxAgents: row.max_agents,
      anomalyDetection: row.anomaly_detection === 1,
      deadlockDetection: row.deadlock_detection === 1,
    };
  }

  createSIRMatrix(snapshotId: string, matrix: SIRMatrix): SIRMatrix & { id: string } {
    const id = uuidv4();
    const stmt = this.prepare(
      'INSERT INTO sir_matrices (id, snapshot_id, adjacency, agent_ids) VALUES (?, ?, ?, ?)'
    );
    stmt.run([
      id,
      snapshotId,
      JSON.stringify(matrix.adjacency),
      JSON.stringify(matrix.agentIds),
    ]);
    stmt.free();

    return { ...matrix, id };
  }

  getSIRMatrix(id: string): (SIRMatrix & { id: string }) | null {
    const row = this.getOne<any>(
      'SELECT * FROM sir_matrices WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      id: row.id,
      adjacency: JSON.parse(row.adjacency),
      agentIds: JSON.parse(row.agent_ids),
    };
  }

  getSIRMatrixBySnapshotId(snapshotId: string): (SIRMatrix & { id: string }) | null {
    const row = this.getOne<any>(
      'SELECT * FROM sir_matrices WHERE snapshot_id = ?',
      [snapshotId]
    );
    if (!row) return null;
    return {
      id: row.id,
      adjacency: JSON.parse(row.adjacency),
      agentIds: JSON.parse(row.agent_ids),
    };
  }

  deleteSIRMatrix(id: string): boolean {
    const stmt = this.prepare('DELETE FROM sir_matrices WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    return this.db!.getRowsModified() > 0;
  }

  createSnapshot(projectId: string, snapshot: Omit<QuadTreeSnapshot, 'id'>): QuadTreeSnapshot & { id: string } {
    return this.transaction(() => {
      const id = uuidv4();

      let sirMatrixId: string | null = null;

      const stmt = this.prepare(
        'INSERT INTO snapshots (id, project_id, timestamp, nodes, depth_distribution, max_depth, sir_matrix_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      stmt.run([
        id,
        projectId,
        snapshot.timestamp,
        JSON.stringify(snapshot.nodes),
        JSON.stringify(snapshot.depthDistribution),
        snapshot.maxDepth,
        sirMatrixId,
      ]);
      stmt.free();

      return { ...snapshot, id };
    });
  }

  getSnapshot(id: string): (QuadTreeSnapshot & { id: string }) | null {
    const row = this.getOne<any>(
      'SELECT * FROM snapshots WHERE id = ?',
      [id]
    );
    if (!row) return null;

    const result: QuadTreeSnapshot & { id: string } = {
      id: row.id,
      timestamp: row.timestamp,
      nodes: JSON.parse(row.nodes),
      depthDistribution: JSON.parse(row.depth_distribution),
      maxDepth: row.max_depth,
    };

    if (row.sir_matrix_id) {
      const sirMatrix = this.getSIRMatrix(row.sir_matrix_id);
      if (sirMatrix) {
        (result as any).sirMatrix = sirMatrix;
      }
    }

    return result;
  }

  getSnapshotsByProjectId(projectId: string, limit?: number): (QuadTreeSnapshot & { id: string })[] {
    let sql = 'SELECT * FROM snapshots WHERE project_id = ? ORDER BY timestamp DESC';
    const params: any[] = [projectId];

    if (limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const rows = this.getAll<any>(sql, params);
    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      nodes: JSON.parse(row.nodes),
      depthDistribution: JSON.parse(row.depth_distribution),
      maxDepth: row.max_depth,
    }));
  }

  updateSnapshot(id: string, updates: Partial<QuadTreeSnapshot>): (QuadTreeSnapshot & { id: string }) | null {
    return this.transaction(() => {
      const existing = this.getSnapshot(id);
      if (!existing) return null;

      const updatesToApply: string[] = [];
      const params: any[] = [];

      if (updates.timestamp !== undefined) {
        updatesToApply.push('timestamp = ?');
        params.push(updates.timestamp);
      }
      if (updates.nodes !== undefined) {
        updatesToApply.push('nodes = ?');
        params.push(JSON.stringify(updates.nodes));
      }
      if (updates.depthDistribution !== undefined) {
        updatesToApply.push('depth_distribution = ?');
        params.push(JSON.stringify(updates.depthDistribution));
      }
      if (updates.maxDepth !== undefined) {
        updatesToApply.push('max_depth = ?');
        params.push(updates.maxDepth);
      }

      if (updatesToApply.length === 0) return existing;

      params.push(id);

      const stmt = this.prepare(
        `UPDATE snapshots SET ${updatesToApply.join(', ')} WHERE id = ?`
      );
      stmt.run(params);
      stmt.free();

      return this.getSnapshot(id);
    });
  }

  deleteSnapshot(id: string): boolean {
    const stmt = this.prepare('DELETE FROM snapshots WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    return this.db!.getRowsModified() > 0;
  }

  createEventLog(projectId: string, event: Omit<EventLog, 'id'>): EventLog {
    const id = uuidv4();
    const stmt = this.prepare(
      'INSERT INTO event_logs (id, project_id, timestamp, event_type, payload) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run([
      id,
      projectId,
      event.timestamp,
      event.eventType,
      JSON.stringify(event.payload),
    ]);
    stmt.free();

    return { ...event, id };
  }

  getEventLog(id: string): EventLog | null {
    const row = this.getOne<any>(
      'SELECT * FROM event_logs WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return {
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      payload: JSON.parse(row.payload),
    };
  }

  getEventLogsByProjectId(
    projectId: string,
    options?: { eventType?: string; startTime?: number; endTime?: number; limit?: number }
  ): EventLog[] {
    let sql = 'SELECT * FROM event_logs WHERE project_id = ?';
    const params: any[] = [projectId];

    if (options?.eventType !== undefined) {
      sql += ' AND event_type = ?';
      params.push(options.eventType);
    }
    if (options?.startTime !== undefined) {
      sql += ' AND timestamp >= ?';
      params.push(options.startTime);
    }
    if (options?.endTime !== undefined) {
      sql += ' AND timestamp <= ?';
      params.push(options.endTime);
    }

    sql += ' ORDER BY timestamp DESC';

    if (options?.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.getAll<any>(sql, params);
    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      payload: JSON.parse(row.payload),
    }));
  }

  deleteEventLog(id: string): boolean {
    const stmt = this.prepare('DELETE FROM event_logs WHERE id = ?');
    stmt.run([id]);
    stmt.free();
    return this.db!.getRowsModified() > 0;
  }

  deleteEventLogsByProjectId(projectId: string): number {
    const stmt = this.prepare('DELETE FROM event_logs WHERE project_id = ?');
    stmt.run([projectId]);
    stmt.free();
    return this.db!.getRowsModified();
  }
}
