export interface DiffASTNode {
  id: string;
  type: string;
  text: string;
  children: DiffASTNode[];
  hasError?: boolean;
}

export type DiffOperationType = 'insert' | 'delete' | 'modify' | 'match';

export interface DiffOperation {
  type: DiffOperationType;
  nodeA?: DiffASTNode;
  nodeB?: DiffASTNode;
  description: string;
}

export interface DiffResult {
  editDistance: number;
  addedNodes: number;
  deletedNodes: number;
  modifiedNodes: number;
  unchangedNodes: number;
  diffOperations: DiffOperation[];
  similarity: number;
}

export interface DiffRequest {
  astA: DiffASTNode;
  astB: DiffASTNode;
}
