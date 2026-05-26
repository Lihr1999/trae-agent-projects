import { Injectable } from '@nestjs/common';
import { InsertOperation, DeleteOperation, CRDTOperation, CRDTIdentifier } from '../crdt/crdt.types';

interface Preset {
  id: string;
  name: string;
  description: string;
  anomalyType: string | null;
  getOperations: () => CRDTOperation[];
}

@Injectable()
export class PresetsService {
  private presets: Map<string, Preset> = new Map();

  constructor() {
    this.initPresets();
  }

  private initPresets() {
    this.presets.set('preset-1', {
      id: 'preset-1',
      name: '预设一：墓碑膨胀演示',
      description: '模拟高并发删除操作导致的墓碑膨胀现象',
      anomalyType: 'tombstone-bloat',
      getOperations: () => this.generateTombstoneBloatPreset(),
    });

    this.presets.set('preset-2', {
      id: 'preset-2',
      name: '预设二：乱序抖动演示',
      description: '模拟乱序到达的编辑操作引发的文本抖动问题',
      anomalyType: 'out-of-order-jitter',
      getOperations: () => this.generateOutOfOrderPreset(),
    });

    this.presets.set('preset-3', {
      id: 'preset-3',
      name: '预设三：意图违逆演示',
      description: '模拟分支合并后可能出现的意图违逆情况',
      anomalyType: 'intention-violation',
      getOperations: () => this.generateIntentionViolationPreset(),
    });

    this.presets.set('preset-4', {
      id: 'preset-4',
      name: '预设四：离线重连演示',
      description: '模拟离线重连时的数据状态不一致问题',
      anomalyType: 'offline-reconnect',
      getOperations: () => this.generateOfflineReconnectPreset(),
    });
  }

  getAllPresets() {
    return Array.from(this.presets.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      anomalyType: p.anomalyType,
    }));
  }

  getPresetOperations(presetId: string): CRDTOperation[] | null {
    const preset = this.presets.get(presetId);
    return preset ? preset.getOperations() : null;
  }

  private generateTombstoneBloatPreset(): CRDTOperation[] {
    const operations: CRDTOperation[] = [];
    let lastId: CRDTIdentifier | null = null;

    const baseText = '这是一段用于演示墓碑膨胀现象的示例文本。我们将对这段文本进行大量的删除和插入操作。';
    for (let i = 0; i < baseText.length; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-A', clock: i + 1 },
        value: baseText[i],
        afterId: lastId,
        versionVector: { 'user-A': i + 1 },
        siteId: 'user-A',
        timestamp: Date.now() + i,
      };
      operations.push(op);
      lastId = op.id;
    }

    const deleteCount = 100;
    for (let i = 0; i < deleteCount; i++) {
      const insertOp: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-B', clock: i + 1 },
        value: `删`,
        afterId: null,
        versionVector: { 'user-A': baseText.length, 'user-B': i + 1 },
        siteId: 'user-B',
        timestamp: Date.now() + baseText.length + i * 2,
      };
      operations.push(insertOp);

      const deleteOp: DeleteOperation = {
        type: 'delete',
        targetId: insertOp.id,
        versionVector: { 'user-A': baseText.length, 'user-B': i + 2 },
        siteId: 'user-B',
        timestamp: Date.now() + baseText.length + i * 2 + 1,
      };
      operations.push(deleteOp);
    }

    return operations;
  }

  private generateOutOfOrderPreset(): CRDTOperation[] {
    const operations: CRDTOperation[] = [];
    const text = 'ABCDEFGHIJ';

    for (let i = 0; i < text.length; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-main', clock: i + 1 },
        value: text[i],
        afterId: i === 0 ? null : { siteId: 'user-main', clock: i },
        versionVector: { 'user-main': i + 1 },
        siteId: 'user-main',
        timestamp: Date.now() + i,
      };
      operations.push(op);
    }

    const delayedOps: InsertOperation[] = [];
    const delayedText = '12345';
    for (let i = 0; i < delayedText.length; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-delayed', clock: i + 1 },
        value: delayedText[i],
        afterId: null,
        versionVector: { 'user-main': text.length, 'user-delayed': i + 1 },
        siteId: 'user-delayed',
        timestamp: Date.now() + text.length + i * 100,
      };
      delayedOps.push(op);
    }

    const shuffled = [...delayedOps].sort(() => Math.random() - 0.5);
    operations.push(...shuffled);

    return operations;
  }

  private generateIntentionViolationPreset(): CRDTOperation[] {
    const operations: CRDTOperation[] = [];

    const baseText = 'Hello World';
    let lastId: CRDTIdentifier | null = null;
    for (let i = 0; i < baseText.length; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-A', clock: i + 1 },
        value: baseText[i],
        afterId: lastId,
        versionVector: { 'user-A': i + 1 },
        siteId: 'user-A',
        timestamp: Date.now() + i,
      };
      operations.push(op);
      lastId = op.id;
    }

    const branchAInserts: InsertOperation[] = [];
    for (let i = 0; i < 5; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-A', clock: baseText.length + i + 1 },
        value: `A${i}`,
        afterId: { siteId: 'user-A', clock: 5 },
        versionVector: { 'user-A': baseText.length + i + 1 },
        siteId: 'user-A',
        timestamp: Date.now() + baseText.length + i,
      };
      branchAInserts.push(op);
    }
    operations.push(...branchAInserts);

    const branchBInserts: InsertOperation[] = [];
    for (let i = 0; i < 5; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-B', clock: i + 1 },
        value: `B${i}`,
        afterId: { siteId: 'user-A', clock: 5 },
        versionVector: { 'user-A': baseText.length, 'user-B': i + 1 },
        siteId: 'user-B',
        timestamp: Date.now() + baseText.length + 10 + i,
      };
      branchBInserts.push(op);
    }
    operations.push(...branchBInserts);

    return operations;
  }

  private generateOfflineReconnectPreset(): CRDTOperation[] {
    const operations: CRDTOperation[] = [];

    const baseText = '初始同步的文本内容';
    let lastId: CRDTIdentifier | null = null;
    for (let i = 0; i < baseText.length; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-online', clock: i + 1 },
        value: baseText[i],
        afterId: lastId,
        versionVector: { 'user-online': i + 1 },
        siteId: 'user-online',
        timestamp: Date.now() + i,
      };
      operations.push(op);
      lastId = op.id;
    }

    for (let i = 0; i < 20; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-online', clock: baseText.length + i + 1 },
        value: `在${i}`,
        afterId: lastId,
        versionVector: { 'user-online': baseText.length + i + 1 },
        siteId: 'user-online',
        timestamp: Date.now() + baseText.length + i,
      };
      operations.push(op);
      lastId = op.id;
    }

    const offlineOps: InsertOperation[] = [];
    for (let i = 0; i < 10; i++) {
      const op: InsertOperation = {
        type: 'insert',
        id: { siteId: 'user-offline', clock: i + 1 },
        value: `离${i}`,
        afterId: { siteId: 'user-online', clock: baseText.length / 2 },
        versionVector: { 'user-online': baseText.length, 'user-offline': i + 1 },
        siteId: 'user-offline',
        timestamp: Date.now() + baseText.length + 100 + i,
      };
      offlineOps.push(op);
    }
    operations.push(...offlineOps);

    return operations;
  }
}
