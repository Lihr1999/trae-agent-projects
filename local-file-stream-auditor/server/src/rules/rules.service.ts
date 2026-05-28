import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

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
  rowIndex: number;
  anomalyType: string;
  fieldName: string;
  expected?: string;
  actual?: string;
  message: string;
}

@Injectable()
export class RulesService {
  constructor(private databaseService: DatabaseService) {}

  getRuleTemplates() {
    const db = this.databaseService.getDb();
    const stmt = db.prepare('SELECT * FROM rule_templates');
    return stmt.all().map((row: any) => ({
      ...row,
      rules: JSON.parse(row.rules),
    }));
  }

  saveRuleTemplate(name: string, rules: FieldRule[]) {
    const db = this.databaseService.getDb();
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO rule_templates (name, rules) VALUES (?, ?)'
    );
    return stmt.run(name, JSON.stringify(rules));
  }

  validateRow(row: any, rules: FieldRule[], rowIndex: number, seenValues: Map<string, Set<any>>): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const rule of rules) {
      const value = row[rule.field];
      const isMissing = value === undefined || value === null || value === '';

      if (rule.required && isMissing) {
        anomalies.push({
          rowIndex,
          anomalyType: 'field_missing',
          fieldName: rule.field,
          expected: rule.type,
          actual: 'null/undefined',
          message: `字段 '${rule.field}' 为必填项，但值为空`,
        });
        continue;
      }

      if (!isMissing) {
        const typeValid = this.checkType(value, rule.type);
        if (!typeValid) {
          anomalies.push({
            rowIndex,
            anomalyType: 'type_drift',
            fieldName: rule.field,
            expected: rule.type,
            actual: typeof value,
            message: `字段 '${rule.field}' 类型不匹配，期望 ${rule.type}，实际为 ${typeof value}`,
          });
        }

        if (rule.type === 'number' && typeValid) {
          const numValue = Number(value);
          if (rule.min !== undefined && numValue < rule.min) {
            anomalies.push({
              rowIndex,
              anomalyType: 'out_of_range',
              fieldName: rule.field,
              expected: `>= ${rule.min}`,
              actual: String(numValue),
              message: `字段 '${rule.field}' 小于最小值 ${rule.min}`,
            });
          }
          if (rule.max !== undefined && numValue > rule.max) {
            anomalies.push({
              rowIndex,
              anomalyType: 'out_of_range',
              fieldName: rule.field,
              expected: `<= ${rule.max}`,
              actual: String(numValue),
              message: `字段 '${rule.field}' 大于最大值 ${rule.max}`,
            });
          }
        }

        if (rule.pattern && typeValid) {
          const regex = new RegExp(rule.pattern);
          if (!regex.test(String(value))) {
            anomalies.push({
              rowIndex,
              anomalyType: 'pattern_mismatch',
              fieldName: rule.field,
              expected: rule.pattern,
              actual: String(value),
              message: `字段 '${rule.field}' 格式不匹配`,
            });
          }
        }

        if (rule.unique) {
          const valueKey = String(value);
          const fieldValues = seenValues.get(rule.field) || new Set();
          if (fieldValues.has(valueKey)) {
            anomalies.push({
              rowIndex,
              anomalyType: 'duplicate_record',
              fieldName: rule.field,
              expected: 'unique',
              actual: valueKey,
              message: `字段 '${rule.field}' 值重复: ${valueKey}`,
            });
          } else {
            fieldValues.add(valueKey);
            seenValues.set(rule.field, fieldValues);
          }
        }
      }
    }

    return anomalies;
  }

  private checkType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return !isNaN(Number(value)) && value !== '' && value !== null && value !== undefined;
      case 'boolean':
        return typeof value === 'boolean' || value === 'true' || value === 'false';
      case 'date':
        const d = new Date(value);
        return d instanceof Date && !isNaN(d.getTime());
      default:
        return true;
    }
  }
}
