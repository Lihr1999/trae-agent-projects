export interface FieldRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required?: boolean;
  unique?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface Anomaly {
  id?: number;
  file_id?: number;
  rowIndex: number;
  anomaly_type?: string;
  anomalyType: string;
  field_name?: string;
  fieldName: string;
  expected?: string;
  actual?: string;
  message: string;
}

export interface FieldStats {
  id?: number;
  file_id?: number;
  fieldName: string;
  field_name?: string;
  type: string;
  nullCount: number;
  null_count?: number;
  uniqueCount: number;
  unique_count?: number;
  totalCount: number;
  total_count?: number;
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

export interface PresetInfo {
  type: 'clean-small' | 'misaligned-fields' | 'large-duplicates' | 'mixed-encoding';
  name: string;
  description: string;
  format: 'csv' | 'jsonl';
  estimatedRows: number;
  expectedAnomalies: string[];
}

export interface FileRecord {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  row_count: number;
  format: string;
  status: string;
  created_at: string;
}

export interface AuditReport {
  id?: number;
  fileId?: number;
  file_id?: number;
  totalRows: number;
  total_rows?: number;
  totalAnomalies: number;
  total_anomalies?: number;
  anomalyTypes: Record<string, number>;
  anomaly_types?: Record<string, number>;
  fieldSummary: Array<{
    fieldName: string;
    type: string;
    nullRate: number;
    uniqueRate: number;
  }>;
  field_summary?: Array<{
    fieldName: string;
    type: string;
    nullRate: number;
    uniqueRate: number;
  }>;
  generated_at?: string;
}
