import { create } from 'zustand';
import type {
  ASTNode,
  LayoutResult,
  DiffResult,
  AnimationState,
  PerformanceMetrics,
  ScenePreset,
} from '../../../../packages/shared/src';
import { api } from '../services/api';

const DEFAULT_SOURCE = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(result);
`;

const DEFAULT_ANIMATION: AnimationState = {
  type: 'none',
  progress: 0,
  duration: 0,
  startTime: 0,
  affectedNodes: [],
};

const DEFAULT_METRICS: PerformanceMetrics = {
  nodeCount: 0,
  drawCalls: 0,
  fps: 60,
  parseTime: 0,
  layoutTime: 0,
  memoryUsage: 0,
};

function flattenAST(node: ASTNode): ASTNode[] {
  const nodes: ASTNode[] = [node];
  for (const child of node.children) {
    nodes.push(...flattenAST(child));
  }
  return nodes;
}

function assignParentIds(node: ASTNode, parentId: string | null = null, depth: number = 0): ASTNode {
  const updated: ASTNode = {
    ...node,
    parentId,
    depth,
    hasError: node.hasError || false,
    isErrorPlaceholder: node.isErrorPlaceholder || false,
  };
  updated.children = node.children.map((child) => assignParentIds(child, node.id, depth + 1));
  return updated;
}

export type LayoutAlgorithm = 'hybrid' | 'reingold-tilford' | 'force-directed';
export type CoordinateSystem = 'sphere' | 'cylinder' | 'cartesian';

interface StoreState {
  sourceCode: string;
  language: 'javascript' | 'typescript';
  astNodes: ASTNode[];
  astRoot: ASTNode | null;
  layoutResult: LayoutResult | null;
  selectedNodeIds: string[];
  highlightedNodeIds: string[];
  collapsedNodeIds: Set<string>;
  diffResult: DiffResult | null;
  animationState: AnimationState;
  performanceMetrics: PerformanceMetrics;
  layoutAlgorithm: LayoutAlgorithm;
  coordinateSystem: CoordinateSystem;
  isLoading: boolean;
  error: string | null;
  showDiffPanel: boolean;
}

interface StoreActions {
  setSourceCode: (code: string) => void;
  setLanguage: (lang: 'javascript' | 'typescript') => void;
  parseCode: () => Promise<void>;
  computeLayout: () => Promise<void>;
  computeDiff: (sourceA: string, sourceB: string) => Promise<void>;
  selectNodes: (ids: string[]) => void;
  highlightNodes: (ids: string[]) => void;
  toggleCollapse: (nodeId: string) => void;
  collapseAll: () => void;
  expandAll: () => void;
  loadScene: (preset: ScenePreset) => void;
  setAnimationState: (state: AnimationState) => void;
  setLayoutAlgorithm: (algo: LayoutAlgorithm) => void;
  setCoordinateSystem: (cs: CoordinateSystem) => void;
  setError: (msg: string) => void;
  clearError: () => void;
  toggleDiffPanel: () => void;
  triggerExplodeAnimation: () => void;
  triggerPulseAnimation: (nodeIds: string[]) => void;
  stopAnimation: () => void;
}

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  sourceCode: DEFAULT_SOURCE,
  language: 'javascript',
  astNodes: [],
  astRoot: null,
  layoutResult: null,
  selectedNodeIds: [],
  highlightedNodeIds: [],
  collapsedNodeIds: new Set<string>(),
  diffResult: null,
  animationState: DEFAULT_ANIMATION,
  performanceMetrics: DEFAULT_METRICS,
  layoutAlgorithm: 'hybrid',
  coordinateSystem: 'cartesian',
  isLoading: false,
  error: null,
  showDiffPanel: false,

  setSourceCode: (code) => set({ sourceCode: code }),

  setLanguage: (lang) => set({ language: lang }),

  parseCode: async () => {
    const { sourceCode, language } = get();
    set({ isLoading: true, error: null });
    try {
      const startTime = performance.now();
      const result = await api.parseCode({ source: sourceCode, language });
      const parseTime = performance.now() - startTime;
      const enrichedAst = assignParentIds(result.ast);
      const flatNodes = flattenAST(enrichedAst);
      set({
        astRoot: enrichedAst,
        astNodes: flatNodes,
        isLoading: false,
        performanceMetrics: {
          ...get().performanceMetrics,
          nodeCount: result.nodeCount,
          parseTime,
        },
      });
      await get().computeLayout();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Parse failed';
      set({ isLoading: false, error: message });
    }
  },

  computeLayout: async () => {
    const { astRoot, layoutAlgorithm, coordinateSystem } = get();
    if (!astRoot) return;
    set({ isLoading: true, error: null });
    try {
      const startTime = performance.now();
      const result = await api.computeLayout({
        ast: astRoot,
        params: {
          algorithm: layoutAlgorithm,
          coordinateSystem,
          nodeSpacing: 2.0,
          layerSpacing: 8.0,
          repulsionStrength: 50,
          attractionStrength: 0.01,
          maxIterations: 100,
        },
      });
      const layoutTime = performance.now() - startTime;
      set({
        layoutResult: result,
        isLoading: false,
        performanceMetrics: {
          ...get().performanceMetrics,
          layoutTime,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Layout computation failed';
      set({ isLoading: false, error: message });
    }
  },

  computeDiff: async (sourceA, sourceB) => {
    const { language } = get();
    set({ isLoading: true, error: null });
    try {
      const [parseA, parseB] = await Promise.all([
        api.parseCode({ source: sourceA, language }),
        api.parseCode({ source: sourceB, language }),
      ]);
      const result = await api.computeDiff({ astA: parseA.ast, astB: parseB.ast });
      set({ diffResult: result, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Diff computation failed';
      set({ isLoading: false, error: message });
    }
  },

  selectNodes: (ids) => set({ selectedNodeIds: ids }),

  highlightNodes: (ids) => set({ highlightedNodeIds: ids }),

  toggleCollapse: (nodeId) => {
    const next = new Set(get().collapsedNodeIds);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    set({ collapsedNodeIds: next });
  },

  collapseAll: () => {
    const { astNodes } = get();
    const parentIds = astNodes.filter((n) => n.children && n.children.length > 0).map((n) => n.id);
    set({ collapsedNodeIds: new Set(parentIds) });
  },

  expandAll: () => set({ collapsedNodeIds: new Set() }),

  loadScene: (preset) => {
    set({
      sourceCode: preset.sourceCode,
      language: preset.language,
      selectedNodeIds: [],
      highlightedNodeIds: [],
      collapsedNodeIds: new Set(),
      diffResult: null,
      animationState: DEFAULT_ANIMATION,
    });
    setTimeout(() => get().parseCode(), 0);
  },

  setAnimationState: (state) => set({ animationState: state }),

  setLayoutAlgorithm: (algo) => {
    set({ layoutAlgorithm: algo });
    if (get().astRoot) {
      get().computeLayout();
    }
  },

  setCoordinateSystem: (cs) => {
    set({ coordinateSystem: cs });
    if (get().astRoot) {
      get().computeLayout();
    }
  },

  setError: (msg) => set({ error: msg }),

  clearError: () => set({ error: null }),

  toggleDiffPanel: () => set((s) => ({ showDiffPanel: !s.showDiffPanel })),

  triggerExplodeAnimation: () => {
    const { layoutResult } = get();
    if (!layoutResult) return;
    set({
      animationState: {
        type: 'explode',
        progress: 0,
        duration: 2000,
        startTime: performance.now(),
        affectedNodes: layoutResult.nodes.map((n) => n.id),
      },
    });
  },

  triggerPulseAnimation: (nodeIds: string[]) => {
    set({
      animationState: {
        type: 'pulse',
        progress: 0,
        duration: 1000,
        startTime: performance.now(),
        affectedNodes: nodeIds,
      },
    });
  },

  stopAnimation: () => set({ animationState: DEFAULT_ANIMATION }),
}));
