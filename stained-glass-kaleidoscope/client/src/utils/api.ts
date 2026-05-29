import axios from 'axios';
import {
  Project,
  Point,
  DelaunayResult,
  SpaceGroup,
  LightSource,
  GlassFragment,
  Material,
  Photon,
  CausticPattern,
  PresetScene
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export const projectAPI = {
  getAll: async (): Promise<Project[]> => {
    const response = await api.get('/projects');
    return response.data.data;
  },

  get: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data.data;
  },

  create: async (project: Partial<Project>): Promise<Project> => {
    const response = await api.post('/projects', project);
    return response.data.data;
  },

  update: async (id: string, project: Partial<Project>): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, project);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  undo: async (id: string): Promise<any> => {
    const response = await api.post(`/projects/${id}/undo`);
    return response.data.data;
  },

  logOperation: async (id: string, type: string, payload: any): Promise<any> => {
    const response = await api.post(`/projects/${id}/log`, { type, payload });
    return response.data.data;
  }
};

export const computationAPI = {
  delaunay: async (points: Point[]): Promise<DelaunayResult> => {
    const response = await api.post('/compute/delaunay', { points });
    return response.data.data;
  },

  csg: async (operation: string, polygonA: Point[], polygonB: Point[]): Promise<Point[]> => {
    const response = await api.post('/compute/csg', { operation, polygonA, polygonB });
    return response.data.data;
  },

  photons: async (
    lights: LightSource[],
    fragments: GlassFragment[],
    materials: Material[],
    bounds: { width: number; height: number }
  ): Promise<{ photons: Photon[]; causticPattern: CausticPattern }> => {
    const response = await api.post('/compute/photons', { lights, fragments, materials, bounds });
    return response.data.data;
  },

  spaceGroup: async (type: string, p: number, q: number): Promise<SpaceGroup> => {
    const response = await api.post('/compute/spacegroup', { type, p, q });
    return response.data.data;
  },

  tessellation: async (
    basePoints: Point[],
    spaceGroup: SpaceGroup,
    iterations: number = 5
  ): Promise<Point[][]> => {
    const response = await api.post('/compute/tessellation', { basePoints, spaceGroup, iterations });
    return response.data.data;
  },

  slerp: async (matrix1: number[], matrix2: number[], t: number): Promise<number[]> => {
    const response = await api.post('/compute/slerp', { matrix1, matrix2, t });
    return response.data.data;
  }
};

export const presetAPI = {
  getAll: async (): Promise<PresetScene[]> => {
    const response = await api.get('/presets');
    return response.data.data;
  },

  get: async (id: string): Promise<PresetScene> => {
    const response = await api.get(`/presets/${id}`);
    return response.data.data;
  }
};

export const materialAPI = {
  getAll: async (): Promise<Material[]> => {
    const response = await api.get('/materials');
    return response.data.data;
  },

  create: async (material: Material): Promise<Material> => {
    const response = await api.post('/materials', material);
    return response.data.data;
  }
};

export default api;
