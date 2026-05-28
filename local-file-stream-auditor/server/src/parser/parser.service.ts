import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as Papa from 'papaparse';
import { DatabaseService } from '../database/database.service';
import { RulesService, FieldRule, Anomaly } from '../rules/rules.service';

export interface FieldStats {
  fieldName: string;
  type: string;
  nullCount: number;
  uniqueCount: number;
  totalCount: number;
  distribution: Record<string, number>;
}

export interface ParseChunkResult {
  chunkIndex: number;
  startRow: number;
  endRow: number;
  rowCount: number;
  anomalies: Anomaly[];
  data: any[];
  fieldStats: FieldStats[];
}

@Injectable()
export class ParserService {
  private readonly CHUNK_SIZE = 100;

  constructor(
    private databaseService: DatabaseService,
    private rulesService: RulesService
  ) {}

  async parseFile(
    filePath: string,
    originalName: string,
    format: 'csv' | 'jsonl',
    rules: FieldRule[],
    onChunk?: (chunk: ParseChunkResult) => void
  ): Promise<{ fileId: number; totalRows: number; totalAnomalies: number }> {
    const db = this.databaseService.getDb();

    const fileSize = fs.statSync(filePath).size;
    const insertFileStmt = db.prepare(
      'INSERT INTO files (filename, original_name, file_size, format, status) VALUES (?, ?, ?, ?, ?)'
    );
    const fileResult = insertFileStmt.run(
      filePath,
      originalName,
      fileSize,
      format,
      'processing'
    );
    const fileId = Number(fileResult.lastInsertRowid);

    const seenValues = new Map<string, Set<any>>();
    const fieldStatsMap = new Map<string, FieldStats>();
    const allAnomalies: Anomaly[] = [];
    let totalRows = 0;
    let chunkIndex = 0;

    this.initializeFieldStats(rules, fieldStatsMap);

    const insertChunkStmt = db.prepare(
      'INSERT INTO parse_chunks (file_id, chunk_index, start_row, end_row, row_count, anomaly_count, data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const insertAnomalyStmt = db.prepare(
      'INSERT INTO anomaly_rows (file_id, row_index, anomaly_type, field_name, expected, actual, message) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    if (format === 'csv') {
      await this.parseCsvStream(
        filePath,
        rules,
        seenValues,
        fieldStatsMap,
        allAnomalies,
        (chunk, startRow, endRow, chunkData) => {
          totalRows += chunk.length;
          const chunkResult: ParseChunkResult = {
            chunkIndex,
            startRow,
            endRow,
            rowCount: chunk.length,
            anomalies: chunkData.anomalies,
            data: chunk,
            fieldStats: Array.from(fieldStatsMap.values()),
          };
          insertChunkStmt.run(
            fileId,
            chunkIndex,
            startRow,
            endRow,
            chunk.length,
            chunkData.anomalies.length,
            JSON.stringify(chunk)
          );
          chunkData.anomalies.forEach((a) => {
            insertAnomalyStmt.run(
              fileId,
            a.rowIndex,
            a.anomalyType,
            a.fieldName,
            a.expected || '',
            a.actual || '',
            a.message
            );
          });
          onChunk?.(chunkResult);
          chunkIndex++;
        }
      );
    } else {
      await this.parseJsonlStream(
        filePath,
        rules,
        seenValues,
        fieldStatsMap,
        allAnomalies,
        (chunk, startRow, endRow, chunkData) => {
          totalRows += chunk.length;
          const chunkResult: ParseChunkResult = {
            chunkIndex,
            startRow,
            endRow,
            rowCount: chunk.length,
            anomalies: chunkData.anomalies,
            data: chunk,
            fieldStats: Array.from(fieldStatsMap.values()),
          };
          insertChunkStmt.run(
            fileId,
            chunkIndex,
            startRow,
            endRow,
            chunk.length,
            chunkData.anomalies.length,
            JSON.stringify(chunk)
          );
          chunkData.anomalies.forEach((a) => {
            insertAnomalyStmt.run(
              fileId,
              a.rowIndex,
              a.anomalyType,
              a.fieldName,
              a.expected || '',
              a.actual || '',
              a.message
            );
          });
          onChunk?.(chunkResult);
          chunkIndex++;
        }
      );
    }

    const insertFieldStmt = db.prepare(
      'INSERT INTO field_stats (file_id, field_name, type, null_count, unique_count, total_count, distribution) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    fieldStatsMap.forEach((stats) => {
      insertFieldStmt.run(
        fileId,
        stats.fieldName,
        stats.type,
        stats.nullCount,
        stats.uniqueCount,
        stats.totalCount,
        JSON.stringify(stats.distribution)
      );
    });

