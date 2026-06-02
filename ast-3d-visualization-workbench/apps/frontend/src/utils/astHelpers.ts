import type { ASTNode, LayoutNode } from '../../../../packages/shared/src';

export function flattenAST(root: ASTNode): ASTNode[] {
  const result: ASTNode[] = [];
  const stack: ASTNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node);
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
  }
  return result;
}

export function findNodeAtPosition(
  nodes: ASTNode[],
  line: number,
  col: number,
): ASTNode | null {
  let best: ASTNode | null = null;
  let bestRange = Infinity;

  for (const node of nodes) {
    const range = getNodeRange(node);
    if (
      line >= range.startLine &&
      line <= range.endLine &&
      (line !== range.startLine || col >= range.startCol) &&
      (line !== range.endLine || col <= range.endCol)
    ) {
      const nodeRange = range.endLine - range.startLine;
      if (nodeRange < bestRange || (nodeRange === bestRange && best !== null && node.endIndex - node.startIndex < best.endIndex - best.startIndex)) {
        best = node;
        bestRange = nodeRange;
      }
    }
  }

  return best;
}

export function getNodeRange(node: ASTNode): {
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
} {
  const text = node.text ?? '';
  const lines = text.split('\n');
  const startLine = 1;
  const startCol = node.startIndex;
  const endLine = lines.length;
  const endCol = lines[lines.length - 1].length;

  return { startLine, endLine, startCol, endCol };
}

export function isVisible(
  nodeId: string,
  collapsedIds: Set<string>,
  nodeMap: Map<string, LayoutNode>,
): boolean {
  let current = nodeMap.get(nodeId);
  while (current?.parentId) {
    if (collapsedIds.has(current.parentId)) {
      return false;
    }
    current = nodeMap.get(current.parentId);
  }
  return true;
}
