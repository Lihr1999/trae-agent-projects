import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';
import type { Polygon, Project, SizeConfig, MarkerResult } from '../types';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;

async function initSql(): Promise<SqlJsStatic> {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => path.join(__dirname, '../../node_modules/sql.js/dist', file)
    });
  }
  return SQL;
}

export async function initDatabase(): Promise<Database> {
  const SQL = await initSql();
  const dbPath = path.join(__dirname, '../../data/garment-pattern.db');
  
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let dbData: Buffer | null = null;
  if (fs.existsSync(dbPath)) {
    dbData = fs.readFileSync(dbPath);
  }

  db = dbData ? new SQL.Database(dbData) : new SQL.Database();

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      fabric_width REAL NOT NULL DEFAULT 150,
      fabric_height REAL NOT NULL DEFAULT 200,
      marker_result TEXT
    );

    CREATE TABLE IF NOT EXISTS polygons (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      points TEXT NOT NULL,
      grain_angle REAL NOT NULL DEFAULT 0,
      rotation REAL NOT NULL DEFAULT 0,
      position_x REAL NOT NULL DEFAULT 0,
      position_y REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#3498db',
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS size_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parameters TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_polygons_project_id ON polygons(project_id);
  `);

  saveDatabase();

  return db;
}

export function saveDatabase(): void {
  if (!db) return;
  const dbPath = path.join(__dirname, '../../data/garment-pattern.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    return await initDatabase();
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

export async function createProject(project: Omit<Project, 'createdAt' | 'updatedAt'>): Promise<Project> {
  const database = await getDatabase();
  const now = Date.now();
  
  database.run(`
    INSERT INTO projects (id, name, created_at, updated_at, fabric_width, fabric_height, marker_result)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    project.id,
    project.name,
    now,
    now,
    project.fabricWidth,
    project.fabricHeight,
    project.markerResult ? JSON.stringify(project.markerResult) : null
  ]);

  for (const polygon of project.polygons) {
    database.run(`
      INSERT INTO polygons (id, project_id, name, points, grain_angle, rotation, position_x, position_y, color, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      polygon.id,
      project.id,
      polygon.name,
      JSON.stringify(polygon.points),
      polygon.grainAngle,
      polygon.rotation,
      polygon.position.x,
      polygon.position.y,
      polygon.color,
      polygon.quantity
    ]);
  }

  saveDatabase();

  return {
    ...project,
    createdAt: now,
    updatedAt: now
  };
}

export async function getProject(id: string): Promise<Project | null> {
  const database = await getDatabase();
  
  const projectRow = database.exec(`SELECT * FROM projects WHERE id = '${id}'`);
  if (projectRow.length === 0 || projectRow[0].values.length === 0) return null;

  const projectValues = projectRow[0].values[0];
  const projectColumns = projectRow[0].columns;
  const projectData: Record<string, any> = {};
  projectColumns.forEach((col, i) => {
    projectData[col] = projectValues[i];
  });

  const polygonRows = database.exec(`SELECT * FROM polygons WHERE project_id = '${id}'`);
  const polygons: Polygon[] = [];
  
  if (polygonRows.length > 0) {
    const polyColumns = polygonRows[0].columns;
    for (const row of polygonRows[0].values) {
      const polyData: Record<string, any> = {};
      polyColumns.forEach((col, i) => {
        polyData[col] = row[i];
      });
      polygons.push({
        id: polyData.id as string,
        name: polyData.name as string,
        points: JSON.parse(polyData.points as string),
        grainAngle: polyData.grain_angle as number,
        rotation: polyData.rotation as number,
        position: { x: polyData.position_x as number, y: polyData.position_y as number },
        color: polyData.color as string,
        quantity: polyData.quantity as number
      });
    }
  }

  return {
    id: projectData.id as string,
    name: projectData.name as string,
    createdAt: projectData.created_at as number,
    updatedAt: projectData.updated_at as number,
    polygons,
    markerResult: projectData.marker_result ? JSON.parse(projectData.marker_result as string) : undefined,
    fabricWidth: projectData.fabric_width as number,
    fabricHeight: projectData.fabric_height as number
  };
}

export async function updateProject(project: Project): Promise<void> {
  const database = await getDatabase();
  const now = Date.now();
  
  database.run(`
    UPDATE projects 
    SET name = ?, updated_at = ?, fabric_width = ?, fabric_height = ?, marker_result = ?
    WHERE id = ?
  `, [
    project.name,
    now,
    project.fabricWidth,
    project.fabricHeight,
    project.markerResult ? JSON.stringify(project.markerResult) : null,
    project.id
  ]);

  database.run('DELETE FROM polygons WHERE project_id = ?', [project.id]);

  for (const polygon of project.polygons) {
    database.run(`
      INSERT INTO polygons (id, project_id, name, points, grain_angle, rotation, position_x, position_y, color, quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      polygon.id,
      project.id,
      polygon.name,
      JSON.stringify(polygon.points),
      polygon.grainAngle,
      polygon.rotation,
      polygon.position.x,
      polygon.position.y,
      polygon.color,
      polygon.quantity
    ]);
  }

  saveDatabase();
}

export async function deleteProject(id: string): Promise<void> {
  const database = await getDatabase();
  database.run('DELETE FROM projects WHERE id = ?', [id]);
  saveDatabase();
}

export async function listProjects(): Promise<Array<{ id: string; name: string; createdAt: number; updatedAt: number }>> {
  const database = await getDatabase();
  const result = database.exec(`
    SELECT id, name, created_at, updated_at 
    FROM projects 
    ORDER BY updated_at DESC
  `);

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const data: Record<string, any> = {};
    columns.forEach((col, i) => {
      data[col] = row[i];
    });
    return {
      id: data.id as string,
      name: data.name as string,
      createdAt: data.created_at as number,
      updatedAt: data.updated_at as number
    };
  });
}

export async function saveSizeConfig(config: SizeConfig): Promise<void> {
  const database = await getDatabase();
  
  database.run(`
    INSERT OR REPLACE INTO size_configs (id, name, parameters)
    VALUES (?, ?, ?)
  `, [config.id, config.name, JSON.stringify(config.parameters)]);
  
  saveDatabase();
}

export async function getSizeConfig(id: string): Promise<SizeConfig | null> {
  const database = await getDatabase();
  const result = database.exec(`SELECT * FROM size_configs WHERE id = '${id}'`);
  
  if (result.length === 0 || result[0].values.length === 0) return null;
  
  const columns = result[0].columns;
  const row = result[0].values[0];
  const data: Record<string, any> = {};
  columns.forEach((col, i) => {
    data[col] = row[i];
  });
  
  return {
    id: data.id as string,
    name: data.name as string,
    parameters: JSON.parse(data.parameters as string)
  };
}

export async function listSizeConfigs(): Promise<SizeConfig[]> {
  const database = await getDatabase();
  const result = database.exec('SELECT * FROM size_configs ORDER BY name');
  
  if (result.length === 0) return [];
  
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const data: Record<string, any> = {};
    columns.forEach((col, i) => {
      data[col] = row[i];
    });
    return {
      id: data.id as string,
      name: data.name as string,
      parameters: JSON.parse(data.parameters as string)
    };
  });
}

export async function saveMarkerResult(projectId: string, markerResult: MarkerResult): Promise<void> {
  const database = await getDatabase();
  
  database.run(`
    UPDATE projects 
    SET marker_result = ?, updated_at = ?
    WHERE id = ?
  `, [JSON.stringify(markerResult), Date.now(), projectId]);
  
  saveDatabase();
}
