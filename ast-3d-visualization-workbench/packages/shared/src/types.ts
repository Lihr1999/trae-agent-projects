export interface ASTNode {
  id: string;
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  children: ASTNode[];
  hasError: boolean;
  isErrorPlaceholder: boolean;
  parentId?: string | null;
  depth?: number;
}

export interface ASTPosition3D {
  x: number;
  y: number;
  z: number;
}

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  z: number;
  type: string;
  label: string;
  depth: number;
  childCount: number;
  hasError: boolean;
  parentId: string | null;
}

export interface LayoutEdge {
  source: string;
  target: string;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  nodeCount: number;
  edgeCount: number;
  computeTime: number;
}

export interface ParseRequest {
  source: string;
  language: 'javascript' | 'typescript';
}

export interface ParseResult {
  ast: ASTNode;
  language: string;
  nodeCount: number;
  errorCount: number;
  parseTime: number;
  hasErrors: boolean;
  errorMessage?: string;
}

export interface LayoutRequest {
  ast: ASTNode;
  params: {
    algorithm?: 'reingold-tilford' | 'force-directed' | 'hybrid';
    coordinateSystem?: 'sphere' | 'cylinder' | 'cartesian';
    layerSpacing?: number;
    siblingSpacing?: number;
    subtreeSpacing?: number;
    angularSpread?: number;
    maxZDepth?: number;
    forceIterations?: number;
    repulsionStrength?: number;
    attractionStrength?: number;
    lodThreshold?: number;
  };
}

export interface DiffRequest {
  astA: ASTNode;
  astB: ASTNode;
}

export type DiffOperationType = 'insert' | 'delete' | 'modify' | 'match';

export interface DiffOperation {
  type: DiffOperationType;
  nodeA?: ASTNode;
  nodeB?: ASTNode;
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

export interface ScenePreset {
  id: string;
  name: string;
  description: string;
  sourceCode: string;
  language: 'javascript' | 'typescript';
}

export interface AnimationState {
  type: 'explode' | 'pulse' | 'collapse' | 'morph' | 'none';
  progress: number;
  duration: number;
  startTime: number;
  affectedNodes: string[];
}

export interface PerformanceMetrics {
  nodeCount: number;
  drawCalls: number;
  fps: number;
  parseTime: number;
  layoutTime: number;
  memoryUsage: number;
}

export interface ErrorRecoveryInfo {
  hasStackOverflow: boolean;
  overflowDepth: number;
  errorPlaceholderCount: number;
  recoveredNodes: number;
  totalNodes: number;
}

export interface ProjectData {
  id: string;
  name: string;
  sourceCode: string;
  language: 'javascript' | 'typescript';
  astCache: ASTNode | null;
  layoutCache: LayoutResult | null;
  createdAt: string;
  updatedAt: string;
}
