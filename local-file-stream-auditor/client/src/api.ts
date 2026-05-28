import axios from 'axios';
import { FieldRule, PresetInfo, FileRecord, AuditReport, Anomaly, FieldStats } from './types';

const API_BASE = '/api';

export const api = {
  uploadFile: (file: File, rules: FieldRule[], format: 'csv' | 'jsonl') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('rules', JSON.stringify(rules));
    formData.append('format', format);
    return axios.post<{ streamId: string }>(`${API_BASE}/upload`, formData);
  },

  loadPreset: (type: PresetInfo['type'], rules: FieldRule[]) => {
    return axios.post<{ streamId: string; presetInfo: any }>(`${API_BASE}/preset/${type}`, {
      rules: JSON.stringify(rules),
    });
  },

  getPresets: () => {
    return axios.get<PresetInfo[]>(`${API_BASE}/presets`);
  },

  getFiles: () => {
    return axios.get<FileRecord[]>(`${API_BASE}/files`);
  },

  getFile: (id: number) => {
    return axios.get<FileRecord>(`${API_BASE}/files/${id}`);
  },

  getFieldStats: (id: number) => {
    return axios.get<FieldStats[]>(`${API_BASE}/files/${id}/field-stats`);
  },

  getAnomalies: (id: number, type?: string) => {
    const params = type ? { type } : {};
    return axios.get<Anomaly[]>(`${API_BASE}/files/${id}/anomalies`, { params });
  },

  generateReport: (id: number) => {
    return axios.post<AuditReport>(`${API_BASE}/files/${id}/report`);
  },

  getReport: (id: number) => {
    return axios.get<AuditReport | null>(`${API_BASE}/files/${id}/report`);
  },

  getRules: () => {
    return axios.get<{ id: number; name: string; rules: FieldRule[] }[]>(`${API_BASE}/rules`);
  },

  saveRules: (name: string, rules: FieldRule[]) => {
    return axios.post(`${API_BASE}/rules`, { name, rules });
  },
};

export const createParseStream = (streamId: string, handlers: {
  onChunk: (chunk: any) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}) => {
  const eventSource = new EventSource(`${API_BASE}/parse-stream/${streamId}`);

  eventSource.addEventListener('chunk', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onChunk(data);
    } catch (e) {
      console.error('Parse chunk error:', e);
    }
  });

  eventSource.addEventListener('complete', (event) => {
    handlers.onComplete();
    eventSource.close();
  });

  eventSource.addEventListener('error', (event) => {
    try {
      const data = JSON.parse((event as any).data || '{}');
      handlers.onError(data.error || 'Unknown error');
    } catch (e) {
      handlers.onError('Stream error');
    }
    eventSource.close();
  });

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
  };

  return () => eventSource.close();
};
