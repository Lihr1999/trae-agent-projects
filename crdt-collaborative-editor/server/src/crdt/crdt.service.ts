import { Injectable } from '@nestjs/common';
import {
  CRDTIdentifier,
  CRDTNode,
  InsertOperation,
  DeleteOperation,
  CRDTOperation,
  VersionVector,
} from './crdt.types';

@Injectable()
export class CrdtService {
  private nodes: Map<string, CRDTNode> = new Map();
  private head: CRDTIdentifier | null = null;
  private versionVector: VersionVector = {};

  getIdKey(id: CRDTIdentifier): string {
    return `${id.siteId}-${id.clock}`;
  }

  compareIds(a: CRDTIdentifier, b: CRDTIdentifier): number {
    if (a.clock !== b.clock) {
      return a.clock - b.clock;
    }
    return a.siteId.localeCompare(b.siteId);
  }

  getText(): string {
    let result = '';
    let currentId = this.head;
    while (currentId) {
      const node = this.nodes.get(this.getIdKey(currentId));
      if (!node) break;
      if (!node.tombstone) {
        result += node.value;
      }
      currentId = node.nextId;
    }
    return result;
  }

  getNodes(): CRDTNode[] {
    const result: CRDTNode[] = [];
    let currentId = this.head;
    while (currentId) {
      const node = this.nodes.get(this.getIdKey(currentId));
      if (!node) break;
      result.push(node);
      currentId = node.nextId;
    }
    return result;
  }

  getVersionVector(): VersionVector {
    return { ...this.versionVector };
  }

  incrementVersion(siteId: string): number {
    if (!this.versionVector[siteId]) {
      this.versionVector[siteId] = 0;
    }
    this.versionVector[siteId]++;
    return this.versionVector[siteId];
  }

  mergeVersionVector(other: VersionVector): void {
    for (const [siteId, clock] of Object.entries(other)) {
      if (!this.versionVector[siteId] || this.versionVector[siteId] < clock) {
        this.versionVector[siteId] = clock;
      }
    }
  }

  createInsert(
    siteId: string,
    value: string,
    afterId: CRDTIdentifier | null,
  ): InsertOperation {
    const clock = this.incrementVersion(siteId);
    return {
      type: 'insert',
      id: { siteId, clock },
      value,
      afterId,
      versionVector: this.getVersionVector(),
      siteId,
      timestamp: Date.now(),
    };
  }

  createDelete(siteId: string, targetId: CRDTIdentifier): DeleteOperation {
    this.incrementVersion(siteId);
    return {
      type: 'delete',
      targetId,
      versionVector: this.getVersionVector(),
      siteId,
      timestamp: Date.now(),
    };
  }

  applyInsert(op: InsertOperation): boolean {
    const key = this.getIdKey(op.id);
    if (this.nodes.has(key)) {
      return false;
    }

    const newNode: CRDTNode = {
      id: op.id,
      value: op.value,
      tombstone: false,
      nextId: null,
    };

    if (!op.afterId) {
      if (this.head) {
        const headNode = this.nodes.get(this.getIdKey(this.head));
        if (headNode && this.compareIds(op.id, this.head) < 0) {
          newNode.nextId = this.head;
          this.head = op.id;
        } else {
          let currentId = this.head;
          let prevId: CRDTIdentifier | null = null;
          while (currentId) {
            const currentNode = this.nodes.get(this.getIdKey(currentId));
            if (!currentNode) break;
            if (this.compareIds(op.id, currentId) < 0) {
              break;
            }
            prevId = currentId;
            currentId = currentNode.nextId;
          }
          if (prevId) {
            const prevNode = this.nodes.get(this.getIdKey(prevId));
            if (prevNode) {
              newNode.nextId = prevNode.nextId;
              prevNode.nextId = op.id;
            }
          }
        }
      } else {
        this.head = op.id;
      }
    } else {
      const afterNode = this.nodes.get(this.getIdKey(op.afterId));
      if (!afterNode) {
        let currentId = this.head;
        while (currentId) {
          const node = this.nodes.get(this.getIdKey(currentId));
          if (!node || !node.nextId) break;
          currentId = node.nextId;
        }
        if (currentId) {
          const lastNode = this.nodes.get(this.getIdKey(currentId));
          if (lastNode) {
            lastNode.nextId = op.id;
          }
        } else {
          this.head = op.id;
        }
      } else {
        let insertBeforeId: CRDTIdentifier | null = afterNode.nextId;
        while (insertBeforeId) {
          const beforeNode = this.nodes.get(this.getIdKey(insertBeforeId));
          if (!beforeNode) break;
          if (this.compareIds(op.id, insertBeforeId) < 0) {
            break;
          }
          insertBeforeId = beforeNode.nextId;
        }
        newNode.nextId = insertBeforeId;
        afterNode.nextId = op.id;
      }
    }

    this.nodes.set(key, newNode);
    this.mergeVersionVector(op.versionVector);
    return true;
  }

  applyDelete(op: DeleteOperation): boolean {
    const key = this.getIdKey(op.targetId);
    const node = this.nodes.get(key);
    if (!node) {
      return false;
    }
    node.tombstone = true;
    this.mergeVersionVector(op.versionVector);
    return true;
  }

  applyOperation(op: CRDTOperation): boolean {
    if (op.type === 'insert') {
      return this.applyInsert(op);
    } else {
      return this.applyDelete(op);
    }
  }

  getTombstoneCount(): number {
    let count = 0;
    for (const node of this.nodes.values()) {
      if (node.tombstone) count++;
    }
    return count;
  }

  getTotalNodeCount(): number {
    return this.nodes.size;
  }

  clear(): void {
    this.nodes.clear();
    this.head = null;
    this.versionVector = {};
  }
}
