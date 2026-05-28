import { create } from 'zustand';
import {
  Vertex,
  Fragment,
  SymmetryConfig,
  LightConfig,
  KaleidoscopeProject,
  VoronoiCell,
  SymmetryResult,
  StatusInfo,
} from '../types';

interface KaleidoscopeState {
  projectName: string;
  projectId: string | null;
  vertices: Vertex[];
  fragments: Fragment[];
  symmetry: SymmetryConfig;
  lightSource: LightConfig;
  voronoiCells: VoronoiCell[];
  symmetryResult: SymmetryResult | null;
  selectedFragment: string | null;
  animationProgress: number;
  isAnimating: boolean;
  status: StatusInfo;
  warnings: string[];

  setProjectName: (name: string) => void;
  setProjectId: (id: string | null) => void;
  addVertex: (vertex: Vertex) => void;
  updateVertex: (id: string, x: number, y: number) => void;
  removeVertex: (id: string) => void;
  setVertices: (vertices: Vertex[]) => void;
  addFragment: (fragment: Fragment) => void;
  updateFragment: (id: string, updates: Partial<Fragment>) => void;
  removeFragment: (id: string) => void;
  setFragments: (fragments: Fragment[]) => void;
  setSymmetry: (symmetry: SymmetryConfig) => void;
  setLightSource: (light: LightConfig) => void;
  setVoronoiCells: (cells: VoronoiCell[]) => void;
  setSymmetryResult: (result: SymmetryResult | null) => void;
  selectFragment: (id: string | null) => void;
  setAnimationProgress: (progress: number) => void;
  setIsAnimating: (animating: boolean) => void;
  setStatus: (status: Partial<StatusInfo>) => void;
  addWarning: (warning: string) => void;
  clearWarnings: () => void;
  loadProject: (project: KaleidoscopeProject) => void;
  resetProject: () => void;
}

const defaultSymmetry: SymmetryConfig = {
  type: 'dihedral',
  order: 6,
  mirrorAngle: 60,
};

const defaultLight: LightConfig = {
  angle: 45,
  colorTemperature: 5500,
  intensity: 1.0,
  position: { x: 0, y: 2, z: 5 },
};

export const useKaleidoscopeStore = create<KaleidoscopeState>((set) => ({
  projectName: '未命名工程',
  projectId: null,
  vertices: [
    { id: 'v1', x: 0, y: 0 },
    { id: 'v2', x: 0.3, y: 0 },
    { id: 'v3', x: 0, y: 0.3 },
    { id: 'v4', x: -0.2, y: 0.2 },
  ],
  fragments: [
    {
      id: 'f1',
      vertices: ['v1', 'v2', 'v3'],
      color: '#e74c3c',
      transparency: 0.4,
      refractiveIndex: 1.5,
    },
    {
      id: 'f2',
      vertices: ['v1', 'v3', 'v4'],
      color: '#3498db',
      transparency: 0.35,
      refractiveIndex: 1.52,
    },
  ],
  symmetry: defaultSymmetry,
  lightSource: defaultLight,
  voronoiCells: [],
  symmetryResult: null,
  selectedFragment: null,
  animationProgress: 0,
  isAnimating: false,
  status: {
    fps: 60,
    reflectionCount: 0,
    warnings: [],
    symmetryType: 'dihedral',
  },
  warnings: [],

  setProjectName: (name) => set({ projectName: name }),
  setProjectId: (id) => set({ projectId: id }),

  addVertex: (vertex) =>
    set((state) => ({ vertices: [...state.vertices, vertex] })),

  updateVertex: (id, x, y) =>
    set((state) => ({
      vertices: state.vertices.map((v) =>
        v.id === id ? { ...v, x, y } : v
      ),
    })),

  removeVertex: (id) =>
    set((state) => ({
      vertices: state.vertices.filter((v) => v.id !== id),
      fragments: state.fragments.map((f) => ({
        ...f,
        vertices: f.vertices.filter((vid) => vid !== id),
      })),
    })),

  setVertices: (vertices) => set({ vertices }),

  addFragment: (fragment) =>
    set((state) => ({ fragments: [...state.fragments, fragment] })),

  updateFragment: (id, updates) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),

  removeFragment: (id) =>
    set((state) => ({
      fragments: state.fragments.filter((f) => f.id !== id),
    })),

  setFragments: (fragments) => set({ fragments }),

  setSymmetry: (symmetry) => set({ symmetry }),

  setLightSource: (light) => set({ lightSource: light }),

  setVoronoiCells: (cells) => set({ voronoiCells: cells }),

  setSymmetryResult: (result) => set({ symmetryResult: result }),

  selectFragment: (id) => set({ selectedFragment: id }),

  setAnimationProgress: (progress) => set({ animationProgress: progress }),

  setIsAnimating: (animating) => set({ isAnimating: animating }),

  setStatus: (status) =>
    set((state) => ({ status: { ...state.status, ...status } })),

  addWarning: (warning) =>
    set((state) => ({
      warnings: [...new Set([...state.warnings, warning])],
    })),

  clearWarnings: () => set({ warnings: [] }),

  loadProject: (project) =>
    set({
      projectId: project.id || null,
      projectName: project.name,
      vertices: project.vertices,
      fragments: project.fragments,
      symmetry: project.symmetry,
      lightSource: project.lightSource,
    }),

  resetProject: () =>
    set({
      projectName: '未命名工程',
      projectId: null,
      vertices: [],
      fragments: [],
      symmetry: defaultSymmetry,
      lightSource: defaultLight,
      voronoiCells: [],
      symmetryResult: null,
      selectedFragment: null,
      warnings: [],
    }),
}));
