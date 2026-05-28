import {
  Point,
  VoronoiCell,
  SymmetryConfig,
  SymmetryResult,
  KaleidoscopeProject,
  Preset,
} from '../types';

export async function computeVoronoi(
  points: Point[],
  bounds: { width: number; height: number }
): Promise<{ cells: VoronoiCell[]; edges: any[] }> {
  const response = await fetch('/api/geometry/voronoi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points, bounds }),
  });

  if (!response.ok) {
    throw new Error('Voronoi计算失败');
  }

  return response.json();
}

export async function computeSymmetry(
  config: SymmetryConfig
): Promise<SymmetryResult> {
  const response = await fetch('/api/symmetry/matrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error('对称群计算失败');
  }

  return response.json();
}

export async function getProjects(): Promise<{ id: string; name: string; created_at: number; updated_at: number }[]> {
  const response = await fetch('/api/projects');
  if (!response.ok) {
    throw new Error('获取工程列表失败');
  }
  const data = await response.json();
  return data.projects;
}

export async function loadProject(id: string): Promise<KaleidoscopeProject> {
  const response = await fetch(`/api/projects/${id}`);
  if (!response.ok) {
    throw new Error('加载工程失败');
  }
  return response.json();
}

export async function saveProject(
  project: KaleidoscopeProject & { id?: string }
): Promise<{ id: string; success: boolean }> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });

  if (!response.ok) {
    throw new Error('保存工程失败');
  }

  return response.json();
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('删除工程失败');
  }

  return response.json();
}

export async function getPresets(): Promise<Preset[]> {
  const response = await fetch('/api/presets');
  if (!response.ok) {
    throw new Error('获取预设列表失败');
  }
  const data = await response.json();
  return data.presets;
}

export async function loadPreset(id: string): Promise<KaleidoscopeProject> {
  const response = await fetch(`/api/presets/${id}`);
  if (!response.ok) {
    throw new Error('加载预设失败');
  }
  return response.json();
}

export function kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
  const temp = kelvin / 100;
  let r, g, b;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    if (temp <= 19) {
      b = 0;
    } else {
      b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    }
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }

  return {
    r: Math.min(1, Math.max(0, r / 255)),
    g: Math.min(1, Math.max(0, g / 255)),
    b: Math.min(1, Math.max(0, b / 255)),
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 1, g: 1, b: 1 };
}
