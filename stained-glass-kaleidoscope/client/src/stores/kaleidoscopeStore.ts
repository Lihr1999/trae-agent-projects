import { create } from 'zustand';
import {
  KaleidoscopeConfig,
  GlassFragment,
  Material,
  LightSource,
  SpaceGroup,
  Point,
  BezierCurve,
  Photon,
  CausticPattern
} from '../types';

interface KaleidoscopeState {
  config: KaleidoscopeConfig;
  selectedFragmentId: string | null;
  selectedMaterialId: string | null;
  photons: Photon[];
  causticPattern: CausticPattern | null;
  isPlaying: boolean;
  animationTime: number;
  tool: 'select' | 'bezier' | 'move' | 'scale' | 'rotate';
  currentCurve: BezierCurve | null;
  tessellatedCells: Point[][];
  
  setConfig: (config: Partial<KaleidoscopeConfig>) => void;
  setSpaceGroup: (spaceGroup: SpaceGroup) => void;
  addFragment: (fragment: GlassFragment) => void;
  updateFragment: (id: string, updates: Partial<GlassFragment>) => void;
  removeFragment: (id: string) => void;
  selectFragment: (id: string | null) => void;
  addMaterial: (material: Material) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  removeMaterial: (id: string) => void;
  selectMaterial: (id: string | null) => void;
  addLightSource: (light: LightSource) => void;
  updateLightSource: (id: string, updates: Partial<LightSource>) => void;
  removeLightSource: (id: string) => void;
  setPhotons: (photons: Photon[]) => void;
  setCausticPattern: (pattern: CausticPattern | null) => void;
  setPlaying: (playing: boolean) => void;
  setAnimationTime: (time: number) => void;
  setTool: (tool: 'select' | 'bezier' | 'move' | 'scale' | 'rotate') => void;
  setCurrentCurve: (curve: BezierCurve | null) => void;
  setTessellatedCells: (cells: Point[][]) => void;
  loadPreset: (config: Partial<KaleidoscopeConfig>) => void;
  reset: () => void;
}

const defaultSpaceGroup: SpaceGroup = {
  type: '2d',
  schlafliSymbol: '{6,3}',
  p: 6,
  q: 3,
  generators: [],
  mirrorAngle: Math.PI / 6,
  mirrorCount: 6
};

const defaultMaterials: Material[] = [
  {
    id: 'mat_default_1',
    name: 'Clear Glass',
    refractiveIndex: 1.52,
    dispersionCoefficient: 0.01,
    subsurfaceScattering: 0.2,
    anisotropy: 0.1,
    color: { r: 0.95, g: 0.95, b: 1.0 },
    absorption: 0.05,
    roughness: 0.02
  }
];

const defaultLights: LightSource[] = [
  {
    id: 'light_default',
    name: 'Main Light',
    position: { x: 0, y: 0, z: 2 },
    spectrum: [
      { wavelength: 450, intensity: 0.8 },
      { wavelength: 550, intensity: 1.0 },
      { wavelength: 650, intensity: 0.9 }
    ],
    polarization: { angle: 0, ellipticity: 0 },
    intensity: 1.0,
    type: 'point'
  }
];

const initialConfig: KaleidoscopeConfig = {
  id: 'config_default',
  name: 'Untitled Kaleidoscope',
  spaceGroup: defaultSpaceGroup,
  fragments: [],
  materials: defaultMaterials,
  lights: defaultLights,
  animationSpeed: 1,
  causticIntensity: 1,
  interferenceStrength: 1
};

export const useKaleidoscopeStore = create<KaleidoscopeState>((set) => ({
  config: initialConfig,
  selectedFragmentId: null,
  selectedMaterialId: null,
  photons: [],
  causticPattern: null,
  isPlaying: false,
  animationTime: 0,
  tool: 'select',
  currentCurve: null,
  tessellatedCells: [],

  setConfig: (updates) => set((state) => ({
    config: { ...state.config, ...updates }
  })),

  setSpaceGroup: (spaceGroup) => set((state) => ({
    config: { ...state.config, spaceGroup }
  })),

  addFragment: (fragment) => set((state) => ({
    config: {
      ...state.config,
      fragments: [...state.config.fragments, fragment]
    }
  })),

  updateFragment: (id, updates) => set((state) => ({
    config: {
      ...state.config,
      fragments: state.config.fragments.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      )
    }
  })),

  removeFragment: (id) => set((state) => ({
    config: {
      ...state.config,
      fragments: state.config.fragments.filter((f) => f.id !== id)
    },
    selectedFragmentId: state.selectedFragmentId === id ? null : state.selectedFragmentId
  })),

  selectFragment: (id) => set({ selectedFragmentId: id }),

  addMaterial: (material) => set((state) => ({
    config: {
      ...state.config,
      materials: [...state.config.materials, material]
    }
  })),

  updateMaterial: (id, updates) => set((state) => ({
    config: {
      ...state.config,
      materials: state.config.materials.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      )
    }
  })),

  removeMaterial: (id) => set((state) => ({
    config: {
      ...state.config,
      materials: state.config.materials.filter((m) => m.id !== id)
    },
    selectedMaterialId: state.selectedMaterialId === id ? null : state.selectedMaterialId
  })),

  selectMaterial: (id) => set({ selectedMaterialId: id }),

  addLightSource: (light) => set((state) => ({
    config: {
      ...state.config,
      lights: [...state.config.lights, light]
    }
  })),

  updateLightSource: (id, updates) => set((state) => ({
    config: {
      ...state.config,
      lights: state.config.lights.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      )
    }
  })),

  removeLightSource: (id) => set((state) => ({
    config: {
      ...state.config,
      lights: state.config.lights.filter((l) => l.id !== id)
    }
  })),

  setPhotons: (photons) => set({ photons }),

  setCausticPattern: (pattern) => set({ causticPattern: pattern }),

  setPlaying: (playing) => set({ isPlaying: playing }),

  setAnimationTime: (time) => set({ animationTime: time }),

  setTool: (tool) => set({ tool }),

  setCurrentCurve: (curve) => set({ currentCurve: curve }),

  setTessellatedCells: (cells) => set({ tessellatedCells: cells }),

  loadPreset: (presetConfig) => set((state) => ({
    config: {
      ...state.config,
      ...presetConfig
    }
  })),

  reset: () => set({
    config: initialConfig,
    selectedFragmentId: null,
    selectedMaterialId: null,
    photons: [],
    causticPattern: null,
    isPlaying: false,
    animationTime: 0,
    tool: 'select',
    currentCurve: null,
    tessellatedCells: []
  })
}));
