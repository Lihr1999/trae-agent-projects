import axios from 'axios';
import type {
  ConfigListItem,
  Config,
  PresetScene,
  SaveConfigRequest,
  SaveConfigResponse,
  RayMarchRequest,
  RayMarchResponse,
  NoiseRequest,
  NoiseResponse
} from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const configApi = {
  async list(): Promise<ConfigListItem[]> {
    const response = await api.get<ConfigListItem[]>('/configs');
    return response.data;
  },

  async get(id: string): Promise<Config> {
    const response = await api.get<Config>(`/configs/${id}`);
    return response.data;
  },

  async save(request: SaveConfigRequest): Promise<SaveConfigResponse> {
    const response = await api.post<SaveConfigResponse>('/configs', request);
    return response.data;
  },

  async update(id: string, request: SaveConfigRequest): Promise<SaveConfigResponse> {
    const response = await api.put<SaveConfigResponse>(`/configs/${id}`, request);
    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/configs/${id}`);
    return response.data;
  }
};

export const presetApi = {
  async list(): Promise<PresetScene[]> {
    const response = await api.get<PresetScene[]>('/presets');
    return response.data;
  },

  async get(id: string): Promise<PresetScene> {
    const response = await api.get<PresetScene>(`/presets/${id}`);
    return response.data;
  }
};

export const cloudApi = {
  async rayMarch(request: RayMarchRequest): Promise<RayMarchResponse> {
    const response = await api.post<RayMarchResponse>('/cloud/raymarch', request);
    return response.data;
  },

  async noise(request: NoiseRequest): Promise<NoiseResponse> {
    const response = await api.post<NoiseResponse>('/cloud/noise', request);
    return response.data;
  }
};

export const healthApi = {
  async check(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;
