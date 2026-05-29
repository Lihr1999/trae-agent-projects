import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { Project, OperationLog, Material, LightSource, KaleidoscopeConfig } from '../types';

const DB_PATH = path.join(__dirname, '../../data/kaleidoscope.db');

export class DatabaseService {
  private db: Database | null = null;

  async initialize(): Promise<void> {
    const SQL = await initSqlJs({
      locateFile: (file: string) => path.join(__dirname, '../../node_modules/sql.js/dist', file)
    });

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
      this.createTables();
    }
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        config TEXT NOT NULL,
        csg_tree TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        previous_hash TEXT,
        hash TEXT NOT NULL,
        project_id TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS materials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        refractive_index REAL NOT NULL,
        dispersion_coefficient REAL NOT NULL,
        subsurface_scattering REAL NOT NULL,
        anisotropy REAL NOT NULL,
        color_r REAL NOT NULL,
        color_g REAL NOT NULL,
        color_b REAL NOT NULL,
        absorption REAL NOT NULL,
        roughness REAL NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS light_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        position_z REAL NOT NULL,
        spectrum TEXT NOT NULL,
        polarization_angle REAL NOT NULL,
        polarization_ellipticity REAL NOT NULL,
        intensity REAL NOT NULL,
        type TEXT NOT NULL
      )
    `);

    this.saveDatabase();
  }

  private saveDatabase(): void {
    if (!this.db) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, buffer);
  }

  async saveProject(project: Project): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.db.exec('SELECT id FROM projects WHERE id = ?', [project.id]);
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      this.db.run(
        'UPDATE projects SET name = ?, updated_at = ?, config = ?, csg_tree = ? WHERE id = ?',
        [project.name, project.updatedAt, JSON.stringify(project.config), JSON.stringify(project.csgTree), project.id]
      );
    } else {
      this.db.run(
        'INSERT INTO projects (id, name, created_at, updated_at, config, csg_tree) VALUES (?, ?, ?, ?, ?, ?)',
        [project.id, project.name, project.createdAt, project.updatedAt, JSON.stringify(project.config), JSON.stringify(project.csgTree)]
      );
    }
    
    this.saveDatabase();
  }

  async getProject(id: string): Promise<Project | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT * FROM projects WHERE id = ?', [id]);
    
    if (result.length === 0 || result[0].values.length === 0) return null;

    const row = result[0].values[0];
    return {
      id: row[0] as string,
      name: row[1] as string,
      createdAt: row[2] as string,
      updatedAt: row[3] as string,
      config: JSON.parse(row[4] as string),
      csgTree: JSON.parse(row[5] as string)
    };
  }

  async getAllProjects(): Promise<Project[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT * FROM projects ORDER BY updated_at DESC');
    
    if (result.length === 0) return [];

    return result[0].values.map(row => ({
      id: row[0] as string,
      name: row[1] as string,
      createdAt: row[2] as string,
      updatedAt: row[3] as string,
      config: JSON.parse(row[4] as string),
      csgTree: JSON.parse(row[5] as string)
    }));
  }

  async deleteProject(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run('DELETE FROM operation_logs WHERE project_id = ?', [id]);
    this.db.run('DELETE FROM projects WHERE id = ?', [id]);
    this.saveDatabase();
  }

  async addOperationLog(projectId: string, log: OperationLog): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(
      'INSERT INTO operation_logs (id, timestamp, type, payload, previous_hash, hash, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [log.id, log.timestamp, log.type, JSON.stringify(log.payload), log.previousHash, log.hash, projectId]
    );
    
    this.saveDatabase();
  }

  async getOperationLogs(projectId: string): Promise<OperationLog[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(
      'SELECT * FROM operation_logs WHERE project_id = ? ORDER BY timestamp DESC',
      [projectId]
    );
    
    if (result.length === 0) return [];

    return result[0].values.map(row => ({
      id: row[0] as string,
      timestamp: row[1] as string,
      type: row[2] as string,
      payload: JSON.parse(row[3] as string),
      previousHash: row[4] as string,
      hash: row[5] as string
    }));
  }

  async saveMaterial(material: Material): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.db.exec('SELECT id FROM materials WHERE id = ?', [material.id]);
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      this.db.run(
        `UPDATE materials SET 
          name = ?, refractive_index = ?, dispersion_coefficient = ?, 
          subsurface_scattering = ?, anisotropy = ?, 
          color_r = ?, color_g = ?, color_b = ?, 
          absorption = ?, roughness = ? 
         WHERE id = ?`,
        [material.name, material.refractiveIndex, material.dispersionCoefficient,
         material.subsurfaceScattering, material.anisotropy,
         material.color.r, material.color.g, material.color.b,
         material.absorption, material.roughness, material.id]
      );
    } else {
      this.db.run(
        `INSERT INTO materials 
          (id, name, refractive_index, dispersion_coefficient, 
           subsurface_scattering, anisotropy, 
           color_r, color_g, color_b, absorption, roughness) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [material.id, material.name, material.refractiveIndex, material.dispersionCoefficient,
         material.subsurfaceScattering, material.anisotropy,
         material.color.r, material.color.g, material.color.b,
         material.absorption, material.roughness]
      );
    }
    
    this.saveDatabase();
  }

  async getAllMaterials(): Promise<Material[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT * FROM materials');
    
    if (result.length === 0) return [];

    return result[0].values.map(row => ({
      id: row[0] as string,
      name: row[1] as string,
      refractiveIndex: row[2] as number,
      dispersionCoefficient: row[3] as number,
      subsurfaceScattering: row[4] as number,
      anisotropy: row[5] as number,
      color: { r: row[6] as number, g: row[7] as number, b: row[8] as number },
      absorption: row[9] as number,
      roughness: row[10] as number
    }));
  }

  async saveLightSource(light: LightSource): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.db.exec('SELECT id FROM light_sources WHERE id = ?', [light.id]);
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      this.db.run(
        `UPDATE light_sources SET 
          name = ?, position_x = ?, position_y = ?, position_z = ?, 
          spectrum = ?, polarization_angle = ?, polarization_ellipticity = ?, 
          intensity = ?, type = ? 
         WHERE id = ?`,
        [light.name, light.position.x, light.position.y, light.position.z || 0,
         JSON.stringify(light.spectrum), light.polarization.angle, light.polarization.ellipticity,
         light.intensity, light.type, light.id]
      );
    } else {
      this.db.run(
        `INSERT INTO light_sources 
          (id, name, position_x, position_y, position_z, 
           spectrum, polarization_angle, polarization_ellipticity, 
           intensity, type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [light.id, light.name, light.position.x, light.position.y, light.position.z || 0,
         JSON.stringify(light.spectrum), light.polarization.angle, light.polarization.ellipticity,
         light.intensity, light.type]
      );
    }
    
    this.saveDatabase();
  }

  async getAllLightSources(): Promise<LightSource[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec('SELECT * FROM light_sources');
    
    if (result.length === 0) return [];

    return result[0].values.map(row => ({
      id: row[0] as string,
      name: row[1] as string,
      position: { x: row[2] as number, y: row[3] as number, z: row[4] as number },
      spectrum: JSON.parse(row[5] as string),
      polarization: { angle: row[6] as number, ellipticity: row[7] as number },
      intensity: row[8] as number,
      type: row[9] as 'point' | 'directional' | 'spot'
    }));
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const dbService = new DatabaseService();
