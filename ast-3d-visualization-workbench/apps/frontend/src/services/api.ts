import axios from 'axios';
import type {
  ParseRequest,
  ParseResult,
  LayoutResult,
  DiffResult,
  ScenePreset,
} from '../../../../packages/shared/src';

const API_BASE = '/api';

const http = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

export const api = {
  parseCode(request: ParseRequest): Promise<ParseResult> {
    return http
      .post<ParseResult>('/parser/parse', request)
      .then((res) => res.data);
  },

  computeLayout(request: {
    ast: ParseResult['ast'];
    params: Record<string, unknown>;
  }): Promise<LayoutResult> {
    return http
      .post<LayoutResult>('/layout/compute', request)
      .then((res) => res.data);
  },

  computeDiff(request: { astA: ParseResult['ast']; astB: ParseResult['ast'] }): Promise<DiffResult> {
    return http
      .post<DiffResult>('/diff/compute', request)
      .then((res) => res.data);
  },

  getScenes(): Promise<ScenePreset[]> {
    return http.get<ScenePreset[]>('/scenes').then((res) => res.data);
  },

  getScene(id: string): Promise<ScenePreset> {
    return http.get<ScenePreset>(`/scenes/${id}`).then((res) => res.data);
  },
};
