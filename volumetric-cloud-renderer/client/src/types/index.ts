export interface CloudRenderParams {
  cloudDensity: number;
  cloudThickness: number;
  cloudCoverage: number;
  cloudHeight: number;
  lightIntensity: number;
  scatterCoeff: number;
  sunHeight: number;
  sunAzimuth: number;
  windSpeed: number;
  windDirection: number;
  particleSpeed: number;
  sampleCount: number;
  noiseResolution: number;
  renderScale: number;
  transitionProgress?: number;
  noiseVisualization?: boolean;
}

export interface ConfigListItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  preview?: string;
}

export interface Config extends ConfigListItem {
  params: CloudRenderParams;
}

export interface PresetScene {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  params: CloudRenderParams;
  category: 'static' | 'dynamic' | 'lighting' | 'stress';
}

export interface SaveConfigRequest {
  name: string;
  description?: string;
  params: CloudRenderParams;
}

export interface SaveConfigResponse {
  success: boolean;
  id: string;
  message: string;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  timestamp: string;
}

export type SystemStatus = 'normal' | 'warning' | 'error';

export interface AlertNotification {
  type: 'alert-notification';
  level: 'warning' | 'error' | 'info';
  message: string;
  data?: PerformanceMetrics;
}

export type WebSocketMessage =
  | { type: 'param-update'; params: CloudRenderParams }
  | { type: 'param-broadcast'; params: CloudRenderParams; timestamp: string }
  | { type: 'performance-report'; metrics: PerformanceMetrics }
  | AlertNotification;

export interface RayMarchRequest {
  rayOrigin: [number, number, number];
  rayDir: [number, number, number];
  params: CloudRenderParams;
  maxSteps?: number;
}

export interface RayMarchResponse {
  color: [number, number, number];
  density: number;
  depth: number;
  steps: number;
}

export interface NoiseRequest {
  position: [number, number, number];
  octaves?: number;
  frequency?: number;
  lacunarity?: number;
  gain?: number;
}

export interface NoiseResponse {
  value: number;
  fbmValue: number;
  derivatives?: [number, number, number];
}

export const DEFAULT_PARAMS: CloudRenderParams = {
  cloudDensity: 1.2,
  cloudThickness: 2.5,
  cloudCoverage: 0.5,
  cloudHeight: 1500,
  lightIntensity: 2.0,
  scatterCoeff: 0.6,
  sunHeight: 60,
  sunAzimuth: 135,
  windSpeed: 0,
  windDirection: 0,
  particleSpeed: 0,
  sampleCount: 96,
  noiseResolution: 128,
  renderScale: 1.0,
  transitionProgress: 1.0,
  noiseVisualization: false
};

export const PARAM_RANGES: Record<keyof CloudRenderParams, { min: number; max: number; step: number; label: string }> = {
  cloudDensity: { min: 0.1, max: 5.0, step: 0.1, label: '云层密度' },
  cloudThickness: { min: 0.5, max: 10.0, step: 0.5, label: '云层厚度' },
  cloudCoverage: { min: 0.0, max: 1.0, step: 0.05, label: '云层覆盖率' },
  cloudHeight: { min: 500, max: 5000, step: 100, label: '云层高度' },
  lightIntensity: { min: 0.1, max: 5.0, step: 0.1, label: '光照强度' },
  scatterCoeff: { min: 0.1, max: 2.0, step: 0.1, label: '散射系数' },
  sunHeight: { min: 0, max: 90, step: 1, label: '太阳高度角' },
  sunAzimuth: { min: 0, max: 360, step: 1, label: '太阳方位角' },
  windSpeed: { min: 0, max: 100, step: 1, label: '风速' },
  windDirection: { min: 0, max: 360, step: 1, label: '风向' },
  particleSpeed: { min: 0, max: 10, step: 0.5, label: '粒子速度' },
  sampleCount: { min: 16, max: 256, step: 8, label: '采样步数' },
  noiseResolution: { min: 32, max: 256, step: 16, label: '噪声分辨率' },
  renderScale: { min: 0.25, max: 2.0, step: 0.25, label: '渲染分辨率' },
  transitionProgress: { min: 0, max: 1, step: 0.01, label: '过渡进度' },
  noiseVisualization: { min: 0, max: 1, step: 1, label: '噪点可视化' }
};
