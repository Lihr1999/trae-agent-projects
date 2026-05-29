export interface Point {
  x: number;
  y: number;
  z?: number;
}

export interface BezierCurve {
  id: string;
  startPoint: Point;
  controlPoint1: Point;
  controlPoint2: Point;
  endPoint: Point;
}

export interface GlassFragment {
  id: string;
  name: string;
  curves: BezierCurve[];
  vertices: Point[];
  materialId: string;
  csgOperation?: 'union' | 'intersection' | 'difference';
  csgChildren?: string[];
}

export interface Material {
  id: string;
  name: string;
  refractiveIndex: number;
  dispersionCoefficient: number;
  subsurfaceScattering: number;
  anisotropy: number;
  color: { r: number; g: number; b: number };
  absorption: number;
  roughness: number;
}

export interface LightSource {
  id: string;
  name: string;
  position: Point;
  spectrum: { wavelength: number; intensity: number }[];
  polarization: { angle: number; ellipticity: number };
  intensity: number;
  type: 'point' | 'directional' | 'spot';
}

export interface SpaceGroup {
  type: '2d' | 'spherical' | 'hyperbolic';
  schlafliSymbol: string;
  p: number;
  q: number;
  generators: number[][];
  mirrorAngle: number;
  mirrorCount: number;
}

export interface KaleidoscopeConfig {
  id: string;
  name: string;
  spaceGroup: SpaceGroup;
  fragments: GlassFragment[];
  materials: Material[];
  lights: LightSource[];
  animationSpeed: number;
  causticIntensity: number;
  interferenceStrength: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  config: KaleidoscopeConfig;
  csgTree: CSGNode;
}

export interface CSGNode {
  id: string;
  type: 'primitive' | 'operation';
  operation?: 'union' | 'intersection' | 'difference';
  fragmentId?: string;
  children?: CSGNode[];
  transform?: number[];
}

export interface OperationLog {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
  previousHash: string;
  hash: string;
}

export interface PresetScene {
  id: string;
  name: string;
  description: string;
  config: Partial<KaleidoscopeConfig>;
}

export interface DelaunayResult {
  points: Point[];
  triangles: number[][];
  edges: number[][];
}

export interface Photon {
  position: Point;
  direction: Point;
  wavelength: number;
  intensity: number;
  polarization: number;
  depth: number;
}

export interface CausticPattern {
  positions: Point[];
  intensities: number[];
  wavelengths: number[];
}
