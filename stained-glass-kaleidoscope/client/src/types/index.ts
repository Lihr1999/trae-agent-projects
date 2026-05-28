export interface Point {
  x: number;
  y: number;
}

export interface Vertex extends Point {
  id: string;
}

export interface Fragment {
  id: string;
  vertices: string[];
  color: string;
  transparency: number;
  refractiveIndex: number;
}

export type SymmetryType = 'dihedral' | 'cyclic' | 'spherical' | 'hyperbolic';

export interface SymmetryConfig {
  type: SymmetryType;
  order: number;
  mirrorAngle: number;
  schlafli?: string;
}

export interface LightConfig {
  angle: number;
  colorTemperature: number;
  intensity: number;
  position: { x: number; y: number; z: number };
}

export interface KaleidoscopeProject {
  id?: string;
  name: string;
  vertices: Vertex[];
  fragments: Fragment[];
  symmetry: SymmetryConfig;
  lightSource: LightConfig;
}

export interface VoronoiCell {
  site: Point;
  vertices: Point[];
  neighbors: number[];
}

export interface VoronoiEdge {
  start: Point;
  end: Point;
  left: number;
  right: number;
}

export interface SymmetryResult {
  matrices: number[][][];
  generators: number[][][];
  fundamentalDomain: Point[];
  warnings: string[];
  seamInfo?: {
    hasSeam: boolean;
    gapAngle: number;
  };
}

export interface Preset {
  id: string;
  name: string;
  description: string | null;
}

export interface StatusInfo {
  fps: number;
  reflectionCount: number;
  warnings: string[];
  symmetryType: string;
}
