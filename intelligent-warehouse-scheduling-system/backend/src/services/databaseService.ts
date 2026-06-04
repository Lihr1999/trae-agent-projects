import type { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type {
  Floor,
  Rack,
  Location,
  SKU,
  Order,
  Wave,
  Robot,
  Task,
  Exception,
  LogEntry,
} from '../types';

export class DatabaseService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private now(): string {
    return new Date().toISOString();
  }

  public getFloors(): Floor[] {
    return this.db.prepare('SELECT * FROM floors ORDER BY level').all() as Floor[];
  }

  public getFloorById(id: string): Floor | undefined {
    return this.db.prepare('SELECT * FROM floors WHERE id = ?').get(id) as Floor;
  }

  public createFloor(data: Omit<Floor, 'id' | 'createdAt' | 'updatedAt'>): Floor {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO floors (id, name, level, width, height, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, data.name, data.level, data.width, data.height, now, now);
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateFloor(id: string, data: Partial<Floor>): Floor | undefined {
    const now = this.now();
    const floor = this.getFloorById(id);
    if (!floor) return undefined;

    const updated = { ...floor, ...data, updatedAt: now };
    this.db
      .prepare('UPDATE floors SET name = ?, level = ?, width = ?, height = ?, updated_at = ? WHERE id = ?')
      .run(updated.name, updated.level, updated.width, updated.height, now, id);
    return updated;
  }

  public deleteFloor(id: string): boolean {
    const result = this.db.prepare('DELETE FROM floors WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public getRacks(floorId?: string): Rack[] {
    if (floorId) {
      return this.db.prepare('SELECT * FROM racks WHERE floor_id = ?').all(floorId) as Rack[];
    }
    return this.db.prepare('SELECT * FROM racks').all() as Rack[];
  }

  public getRackById(id: string): Rack | undefined {
    return this.db.prepare('SELECT * FROM racks WHERE id = ?').get(id) as Rack;
  }

  public createRack(data: Omit<Rack, 'id' | 'createdAt' | 'updatedAt'>): Rack {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO racks (id, floor_id, name, x, y, width, height, rows, columns, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.floorId,
        data.name,
        data.x,
        data.y,
        data.width,
        data.height,
        data.rows,
        data.columns,
        now,
        now
      );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateRack(id: string, data: Partial<Rack>): Rack | undefined {
    const now = this.now();
    const rack = this.getRackById(id);
    if (!rack) return undefined;

    const updated = { ...rack, ...data, updatedAt: now };
    this.db
      .prepare(
        'UPDATE racks SET floor_id = ?, name = ?, x = ?, y = ?, width = ?, height = ?, rows = ?, columns = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        updated.floorId,
        updated.name,
        updated.x,
        updated.y,
        updated.width,
        updated.height,
        updated.rows,
        updated.columns,
        now,
        id
      );
    return updated;
  }

  public deleteRack(id: string): boolean {
    const result = this.db.prepare('DELETE FROM racks WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public getLocations(rackId?: string): Location[] {
    if (rackId) {
      return this.db.prepare('SELECT * FROM locations WHERE rack_id = ?').all(rackId) as Location[];
    }
    return this.db.prepare('SELECT * FROM locations').all() as Location[];
  }

  public getLocationById(id: string): Location | undefined {
    return this.db.prepare('SELECT * FROM locations WHERE id = ?').get(id) as Location;
  }

  public createLocation(data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Location {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO locations (id, rack_id, code, row, column, level, status, sku_id, quantity, max_quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.rackId,
        data.code,
        data.row,
        data.column,
        data.level,
        data.status,
        data.skuId || null,
        data.quantity,
        data.maxQuantity,
        now,
        now
      );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateLocation(id: string, data: Partial<Location>): Location | undefined {
    const now = this.now();
    const location = this.getLocationById(id);
    if (!location) return undefined;

    const updated = { ...location, ...data, updatedAt: now };
    this.db
      .prepare(
        'UPDATE locations SET rack_id = ?, code = ?, row = ?, column = ?, level = ?, status = ?, sku_id = ?, quantity = ?, max_quantity = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        updated.rackId,
        updated.code,
        updated.row,
        updated.column,
        updated.level,
        updated.status,
        updated.skuId || null,
        updated.quantity,
        updated.maxQuantity,
        now,
        id
      );
    return updated;
  }

  public deleteLocation(id: string): boolean {
    const result = this.db.prepare('DELETE FROM locations WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public getSKUs(): SKU[] {
    return this.db.prepare('SELECT * FROM skus').all() as SKU[];
  }

  public getSKUById(id: string): SKU | undefined {
    return this.db.prepare('SELECT * FROM skus WHERE id = ?').get(id) as SKU;
  }

  public createSKU(data: Omit<SKU, 'id' | 'createdAt' | 'updatedAt'>): SKU {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO skus (id, code, name, category, weight, volume, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, data.code, data.name, data.category, data.weight, data.volume, now, now);
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateSKU(id: string, data: Partial<SKU>): SKU | undefined {
    const now = this.now();
    const sku = this.getSKUById(id);
    if (!sku) return undefined;

    const updated = { ...sku, ...data, updatedAt: now };
    this.db
      .prepare('UPDATE skus SET code = ?, name = ?, category = ?, weight = ?, volume = ?, updated_at = ? WHERE id = ?')
      .run(updated.code, updated.name, updated.category, updated.weight, updated.volume, now, id);
    return updated;
  }

  public deleteSKU(id: string): boolean {
    const result = this.db.prepare('DELETE FROM skus WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public getOrders(status?: Order['status']): Order[] {
    let sql = 'SELECT * FROM orders';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => ({
      ...row,
      items: JSON.parse(row.items),
    }));
  }

  public getOrderById(id: string): Order | undefined {
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      items: JSON.parse(row.items),
    };
  }

  public createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO orders (id, order_no, priority, status, items, wave_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.orderNo,
        data.priority,
        data.status,
        JSON.stringify(data.items),
        data.waveId || null,
        now,
        now
      );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateOrder(id: string, data: Partial<Order>): Order | undefined {
    const now = this.now();
    const order = this.getOrderById(id);
    if (!order) return undefined;

    const updated = { ...order, ...data, updatedAt: now };
    this.db
      .prepare(
        'UPDATE orders SET order_no = ?, priority = ?, status = ?, items = ?, wave_id = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        updated.orderNo,
        updated.priority,
        updated.status,
        JSON.stringify(updated.items),
        updated.waveId || null,
        now,
        id
      );
    return updated;
  }

  public deleteOrder(id: string): boolean {
    const result = this.db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public getWaves(): Wave[] {
    const rows = this.db.prepare('SELECT * FROM waves ORDER BY created_at DESC').all() as any[];
    return rows.map((row) => ({
      ...row,
      orderIds: JSON.parse(row.order_ids),
      robotIds: JSON.parse(row.robot_ids),
    }));
  }

  public getWaveById(id: string): Wave | undefined {
    const row = this.db.prepare('SELECT * FROM waves WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      orderIds: JSON.parse(row.order_ids),
      robotIds: JSON.parse(row.robot_ids),
    };
  }

  public createWave(data: Omit<Wave, 'id' | 'createdAt' | 'updatedAt'>): Wave {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO waves (id, wave_no, status, order_ids, robot_ids, priority, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.waveNo,
        data.status,
        JSON.stringify(data.orderIds),
        JSON.stringify(data.robotIds),
        data.priority,
        data.startedAt || null,
        data.completedAt || null,
        now,
        now
      );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateWave(id: string, data: Partial<Wave>): Wave | undefined {
    const now = this.now();
    const wave = this.getWaveById(id);
    if (!wave) return undefined;

    const updated = { ...wave, ...data, updatedAt: now };
    this.db
      .prepare(
        'UPDATE waves SET wave_no = ?, status = ?, order_ids = ?, robot_ids = ?, priority = ?, started_at = ?, completed_at = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        updated.waveNo,
        updated.status,
        JSON.stringify(updated.orderIds),
        JSON.stringify(updated.robotIds),
        updated.priority,
        updated.startedAt || null,
        updated.completedAt || null,
        now,
        id
      );
    return updated;
  }

  public deleteWave(id: string): boolean {
    const result = this.db.prepare('DELETE FROM waves WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public getRobots(floorId?: string): Robot[] {
    let sql = 'SELECT * FROM robots';
    const params: any[] = [];
    if (floorId) {
      sql += ' WHERE floor_id = ?';
      params.push(floorId);
    }
    return this.db.prepare(sql).all(...params) as Robot[];
  }

  public getRobotById(id: string): Robot | undefined {
    return this.db.prepare('SELECT * FROM robots WHERE id = ?').get(id) as Robot;
  }

  public createRobot(data: Omit<Robot, 'id' | 'createdAt' | 'updatedAt'>): Robot {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO robots (id, name, floor_id, status, x, y, target_x, target_y, battery, current_task_id, speed, capacity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.name,
        data.floorId,
        data.status,
        data.x,
        data.y,
        data.targetX || null,
        data.targetY || null,
        data.battery,
        data.currentTaskId || null,
        data.speed,
        data.capacity,
        now,
        now
      );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateRobot(id: string, data: Partial<Robot>): Robot | undefined {
    const now = this.now();
    const robot = this.getRobotById(id);
    if (!robot) return undefined;

    const updated = { ...robot, ...data, updatedAt: now };
    this.db
      .prepare(
        'UPDATE robots SET name = ?, floor_id = ?, status = ?, x = ?, y = ?, target_x = ?, target_y = ?, battery = ?, current_task_id = ?, speed = ?, capacity = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        updated.name,
        updated.floorId,
        updated.status,
        updated.x,
        updated.y,
        updated.targetX || null,
        updated.targetY || null,
        updated.battery,
        updated.currentTaskId || null,
        updated.speed,
        updated.capacity,
        now,
        id
      );
    return updated;
  }

  public deleteRobot(id: string): boolean {
    const result = this.db.prepare('DELETE FROM robots WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public getTasks(status?: Task['status'], waveId?: string): Task[] {
    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (waveId) {
      conditions.push('wave_id = ?');
      params.push(waveId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY priority DESC, created_at';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => ({
      ...row,
      path: row.path ? JSON.parse(row.path) : undefined,
    }));
  }

  public getTaskById(id: string): Task | undefined {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      path: row.path ? JSON.parse(row.path) : undefined,
    };
  }

  public createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO tasks (id, wave_id, order_id, robot_id, type, status, from_location_id, to_location_id, sku_id, quantity, priority, path, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.waveId || null,
        data.orderId || null,
        data.robotId || null,
        data.type,
        data.status,
        data.fromLocationId || null,
        data.toLocationId || null,
        data.skuId || null,
        data.quantity,
        data.priority,
        data.path ? JSON.stringify(data.path) : null,
        data.startedAt || null,
        data.completedAt || null,
        now,
        now
      );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateTask(id: string, data: Partial<Task>): Task | undefined {
    const now = this.now();
    const task = this.getTaskById(id);
    if (!task) return undefined;

    const updated = { ...task, ...data, updatedAt: now };
    this.db
      .prepare(
        'UPDATE tasks SET wave_id = ?, order_id = ?, robot_id = ?, type = ?, status = ?, from_location_id = ?, to_location_id = ?, sku_id = ?, quantity = ?, priority = ?, path = ?, started_at = ?, completed_at = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        updated.waveId || null,
        updated.orderId || null,
        updated.robotId || null,
        updated.type,
        updated.status,
        updated.fromLocationId || null,
        updated.toLocationId || null,
        updated.skuId || null,
        updated.quantity,
        updated.priority,
        updated.path ? JSON.stringify(updated.path) : null,
        updated.startedAt || null,
        updated.completedAt || null,
        now,
        id
      );
    return updated;
  }

  public deleteTask(id: string): boolean {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public getExceptions(status?: Exception['status']): Exception[] {
    let sql = 'SELECT * FROM exceptions';
    const params: any[] = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }

  public getExceptionById(id: string): Exception | undefined {
    const row = this.db.prepare('SELECT * FROM exceptions WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      details: row.details ? JSON.parse(row.details) : undefined,
    };
  }

  public createException(data: Omit<Exception, 'id' | 'createdAt' | 'updatedAt'>): Exception {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO exceptions (id, type, severity, status, message, details, related_id, related_type, handled_by, resolution, resolved_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.type,
        data.severity,
        data.status,
        data.message,
        data.details ? JSON.stringify(data.details) : null,
        data.relatedId || null,
        data.relatedType || null,
        data.handledBy || null,
        data.resolution || null,
        data.resolvedAt || null,
        now,
        now
      );
    return { ...data, id, createdAt: now, updatedAt: now };
  }

  public updateException(id: string, data: Partial<Exception>): Exception | undefined {
    const now = this.now();
    const exception = this.getExceptionById(id);
    if (!exception) return undefined;

    const updated = { ...exception, ...data, updatedAt: now };
    this.db
      .prepare(
        'UPDATE exceptions SET type = ?, severity = ?, status = ?, message = ?, details = ?, related_id = ?, related_type = ?, handled_by = ?, resolution = ?, resolved_at = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        updated.type,
        updated.severity,
        updated.status,
        updated.message,
        updated.details ? JSON.stringify(updated.details) : null,
        updated.relatedId || null,
        updated.relatedType || null,
        updated.handledBy || null,
        updated.resolution || null,
        updated.resolvedAt || null,
        now,
        id
      );
    return updated;
  }

  public getLogs(limit: number = 100): LogEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map((row) => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }

  public createLog(data: Omit<LogEntry, 'id' | 'createdAt'>): LogEntry {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO logs (id, type, level, message, details, related_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        id,
        data.type,
        data.level,
        data.message,
        data.details ? JSON.stringify(data.details) : null,
        data.relatedId || null,
        now
      );
    return { ...data, id, createdAt: now };
  }

  public createCongestionPoint(
    data: Omit<{ id: string; x: number; y: number; floorId: string; severity: string; robotCount: number; createdAt: string }, 'id' | 'createdAt'>
  ): void {
    const id = uuidv4();
    const now = this.now();
    this.db
      .prepare(
        'INSERT INTO congestion_points (id, x, y, floor_id, severity, robot_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(id, data.x, data.y, data.floorId, data.severity, data.robotCount, now);
  }
}
