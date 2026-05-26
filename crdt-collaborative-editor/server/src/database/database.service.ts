import { Injectable, OnModuleInit } from '@nestjs/common';
import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  CRDTOperation,
  Branch,
  DocumentSnapshot,
  OperationLog,
} from '../crdt/crdt.types';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(__dirname, '../../data/crdt-editor.db');
  }

  async onModuleInit() {
    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initTables();
    this.saveToDisk();
  }

  private saveToDisk() {
    if (this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  private initTables() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS operation_logs (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        operation_json TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_branch_id TEXT,
        start_version_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        merged_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        nodes_json TEXT NOT NULL,
        version_vector_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS connected_clients (
        site_id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        connected_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL
      );
    `);
  }

  createDocument(documentId: string, name: string): void {
    if (!this.db) return;
    const now = Date.now();
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO documents (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
    );
    stmt.run([documentId, name, now, now]);
    this.saveToDisk();
  }

  insertOperationLog(
    log: Omit<OperationLog, 'id' | 'operation'> & {
      operation: CRDTOperation;
    },
  ): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      'INSERT INTO operation_logs (id, document_id, branch_id, operation_json, "order", created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    stmt.run([
      `${log.documentId}-${log.order}`,
      log.documentId,
      log.branchId,
      JSON.stringify(log.operation),
      log.order,
      Date.now(),
    ]);
    this.saveToDisk();
  }

  getOperationLogs(documentId: string): OperationLog[] {
    if (!this.db) return [];
    const rows = this.db.exec(
      `SELECT * FROM operation_logs WHERE document_id = '${documentId}' ORDER BY "order" ASC`,
    );
    if (rows.length === 0) return [];
    const columns = rows[0].columns;
    const values = rows[0].values;
    return values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, idx: number) => {
        obj[col] = row[idx];
      });
      return {
        id: obj.id,
        documentId: obj.document_id,
        branchId: obj.branch_id,
        operation: JSON.parse(obj.operation_json),
        order: obj.order,
      };
    });
  }

  createBranch(branch: Omit<Branch, 'id'> & { documentId: string; id: string }): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      'INSERT INTO branches (id, document_id, name, parent_branch_id, start_version_json, created_at, merged_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    stmt.run([
      branch.id,
      branch.documentId,
      branch.name,
      branch.parentBranchId,
      JSON.stringify(branch.startVersion),
      branch.createdAt,
      branch.mergedAt,
    ]);
    this.saveToDisk();
  }

  getBranches(documentId: string): Branch[] {
    if (!this.db) return [];
    const rows = this.db.exec(
      `SELECT * FROM branches WHERE document_id = '${documentId}' ORDER BY created_at ASC`,
    );
    if (rows.length === 0) return [];
    const columns = rows[0].columns;
    const values = rows[0].values;
    return values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, idx: number) => {
        obj[col] = row[idx];
      });
      return {
        id: obj.id,
        name: obj.name,
        parentBranchId: obj.parent_branch_id,
        startVersion: JSON.parse(obj.start_version_json),
        createdAt: obj.created_at,
        mergedAt: obj.merged_at,
      };
    });
  }

  mergeBranch(branchId: string): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      'UPDATE branches SET merged_at = ? WHERE id = ?',
    );
    stmt.run([Date.now(), branchId]);
    this.saveToDisk();
  }

  saveSnapshot(snapshot: Omit<DocumentSnapshot, 'id'> & { id: string }): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      'INSERT INTO snapshots (id, document_id, branch_id, nodes_json, version_vector_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    stmt.run([
      snapshot.id,
      snapshot.documentId,
      snapshot.branchId,
      JSON.stringify(snapshot.nodes),
      JSON.stringify(snapshot.versionVector),
      snapshot.createdAt,
    ]);
    this.saveToDisk();
  }

  getLatestSnapshot(documentId: string, branchId: string): DocumentSnapshot | null {
    if (!this.db) return null;
    const rows = this.db.exec(
      `SELECT * FROM snapshots WHERE document_id = '${documentId}' AND branch_id = '${branchId}' ORDER BY created_at DESC LIMIT 1`,
    );
    if (rows.length === 0 || rows[0].values.length === 0) return null;
    const columns = rows[0].columns;
    const rowValues = rows[0].values[0];
    const obj: any = {};
    columns.forEach((col: string, idx: number) => {
      obj[col] = rowValues[idx];
    });
    return {
      id: obj.id,
      documentId: obj.document_id,
      nodes: JSON.parse(obj.nodes_json),
      versionVector: JSON.parse(obj.version_vector_json),
      branchId: obj.branch_id,
      createdAt: obj.created_at,
    };
  }

  addConnectedClient(siteId: string, documentId: string): void {
    if (!this.db) return;
    const now = Date.now();
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO connected_clients (site_id, document_id, connected_at, last_seen_at) VALUES (?, ?, ?, ?)',
    );
    stmt.run([siteId, documentId, now, now]);
    this.saveToDisk();
  }

  updateClientLastSeen(siteId: string): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      'UPDATE connected_clients SET last_seen_at = ? WHERE site_id = ?',
    );
    stmt.run([Date.now(), siteId]);
    this.saveToDisk();
  }

  removeConnectedClient(siteId: string): void {
    if (!this.db) return;
    const stmt = this.db.prepare(
      'DELETE FROM connected_clients WHERE site_id = ?',
    );
    stmt.run([siteId]);
    this.saveToDisk();
  }

  getConnectedClients(documentId: string): string[] {
    if (!this.db) return [];
    const rows = this.db.exec(
      `SELECT site_id FROM connected_clients WHERE document_id = '${documentId}'`,
    );
    if (rows.length === 0) return [];
    const values = rows[0].values;
    return values.map((row: any[]) => row[0] as string);
  }

  clearAllData(): void {
    if (!this.db) return;
    this.db.exec(`
      DELETE FROM operation_logs;
      DELETE FROM snapshots;
      DELETE FROM branches;
      DELETE FROM documents;
      DELETE FROM connected_clients;
    `);
    this.saveToDisk();
  }
}
