import { Injectable, Logger } from '@nestjs/common';
import { DiffASTNode, DiffResult, DiffOperation, DiffOperationType } from './diff.interfaces';

interface TreeNodeInfo {
  node: DiffASTNode;
  leftmostLeaf: number;
  kr: number[];
  children: TreeNodeInfo[];
  label: string;
  size: number;
}

@Injectable()
export class DiffService {
  private readonly logger = new Logger(DiffService.name);
  private readonly LARGE_TREE_THRESHOLD = 10000;

  computeDiff(astA: DiffASTNode, astB: DiffASTNode): DiffResult {
    const nodeCountA = this.countNodes(astA);
    const nodeCountB = this.countNodes(astB);
    const totalNodes = nodeCountA + nodeCountB;

    if (totalNodes > this.LARGE_TREE_THRESHOLD) {
      return this.heuristicDiff(astA, astB);
    }

    return this.zhangShashaDiff(astA, astB);
  }

  private zhangShashaDiff(astA: DiffASTNode, astB: DiffASTNode): DiffResult {
    const treeA = this.preprocessTree(astA);
    const treeB = this.preprocessTree(astB);

    const nodesA = this.enumeratePostOrder(treeA);
    const nodesB = this.enumeratePostOrder(treeB);

    const sizeA = nodesA.length;
    const sizeB = nodesB.length;

    const labelA = nodesA.map((n) => this.nodeLabel(n.node));
    const labelB = nodesB.map((n) => this.nodeLabel(n.node));

    const lA = nodesA.map((n) => n.leftmostLeaf);
    const lB = nodesB.map((n) => n.leftmostLeaf);

    const krA = this.computeKeyRoots(lA, sizeA);
    const krB = this.computeKeyRoots(lB, sizeB);

    const td: number[][] = Array.from({ length: sizeA }, () => new Array(sizeB).fill(0));

    for (const i of krA) {
      for (const j of krB) {
        const li = lA[i];
        const lj = lB[j];
        const m = i - li + 2;
        const n = j - lj + 2;

        const fd: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));

        for (let x = 1; x < m; x++) {
          fd[x][0] = fd[x - 1][0] + 1;
        }
        for (let y = 1; y < n; y++) {
          fd[0][y] = fd[0][y - 1] + 1;
        }

        for (let x = 1; x < m; x++) {
          for (let y = 1; y < n; y++) {
            const xi = li + x - 1;
            const yj = lj + y - 1;

            const cost = labelA[xi] === labelB[yj] ? 0 : 1;

            if (lA[xi] === lA[i] && lB[yj] === lB[j]) {
              fd[x][y] = Math.min(
                fd[x - 1][y] + 1,
                fd[x][y - 1] + 1,
                fd[x - 1][y - 1] + cost,
              );
              td[xi][yj] = fd[x][y];
            } else {
              const p = lA[xi] - li;
              const q = lB[yj] - lj;
              fd[x][y] = Math.min(
                fd[x - 1][y] + 1,
                fd[x][y - 1] + 1,
                fd[p][q] + td[xi][yj],
              );
            }
          }
        }
      }
    }

    const editDistance = sizeA > 0 && sizeB > 0 ? td[sizeA - 1][sizeB - 1] : Math.max(sizeA, sizeB);

    const diffOperations = this.traceBackOperations(
      nodesA, nodesB, labelA, labelB, lA, lB, td,
    );

    let addedNodes = 0;
    let deletedNodes = 0;
    let modifiedNodes = 0;
    let unchangedNodes = 0;

    for (const op of diffOperations) {
      switch (op.type) {
        case 'insert': addedNodes++; break;
        case 'delete': deletedNodes++; break;
        case 'modify': modifiedNodes++; break;
        case 'match': unchangedNodes++; break;
      }
    }

    const maxNodes = Math.max(sizeA, sizeB);
    const similarity = maxNodes > 0 ? 1 - editDistance / maxNodes : 1;

    return {
      editDistance,
      addedNodes,
      deletedNodes,
      modifiedNodes,
      unchangedNodes,
      diffOperations,
      similarity: Math.max(0, Math.min(1, similarity)),
    };
  }

  private preprocessTree(root: DiffASTNode): TreeNodeInfo {
    let counter = 0;
    const build = (node: DiffASTNode): TreeNodeInfo => {
      const children = node.children.map((c) => build(c));

      let leftmostLeaf = counter;
      if (children.length === 0) {
        leftmostLeaf = counter;
      } else {
        leftmostLeaf = children[0].leftmostLeaf;
      }

      const info: TreeNodeInfo = {
        node,
        leftmostLeaf,
        kr: [],
        children,
        label: this.nodeLabel(node),
        size: 1 + children.reduce((sum, c) => sum + c.size, 0),
      };

      counter++;
      return info;
    };

    return build(root);
  }

  private enumeratePostOrder(tree: TreeNodeInfo): TreeNodeInfo[] {
    const result: TreeNodeInfo[] = [];
    const traverse = (node: TreeNodeInfo) => {
      for (const child of node.children) {
        traverse(child);
      }
      result.push(node);
    };
    traverse(tree);
    return result;
  }

  private computeKeyRoots(leftmostLeaves: number[], size: number): number[] {
    const keyRoots: number[] = [];
    const visited = new Map<number, boolean>();

    for (let i = 0; i < size; i++) {
      const l = leftmostLeaves[i];
      if (!visited.has(l)) {
        visited.set(l, true);
        keyRoots.push(i);
      }
    }

    keyRoots.sort((a, b) => a - b);
    return keyRoots;
  }

  private nodeLabel(node: DiffASTNode): string {
    const textSnippet = node.text ? node.text.substring(0, 30) : '';
    return `${node.type}:${textSnippet}`;
  }

  private traceBackOperations(
    nodesA: TreeNodeInfo[],
    nodesB: TreeNodeInfo[],
    labelA: string[],
    labelB: string[],
    lA: number[],
    lB: number[],
    td: number[][],
  ): DiffOperation[] {
    const operations: DiffOperation[] = [];
    let i = nodesA.length - 1;
    let j = nodesB.length - 1;

    while (i >= 0 && j >= 0) {
      const cost = labelA[i] === labelB[j] ? 0 : 1;

      if (td[i][j] === (i > 0 ? td[i - 1][j] : j) + 1) {
        operations.push({
          type: 'delete',
          nodeA: nodesA[i].node,
          description: `Deleted ${nodesA[i].node.type}`,
        });
        i--;
      } else if (td[i][j] === (j > 0 ? td[i][j - 1] : i) + 1) {
        operations.push({
          type: 'insert',
          nodeB: nodesB[j].node,
          description: `Inserted ${nodesB[j].node.type}`,
        });
        j--;
      } else if (td[i][j] === ((i > 0 && j > 0) ? td[i - 1][j - 1] : 0) + cost) {
        if (cost === 0) {
          operations.push({
            type: 'match',
            nodeA: nodesA[i].node,
            nodeB: nodesB[j].node,
            description: `Matched ${nodesA[i].node.type}`,
          });
        } else {
          operations.push({
            type: 'modify',
            nodeA: nodesA[i].node,
            nodeB: nodesB[j].node,
            description: `Modified ${nodesA[i].node.type} -> ${nodesB[j].node.type}`,
          });
        }
        i--;
        j--;
      } else {
        operations.push({
          type: 'modify',
          nodeA: nodesA[i].node,
          nodeB: nodesB[j].node,
          description: `Modified ${nodesA[i].node.type} -> ${nodesB[j].node.type}`,
        });
        i--;
        j--;
      }
    }

    while (i >= 0) {
      operations.push({
        type: 'delete',
        nodeA: nodesA[i].node,
        description: `Deleted ${nodesA[i].node.type}`,
      });
      i--;
    }

    while (j >= 0) {
      operations.push({
        type: 'insert',
        nodeB: nodesB[j].node,
        description: `Inserted ${nodesB[j].node.type}`,
      });
      j--;
    }

    operations.reverse();
    return operations;
  }

  private heuristicDiff(astA: DiffASTNode, astB: DiffASTNode): DiffResult {
    const operations: DiffOperation[] = [];

    const flatA = this.flattenTree(astA);
    const flatB = this.flattenTree(astB);

    const mapA = new Map<string, DiffASTNode>();
    const mapB = new Map<string, DiffASTNode>();

    for (const node of flatA) mapA.set(node.id, node);
    for (const node of flatB) mapB.set(node.id, node);

    const matchedA = new Set<string>();
    const matchedB = new Set<string>();

    for (const nodeA of flatA) {
      const labelA = this.nodeLabel(nodeA);
      for (const nodeB of flatB) {
        if (matchedB.has(nodeB.id)) continue;
        const labelB = this.nodeLabel(nodeB);
        if (labelA === labelB) {
          matchedA.add(nodeA.id);
          matchedB.add(nodeB.id);
          operations.push({
            type: 'match',
            nodeA,
            nodeB,
            description: `Matched ${nodeA.type}`,
          });
          break;
        }
      }
    }

    for (const nodeA of flatA) {
      if (!matchedA.has(nodeA.id)) {
        const partialMatch = this.findPartialMatch(nodeA, flatB, matchedB);
        if (partialMatch) {
          matchedB.add(partialMatch.id);
          operations.push({
            type: 'modify',
            nodeA,
            nodeB: partialMatch,
            description: `Modified ${nodeA.type} -> ${partialMatch.type}`,
          });
        } else {
          operations.push({
            type: 'delete',
            nodeA,
            description: `Deleted ${nodeA.type}`,
          });
        }
      }
    }

    for (const nodeB of flatB) {
      if (!matchedB.has(nodeB.id)) {
        operations.push({
          type: 'insert',
          nodeB,
          description: `Inserted ${nodeB.type}`,
        });
      }
    }

    let addedNodes = 0;
    let deletedNodes = 0;
    let modifiedNodes = 0;
    let unchangedNodes = 0;

    for (const op of operations) {
      switch (op.type) {
        case 'insert': addedNodes++; break;
        case 'delete': deletedNodes++; break;
        case 'modify': modifiedNodes++; break;
        case 'match': unchangedNodes++; break;
      }
    }

    const editDistance = addedNodes + deletedNodes + modifiedNodes;
    const maxNodes = Math.max(flatA.length, flatB.length);
    const similarity = maxNodes > 0 ? 1 - editDistance / maxNodes : 1;

    return {
      editDistance,
      addedNodes,
      deletedNodes,
      modifiedNodes,
      unchangedNodes,
      diffOperations: operations.slice(0, 5000),
      similarity: Math.max(0, Math.min(1, similarity)),
    };
  }

  private findPartialMatch(
    nodeA: DiffASTNode,
    candidates: DiffASTNode[],
    exclude: Set<string>,
  ): DiffASTNode | null {
    let bestMatch: DiffASTNode | null = null;
    let bestScore = 0;

    for (const nodeB of candidates) {
      if (exclude.has(nodeB.id)) continue;

      let score = 0;
      if (nodeA.type === nodeB.type) score += 0.6;

      const textA = nodeA.text.substring(0, 50);
      const textB = nodeB.text.substring(0, 50);
      if (textA === textB) {
        score += 0.4;
      } else {
        const commonChars = this.commonCharacterRatio(textA, textB);
        score += commonChars * 0.4;
      }

      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = nodeB;
      }
    }

    return bestMatch;
  }

  private commonCharacterRatio(a: string, b: string): number {
    if (!a || !b) return 0;
    const setA = new Set(a.split(''));
    const setB = new Set(b.split(''));
    let common = 0;
    for (const ch of setA) {
      if (setB.has(ch)) common++;
    }
    return common / Math.max(setA.size, setB.size);
  }

  private flattenTree(node: DiffASTNode): DiffASTNode[] {
    const result: DiffASTNode[] = [];
    const traverse = (n: DiffASTNode) => {
      result.push(n);
      for (const child of n.children) {
        traverse(child);
      }
    };
    traverse(node);
    return result;
  }

  private countNodes(node: DiffASTNode): number {
    let count = 1;
    for (const child of node.children) {
      count += this.countNodes(child);
    }
    return count;
  }
}