    const updateFileStmt = db.prepare(
      'UPDATE files SET row_count = ?, status = ? WHERE id = ?'
    );
    updateFileStmt.run(totalRows, 'completed', fileId);

    return {
      fileId,
      totalRows,
      totalAnomalies: allAnomalies.length,
    };
  }

  private initializeFieldStats(
    rules: FieldRule[],
    fieldStatsMap: Map<string, FieldStats>
  ) {
    rules.forEach((rule) => {
      fieldStatsMap.set(rule.field, {
        fieldName: rule.field,
        type: rule.type,
        nullCount: 0,
        uniqueCount: 0,
        totalCount: 0,
        distribution: {},
      });
    });
  }

  private async parseCsvStream(
    filePath: string,
    rules: FieldRule[],
    seenValues: Map<string, Set<any>>,
    fieldStatsMap: Map<string, FieldStats>,
    allAnomalies: Anomaly[],
    onChunk: (
      chunk: any[],
      startRow: number,
      endRow: number,
      chunkData: { anomalies: Anomaly[] }
    ) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let rowIndex = 0;
      let currentChunk: any[] = [];
      let currentAnomalies: Anomaly[] = [];
      let startRow = 0;

      const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });

      Papa.parse(fileStream, {
        header: true,
        skipEmptyLines: true,
        step: (results: any) => {
          const row = results.data;
          const anomalies = this.rulesService.validateRow(
            row,
            rules,
            rowIndex,
            seenValues
          );

          this.updateFieldStats(row, rules, fieldStatsMap);

          currentChunk.push(row);
          currentAnomalies.push(...anomalies);
          allAnomalies.push(...anomalies);

          rowIndex++;

          if (currentChunk.length >= this.CHUNK_SIZE) {
            onChunk(currentChunk, startRow, rowIndex - 1, {
              anomalies: currentAnomalies,
            });
            currentChunk = [];
            currentAnomalies = [];
            startRow = rowIndex;
          }
        },
        complete: () => {
          if (currentChunk.length > 0) {
            onChunk(currentChunk, startRow, rowIndex - 1, {
              anomalies: currentAnomalies,
            });
          }
          resolve();
        },
        error: (error: any) => {
          reject(error);
        },
      });
    });
  }

  private async parseJsonlStream(
    filePath: string,
    rules: FieldRule[],
    seenValues: Map<string, Set<any>>,
    fieldStatsMap: Map<string, FieldStats>,
    allAnomalies: Anomaly[],
    onChunk: (
      chunk: any[],
      startRow: number,
      endRow: number,
      chunkData: { anomalies: Anomaly[] }
    ) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let rowIndex = 0;
      let currentChunk: any[] = [];
      let currentAnomalies: Anomaly[] = [];
      let startRow = 0;

      const rl = require('readline').createInterface({
        input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
      });

      rl.on('line', (line: string) => {
        try {
          const trimmedLine = line.trim();
          if (!trimmedLine) return;

          const row = JSON.parse(trimmedLine);
          const anomalies = this.rulesService.validateRow(
            row,
            rules,
            rowIndex,
            seenValues
          );

          this.updateFieldStats(row, rules, fieldStatsMap);

          currentChunk.push(row);
          currentAnomalies.push(...anomalies);
          allAnomalies.push(...anomalies);

          rowIndex++;

          if (currentChunk.length >= this.CHUNK_SIZE) {
            onChunk(currentChunk, startRow, rowIndex - 1, {
              anomalies: currentAnomalies,
            });
            currentChunk = [];
            currentAnomalies = [];
            startRow = rowIndex;
          }
        } catch (e) {
          allAnomalies.push({
            rowIndex,
            anomalyType: 'parse_error',
            fieldName: '__line',
            expected: 'valid JSON',
            actual: line,
            message: `JSON解析错误: ${e.message}`,
          });
          rowIndex++;
        }
      });

      rl.on('close', () => {
        if (currentChunk.length > 0) {
          onChunk(currentChunk, startRow, rowIndex - 1, {
            anomalies: currentAnomalies,
          });
        }
        resolve();
      });

      rl.on('error', (error: any) => {
        reject(error);
      });
    });
  }

  private updateFieldStats(
    row: any,
    rules: FieldRule[],
    fieldStatsMap: Map<string, FieldStats>
  ) {
    rules.forEach((rule) => {
      const stats = fieldStatsMap.get(rule.field);
      if (!stats) return;

      const value = row[rule.field];
      stats.totalCount++;

      if (value === undefined || value === null || value === '') {
        stats.nullCount++;
      } else {
        const valueKey = String(value);
        if (!stats.distribution[valueKey]) {
          stats.distribution[valueKey] = 0;
          stats.uniqueCount++;
        }
        stats.distribution[valueKey]++;
      }
    });
  }

  getFileHistory() {
    const db = this.databaseService.getDb();
    const stmt = db.prepare('SELECT * FROM files ORDER BY created_at DESC');
    return stmt.all();
  }

  getFileById(fileId: number) {
    const db = this.databaseService.getDb();
    const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
    return stmt.get(fileId);
  }

  getFieldStats(fileId: number) {
    const db = this.databaseService.getDb();
    const stmt = db.prepare('SELECT * FROM field_stats WHERE file_id = ?');
    return stmt.all().map((row: any) => ({
      ...row,
      distribution: JSON.parse(row.distribution || '{}'),
    }));
  }

  getAnomalies(fileId: number, anomalyType?: string) {
    const db = this.databaseService.getDb();
    let sql = 'SELECT * FROM anomaly_rows WHERE file_id = ?';
    const params: any[] = [fileId];
    if (anomalyType) {
      sql += ' AND anomaly_type = ?';
      params.push(anomalyType);
    }
    sql += ' ORDER BY row_index';
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  }

  getChunks(fileId: number) {
    const db = this.databaseService.getDb();
    const stmt = db.prepare(
      'SELECT * FROM parse_chunks WHERE file_id = ? ORDER BY chunk_index'
    );
    return stmt.all().map((row: any) => ({
      ...row,
      data: JSON.parse(row.data || '[]'),
    }));
  }

  generateReport(fileId: number) {
    const db = this.databaseService.getDb();

    const file = this.getFileById(fileId);
    const fieldStats = this.getFieldStats(fileId);
    const anomalies = this.getAnomalies(fileId);

    const anomalyTypeCounts = anomalies.reduce((acc: Record<string, number>, a: any) => {
      acc[a.anomaly_type] = (acc[a.anomaly_type] || 0) + 1;
      return acc;
    }, {});

    const fieldSummary = fieldStats.map((fs: any) => ({
      fieldName: fs.field_name,
      type: fs.type,
      nullRate: (fs.null_count / fs.total_count) * 100,
      uniqueRate: (fs.unique_count / fs.total_count) * 100,
    }));

    const report = {
      fileId,
      totalRows: file.row_count,
      totalAnomalies: anomalies.length,
      anomalyTypes: anomalyTypeCounts,
      fieldSummary,
    };

    const stmt = db.prepare(
      'INSERT INTO audit_reports (file_id, total_rows, total_anomalies, anomaly_types, field_summary) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(
      fileId,
      report.totalRows,
      report.totalAnomalies,
      JSON.stringify(anomalyTypeCounts),
      JSON.stringify(fieldSummary)
    );

    return report;
  }

  getReport(fileId: number) {
    const db = this.databaseService.getDb();
    const stmt = db.prepare(
      'SELECT * FROM audit_reports WHERE file_id = ? ORDER BY generated_at DESC LIMIT 1'
    );
    const row = stmt.get(fileId);
    if (!row) return null;
    return {
      ...row,
      anomaly_types: JSON.parse(String(row.anomaly_types || '{}')),
      field_summary: JSON.parse(String(row.field_summary || '[]')),
    };
  }
}
