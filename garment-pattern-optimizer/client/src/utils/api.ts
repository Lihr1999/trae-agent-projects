import type { Polygon, Project, MarkerResult, PresetScene, Point, NFPResult } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  health: () => request<{ status: string; timestamp: number }>('/health'),

  presets: {
    list: () => request<Array<{ id: string; name: string; description: string }>>('/presets'),
    get: (id: string) => request<PresetScene>(`/presets/${id}`),
    load: (id: string) => request<PresetScene & { project: Project }>(`/presets/${id}/load`)
  },

  projects: {
    list: () => request<Array<{ id: string; name: string; createdAt: number; updatedAt: number }>>('/projects'),
    get: (id: string) => request<Project>(`/projects/${id}`),
    create: (project: Omit<Project, 'createdAt' | 'updatedAt'>) => 
      request<Project>('/projects', { method: 'POST', body: JSON.stringify(project) }),
    update: (project: Project) => 
      request<Project>(`/projects/${project.id}`, { method: 'PUT', body: JSON.stringify(project) }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
    saveMarkerResult: (id: string, result: MarkerResult) =>
      request<{ success: boolean }>(`/projects/${id}/marker-result`, { 
        method: 'POST', 
        body: JSON.stringify(result) 
      })
  },

  polygons: {
    validate: (points: Point[]) => 
      request<{
        valid: boolean;
        isSimple: boolean;
        selfIntersections: Point[];
        warnings?: any[];
      }>('/polygons/validate', { method: 'POST', body: JSON.stringify({ points }) }),
    
    area: (points: Point[]) =>
      request<{ area: number; signedArea: number }>('/polygons/area', { 
        method: 'POST', 
        body: JSON.stringify({ points }) 
      }),
    
    bounds: (points: Point[]) =>
      request<{ bounds: any; width: number; height: number }>('/polygons/bounds', { 
        method: 'POST', 
        body: JSON.stringify({ points }) 
      }),
    
    transform: (data: {
      points: Point[];
      rotation?: number;
      translation?: { dx: number; dy: number };
      scale?: { sx: number; sy: number };
      center?: Point;
    }) =>
      request<{ points: Point[] }>('/polygons/transform', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    
    checkGrainConstraint: (data: {
      rotation: number;
      grainAngle: number;
      tolerance?: number;
    }) =>
      request<{
        valid: boolean;
        angleDiff: number;
        tolerance: number;
        validRotations: number[];
        hasSolution: boolean;
        warning?: any;
      }>('/polygons/check-grain-constraint', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      })
  },

  nesting: {
    compute: (data: {
      polygons: Polygon[];
      fabricWidth: number;
      fabricHeight: number;
      rotationStep?: number;
      gap?: number;
    }) =>
      request<MarkerResult>('/nesting/compute', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    
    computeNFP: (data: {
      stationary: Point[];
      moving: Point[];
      detectSingularities?: boolean;
    }) =>
      request<NFPResult & { warnings?: any[] }>('/nesting/nfp', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    
    computeInnerNFP: (data: {
      container: Point[];
      polygon: Point[];
    }) =>
      request<NFPResult>('/nesting/inner-nfp', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      }),
    
    validateMarker: (data: {
      placements: Array<{ polygonId: string; position: Point; rotation: number }>;
      polygons: Polygon[];
      fabricWidth: number;
      fabricHeight: number;
    }) =>
      request<{
        valid: boolean;
        errors: any[];
        warnings: any[];
        utilization: number;
        totalArea: number;
        fabricArea: number;
      }>('/nesting/validate-marker', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      })
  }
};

export default api;
