import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type PresetType =
  | 'clean-small'
  | 'misaligned-fields'
  | 'large-duplicates'
  | 'mixed-encoding';

export interface PresetInfo {
  type: PresetType;
  name: string;
  description: string;
  format: 'csv' | 'jsonl';
  estimatedRows: number;
  expectedAnomalies: string[];
}

@Injectable()
export class PresetsService {
  private readonly presets: PresetInfo[] = [
    {
      type: 'clean-small',
      name: '干净小文件',
      description: '结构完整、数据规范的小型CSV文件，用于验证基础解析功能',
      format: 'csv',
      estimatedRows: 100,
      expectedAnomalies: ['无异常，用于验证基础流程'],
    },
    {
      type: 'misaligned-fields',
      name: '字段错位文件',
      description: '包含字段缺失、类型漂移的数据文件，用于测试异常检测能力',
      format: 'csv',
      estimatedRows: 200,
      expectedAnomalies: ['字段缺失', '类型漂移', '格式不匹配'],
    },
    {
      type: 'large-duplicates',
      name: '超大重复记录文件',
      description: '包含大量重复记录的大文件，用于测试重复检测和分块处理性能',
      format: 'jsonl',
      estimatedRows: 5000,
      expectedAnomalies: ['重复记录爆发', '超大文件分块处理'],
    },
    {
      type: 'mixed-encoding',
      name: '编码混杂文件',
      description: '包含特殊字符、混合编码的数据文件，用于测试解析兼容性',
      format: 'csv',
      estimatedRows: 300,
      expectedAnomalies: ['编码问题', '特殊字符', '解析错误'],
    },
  ];

  getPresets(): PresetInfo[] {
    return this.presets;
  }

  async generatePresetFile(type: PresetType): Promise<{
    filePath: string;
    originalName: string;
    format: 'csv' | 'jsonl';
  }> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auditor-'));

    switch (type) {
      case 'clean-small':
        return this.generateCleanSmallFile(tempDir);
      case 'misaligned-fields':
        return this.generateMisalignedFieldsFile(tempDir);
      case 'large-duplicates':
        return this.generateLargeDuplicatesFile(tempDir);
      case 'mixed-encoding':
        return this.generateMixedEncodingFile(tempDir);
      default:
        throw new Error(`Unknown preset type: ${type}`);
    }
  }

  private async generateCleanSmallFile(
    tempDir: string
  ): Promise<{ filePath: string; originalName: string; format: 'csv' | 'jsonl' }> {
    const filePath = path.join(tempDir, 'clean-small.csv');
    const originalName = 'clean-small.csv';

    const headers = ['id', 'name', 'email', 'age', 'department'];
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const names = [
      '张三',
      '李四',
      '王五',
      '赵六',
      '钱七',
      '孙八',
      '周九',
      '吴十',
    ];

    let content = headers.join(',') + '\n';

    for (let i = 1; i <= 100; i++) {
      const name = names[i % names.length];
      const email = `user${i}@example.com`;
      const age = 20 + (i % 40);
      const dept = departments[i % departments.length];
      content += `${i},${name},${email},${age},${dept}\n`;
    }

    fs.writeFileSync(filePath, content, 'utf-8');

    return { filePath, originalName, format: 'csv' };
  }

  private async generateMisalignedFieldsFile(
    tempDir: string
  ): Promise<{ filePath: string; originalName: string; format: 'csv' | 'jsonl' }> {
    const filePath = path.join(tempDir, 'misaligned-fields.csv');
    const originalName = 'misaligned-fields.csv';

    const headers = ['id', 'name', 'email', 'age', 'department'];
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const names = [
      '张三',
      '李四',
      '王五',
      '赵六',
      '钱七',
      '孙八',
      '周九',
      '吴十',
    ];

    let content = headers.join(',') + '\n';

    for (let i = 1; i <= 200; i++) {
      const name = names[i % names.length];
      const email = `user${i}@example.com`;
      const dept = departments[i % departments.length];

      if (i % 7 === 0) {
        content += `${i},${name},,${20 + (i % 40)},${dept}\n`;
      } else if (i % 11 === 0) {
        content += `${i},${name},${email},not_a_number,${dept}\n`;
      } else if (i % 13 === 0) {
        content += `${i},${name},invalid-email,${20 + (i % 40)},${dept}\n`;
      } else if (i % 17 === 0) {
        content += `${i},,${email},${20 + (i % 40)},${dept}\n`;
      } else if (i % 19 === 0) {
        content += `${i},${name}\n`;
      } else {
        content += `${i},${name},${email},${20 + (i % 40)},${dept}\n`;
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');

    return { filePath, originalName, format: 'csv' };
  }

  private async generateLargeDuplicatesFile(
    tempDir: string
  ): Promise<{ filePath: string; originalName: string; format: 'csv' | 'jsonl' }> {
    const filePath = path.join(tempDir, 'large-duplicates.jsonl');
    const originalName = 'large-duplicates.jsonl';

    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const names = [
      '张三',
      '李四',
      '王五',
      '赵六',
      '钱七',
      '孙八',
      '周九',
      '吴十',
    ];

    const writeStream = fs.createWriteStream(filePath, 'utf-8');

    for (let i = 1; i <= 5000; i++) {
      const name = names[i % names.length];
      const email = `user${i}@example.com`;
      const age = 20 + (i % 40);
      const dept = departments[i % departments.length];

      let id = i;
      if (i > 100 && i % 10 === 0) {
        id = Math.floor(i / 2);
      }

      const row = {
        id,
        name,
        email,
        age,
        department: dept,
      };

      writeStream.write(JSON.stringify(row) + '\n');

      if (i % 1000 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    writeStream.end();

    await new Promise<void>((resolve) => writeStream.on('finish', () => resolve()));

    return { filePath, originalName, format: 'jsonl' };
  }

  private async generateMixedEncodingFile(
    tempDir: string
  ): Promise<{ filePath: string; originalName: string; format: 'csv' | 'jsonl' }> {
    const filePath = path.join(tempDir, 'mixed-encoding.csv');
    const originalName = 'mixed-encoding.csv';

    const headers = ['id', 'name', 'email', 'age', 'department', 'notes'];
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
    const names = [
      '张三',
      '李四',
      '王五',
      'José',
      'Müller',
      'Sánchez',
      '中村',
      '김민수',
    ];
    const specialNotes = [
      '包含特殊字符: €, £, ¥',
      '包含表情符号: 😊, 👍, 🎉',
      '包含换行符:\n第二行内容',
      '包含引号: "quoted text"',
      '包含逗号: a, b, c',
      '包含RTL文本: مرحبا',
      '正常备注信息',
    ];

    let content = headers.join(',') + '\n';

    for (let i = 1; i <= 300; i++) {
      const name = names[i % names.length];
      const email = `user${i}@example.com`;
      const age = 20 + (i % 40);
      const dept = departments[i % departments.length];
      const notes = specialNotes[i % specialNotes.length];

      const safeNotes = `"${notes.replace(/"/g, '""')}"`;

      if (i % 23 === 0) {
        content += `${i},${name},${email},invalid_age,${dept},${safeNotes}\n`;
      } else if (i % 29 === 0) {
        content += `${i},${name},not-an-email,${age},${dept},${safeNotes}\n`;
      } else {
        content += `${i},${name},${email},${age},${dept},${safeNotes}\n`;
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');

    return { filePath, originalName, format: 'csv' };
  }
}
