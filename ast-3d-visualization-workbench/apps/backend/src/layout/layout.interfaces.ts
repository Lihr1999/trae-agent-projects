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

export interface LayoutParams {
  layerSpacing?: number;
  siblingSpacing?: number;
  subtreeSpacing?: number;
  angularSpread?: number;
  maxZDepth?: number;
  algorithm?: 'reingold-tilford' | 'force-directed' | 'hybrid';
  forceIterations?: number;
  repulsionStrength?: number;
  attractionStrength?: number;
  lodThreshold?: number;
}

export interface ASTNodeInput {
  id: string;
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  children: ASTNodeInput[];
  hasError?: boolean;
  isErrorPlaceholder?: boolean;
}
