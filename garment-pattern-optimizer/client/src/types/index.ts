export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  id: string;
  name: string;
  points: Point[];
  grainAngle: number;
  rotation: number;
  position: Point;
  color: string;
  quantity: number;
}

export interface NFPResult {
  polygon: Point[];
  valid: boolean;
  error?: string;
  singularityPoints?: Point[];
}

export interface Placement {
  polygonId: string;
  position: Point;
  rotation: number;
  overlap: boolean;
  step?: number;
}

export interface MarkerResult {
  placements: Placement[];
  utilization: number;
  fabricWidth: number;
  fabricHeight: number;
  totalArea: number;
  usedArea: number;
  computationTime: number;
  steps: MarkerStep[];
  warnings?: MarkerWarning[];
}

export interface MarkerStep {
  step: number;
  placement: Placement;
  nfpPolygon?: Point[];
  isValid: boolean;
}

export interface MarkerWarning {
  type: 'singularity' | 'zero_width_gap' | 'self_intersection' | 'no_solution' | 'collision';
  message: string;
  polygonIds?: string[];
  highlightPoints?: Point[];
}

export interface PresetScene {
  id: string;
  name: string;
  description: string;
  polygons: Polygon[];
  fabricWidth: number;
  fabricHeight: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  polygons: Polygon[];
  markerResult?: MarkerResult;
  fabricWidth: number;
  fabricHeight: number;
}

export interface AnimationState {
  isPlaying: boolean;
  currentStep: number;
  progress: number;
  type: 'translation' | 'rotation' | 'nesting' | 'collision' | 'flow' | null;
  animatedPolygons: AnimatedPolygon[];
}

export interface AnimatedPolygon {
  polygonId: string;
  from: { position: Point; rotation: number };
  to: { position: Point; rotation: number };
  startTime: number;
  duration: number;
  easing: string;
}

export interface DrawingState {
  mode: 'select' | 'draw' | 'edit' | 'move' | 'rotate';
  selectedPolygonId: string | null;
  selectedVertexIndex: number | null;
  isDrawing: boolean;
  currentPoints: Point[];
  hoveredPoint: Point | null;
}

export interface FabricFlowState {
  offset: number;
  direction: Point;
  speed: number;
  pattern: string;
}

export type ToolType = 'select' | 'pen' | 'rectangle' | 'move' | 'rotate' | 'delete';
