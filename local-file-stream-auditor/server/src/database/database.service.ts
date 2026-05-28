import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: DatabaseSync;

  onModuleInit() {
    const dbPath = path.join(__dirname, '../../data/auditor.db');
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.initializeTables();
  }

  private initializeTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER,
        row_count INTEGER,
        format TEXT,
        encoding TEXT,
        status TEXT DEFAULT 'processing',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS field_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        field_name TEXT,
        type TEXT,
        null_count INTEGER DEFAULT 0,
        unique_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        distribution TEXT,
        FOREIGN KEY (file_id) REFERENCES files(id)
      );

      CREATE TABLE IF NOT EXISTS anomaly_rows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        row_index INTEGER,
        anomaly_type TEXT,
        field_name TEXT,
        expected TEXT,
        actual TEXT,
        message TEXT,
        FOREIGN KEY (file_id) REFERENCES files(id)
      );

      CREATE TABLE IF NOT EXISTS rule_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        rules TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS parse_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        chunk_index INTEGER,
        start_row INTEGER,
        end_row INTEGER,
        row_count INTEGER,
        anomaly_count INTEGER,
        data TEXT,
        FOREIGN KEY (file_id) REFERENCES files(id)
      );

      CREATE TABLE IF NOT EXISTS audit_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id INTEGER,
        total_rows INTEGER,
        total_anomalies INTEGER,
        anomaly_types TEXT,
        field_summary TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id)
      );
    `);

    this.insertDefaultRuleTemplates();
  }

  private insertDefaultRuleTemplates() {
    const checkStmt = this.db.prepare('SELECT COUNT(*) as count FROM rule_templates');
    const result = checkStmt.get() as { count: number };
    if (result.count === 0) {
      const defaultRules = [
        {
          name: 'default',
          rules: JSON.stringify([
            { field: 'id', type: 'number', required: true, unique: true },
            { field: 'name', type: 'string', required: true },
            { field: 'email', type: 'string', required: false, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
            { field: 'age', type: 'number', required: false, min: 0, max: 150 },
          ]),
        },
      ];
      const stmt = this.db.prepare(
        'INSERT INTO rule_templates (name, rules) VALUES (?, ?)'
      );
      defaultRules.forEach((r) => stmt.run(r.name, r.rules));
    }
  }

  getDb() {
    return this.db;
  }
}
