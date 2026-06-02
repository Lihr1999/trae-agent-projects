import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ProjectRecord, DiffRecord } from './database.interfaces';

const initSqlJs = require('sql.js');

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private db: any;
  private dbPath: string;
  private saveTimer: NodeJS.Timeout | null = null;

  async onModuleInit() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.dbPath = path.join(dataDir, 'ast-3d-viz.db');

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run('PRAGMA foreign_keys = ON;');

    this.createTables();
    this.logger.log(`Database initialized at ${this.dbPath}`);

    this.saveTimer = setInterval(() => this.persist(), 30000);
  }

  onModuleDestroy() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    this.persist();
  }

  private persist(): void {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      this.logger.error(`Failed to persist database: ${error.message}`);
    }
  }

  private createTables(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_code TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'javascript',
        ast_cache TEXT,
        layout_cache TEXT,
        layout_params TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS diffs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_a TEXT NOT NULL,
        source_b TEXT NOT NULL,
        result TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);

    this.db.run(`CREATE INDEX IF NOT EXISTS idx_diffs_project_id ON diffs(project_id);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_diffs_timestamp ON diffs(timestamp);`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);`);

    this.persist();
  }

  saveProject(project: {
    name: string;
    source_code: string;
    language: string;
    ast_cache?: any;
    layout_cache?: any;
    layout_params?: any;
  }): ProjectRecord {
    const id = uuidv4();
    const now = new Date().toISOString();

    const astCache = project.ast_cache ? JSON.stringify(project.ast_cache) : null;
    const layoutCache = project.layout_cache ? JSON.stringify(project.layout_cache) : null;
    const layoutParams = project.layout_params ? JSON.stringify(project.layout_params) : null;

    this.db.run(
      `INSERT INTO projects (id, name, source_code, language, ast_cache, layout_cache, layout_params, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project.name, project.source_code, project.language, astCache, layoutCache, layoutParams, now, now],
    );

    this.persist();
    return this.getProject(id)!;
  }

  getProject(id: string): ProjectRecord | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row as unknown as ProjectRecord;
    }
    stmt.free();
    return null;
  }

  updateProject(id: string, updates: Partial<Pick<ProjectRecord, 'name' | 'source_code' | 'language' | 'ast_cache' | 'layout_cache' | 'layout_params'>>): ProjectRecord | null {
    const existing = this.getProject(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.source_code !== undefined) { fields.push('source_code = ?'); values.push(updates.source_code); }
    if (updates.language !== undefined) { fields.push('language = ?'); values.push(updates.language); }
    if (updates.ast_cache !== undefined) { fields.push('ast_cache = ?'); values.push(JSON.stringify(updates.ast_cache)); }
    if (updates.layout_cache !== undefined) { fields.push('layout_cache = ?'); values.push(JSON.stringify(updates.layout_cache)); }
    if (updates.layout_params !== undefined) { fields.push('layout_params = ?'); values.push(JSON.stringify(updates.layout_params)); }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    if (fields.length > 1) {
      this.db.run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
      this.persist();
    }

    return this.getProject(id);
  }

  listProjects(limit = 50, offset = 0): ProjectRecord[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC LIMIT ? OFFSET ?');
    stmt.bind([limit, offset]);
    const results: ProjectRecord[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as ProjectRecord);
    }
    stmt.free();
    return results;
  }

  deleteProject(id: string): boolean {
    this.db.run('DELETE FROM projects WHERE id = ?', [id]);
    this.persist();
    return true;
  }

  saveDiff(diff: {
    project_id: string;
    source_a: string;
    source_b: string;
    result: any;
  }): DiffRecord {
    const id = uuidv4();
    const now = new Date().toISOString();

    this.db.run(
      `INSERT INTO diffs (id, project_id, source_a, source_b, result, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, diff.project_id, diff.source_a, diff.source_b, JSON.stringify(diff.result), now],
    );

    this.persist();
    return this.getDiff(id)!;
  }

  getDiff(id: string): DiffRecord | null {
    const stmt = this.db.prepare('SELECT * FROM diffs WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row as unknown as DiffRecord;
    }
    stmt.free();
    return null;
  }

  getDiffHistory(projectId: string, limit = 50): DiffRecord[] {
    const stmt = this.db.prepare('SELECT * FROM diffs WHERE project_id = ? ORDER BY timestamp DESC LIMIT ?');
    stmt.bind([projectId, limit]);
    const results: DiffRecord[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as DiffRecord);
    }
    stmt.free();
    return results;
  }

  deleteDiff(id: string): boolean {
    this.db.run('DELETE FROM diffs WHERE id = ?', [id]);
    this.persist();
    return true;
  }
}
