import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'kaleidoscope.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface ProjectData {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  vertices: any[];
  fragments: any[];
  symmetry: any;
  lightSource: any;
}

interface Database {
  projects: ProjectData[];
  presets: any[];
}

let memoryDb: Database = {
  projects: [],
  presets: [],
};

function loadDatabase(): void {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(data);
    } catch (e) {
      console.error('加载数据库失败，使用默认数据');
    }
  }
  if (memoryDb.presets.length === 0) {
    memoryDb.presets = getDefaultPresets();
    saveDatabase();
  }
}

function saveDatabase(): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
}

function getDefaultPresets() {
  return [
    {
      id: 'classic-flower',
      name: '经典三面镜六重对称花朵',
      description: '传统万花筒配置，展现经典六瓣花图案',
      thumbnail: null,
      projectData: JSON.stringify({
        name: '经典六重对称花朵',
        vertices: [
          { id: 'v1', x: 0, y: 0 },
          { id: 'v2', x: 0.3, y: 0 },
          { id: 'v3', x: 0.15, y: 0.26 },
          { id: 'v4', x: -0.15, y: 0.26 },
          { id: 'v5', x: -0.3, y: 0 },
        ],
        fragments: [
          { id: 'f1', vertices: ['v1', 'v2', 'v3'], color: '#e74c3c', transparency: 0.4, refractiveIndex: 1.5 },
          { id: 'f2', vertices: ['v1', 'v3', 'v4'], color: '#f39c12', transparency: 0.35, refractiveIndex: 1.52 },
          { id: 'f3', vertices: ['v1', 'v4', 'v5'], color: '#27ae60', transparency: 0.3, refractiveIndex: 1.48 },
        ],
        symmetry: {
          type: 'dihedral',
          order: 6,
          mirrorAngle: 60,
        },
        lightSource: {
          angle: 45,
          colorTemperature: 5500,
          intensity: 1.2,
          position: { x: 0, y: 2, z: 5 },
        },
      }),
    },
    {
      id: 'hyperbolic-tiling',
      name: '双曲几何非欧几里得无限镶嵌',
      description: '庞加莱圆盘上的双曲几何镶嵌图案',
      thumbnail: null,
      projectData: JSON.stringify({
        name: '双曲无限镶嵌',
        vertices: [
          { id: 'v1', x: 0, y: 0 },
          { id: 'v2', x: 0.4, y: 0 },
          { id: 'v3', x: 0.12, y: 0.38 },
          { id: 'v4', x: -0.32, y: 0.24 },
          { id: 'v5', x: -0.32, y: -0.24 },
          { id: 'v6', x: 0.12, y: -0.38 },
        ],
        fragments: [
          { id: 'f1', vertices: ['v1', 'v2', 'v3'], color: '#1abc9c', transparency: 0.5, refractiveIndex: 1.5 },
          { id: 'f2', vertices: ['v1', 'v3', 'v4'], color: '#3498db', transparency: 0.5, refractiveIndex: 1.5 },
          { id: 'f3', vertices: ['v1', 'v4', 'v5'], color: '#9b59b6', transparency: 0.5, refractiveIndex: 1.5 },
          { id: 'f4', vertices: ['v1', 'v5', 'v6'], color: '#e74c3c', transparency: 0.5, refractiveIndex: 1.5 },
          { id: 'f5', vertices: ['v1', 'v6', 'v2'], color: '#f39c12', transparency: 0.5, refractiveIndex: 1.5 },
        ],
        symmetry: {
          type: 'hyperbolic',
          order: 100,
          mirrorAngle: 72,
          schlafli: '{4,5}',
        },
        lightSource: {
          angle: 30,
          colorTemperature: 4000,
          intensity: 0.8,
          position: { x: 1, y: 3, z: 4 },
        },
      }),
    },
    {
      id: 'caustic-focus',
      name: '高透光率多重折射焦散光斑',
      description: '高透明度玻璃产生的复杂焦散效果',
      thumbnail: null,
      projectData: JSON.stringify({
        name: '焦散光斑',
        vertices: [
          { id: 'v1', x: 0, y: 0.4 },
          { id: 'v2', x: 0.35, y: 0.12 },
          { id: 'v3', x: 0.22, y: -0.3 },
          { id: 'v4', x: -0.22, y: -0.3 },
          { id: 'v5', x: -0.35, y: 0.12 },
        ],
        fragments: [
          { id: 'f1', vertices: ['v1', 'v2', 'v3', 'v4', 'v5'], color: '#00bcd4', transparency: 0.75, refractiveIndex: 1.6 },
        ],
        symmetry: {
          type: 'cyclic',
          order: 8,
          mirrorAngle: 45,
        },
        lightSource: {
          angle: 60,
          colorTemperature: 7500,
          intensity: 1.5,
          position: { x: 0, y: 5, z: 3 },
        },
      }),
    },
    {
      id: 'infinite-abyss',
      name: '极小夹角镜面无限反射深渊',
      description: '极小镜面夹角产生的无限深度反射效果',
      thumbnail: null,
      projectData: JSON.stringify({
        name: '无限反射深渊',
        vertices: [
          { id: 'v1', x: 0, y: 0 },
          { id: 'v2', x: 0.5, y: 0.02 },
          { id: 'v3', x: 0.48, y: 0.08 },
          { id: 'v4', x: 0.1, y: 0.15 },
        ],
        fragments: [
          { id: 'f1', vertices: ['v1', 'v2', 'v3'], color: '#673ab7', transparency: 0.25, refractiveIndex: 1.7 },
          { id: 'f2', vertices: ['v1', 'v3', 'v4'], color: '#3f51b5', transparency: 0.3, refractiveIndex: 1.75 },
        ],
        symmetry: {
          type: 'dihedral',
          order: 30,
          mirrorAngle: 12,
        },
        lightSource: {
          angle: 15,
          colorTemperature: 3000,
          intensity: 0.6,
          position: { x: 0, y: 1, z: 10 },
        },
      }),
    },
  ];
}

loadDatabase();

export function getProjects() {
  return memoryDb.projects.map((p) => ({
    id: p.id,
    name: p.name,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
}

export function getProject(id: string) {
  return memoryDb.projects.find((p) => p.id === id);
}

export function saveProject(project: ProjectData): { id: string; success: boolean } {
  const existingIndex = memoryDb.projects.findIndex((p) => p.id === project.id);
  if (existingIndex >= 0) {
    memoryDb.projects[existingIndex] = { ...project, updated_at: Date.now() };
  } else {
    memoryDb.projects.push({
      ...project,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }
  saveDatabase();
  return { id: project.id, success: true };
}

export function deleteProject(id: string): { success: boolean } {
  memoryDb.projects = memoryDb.projects.filter((p) => p.id !== id);
  saveDatabase();
  return { success: true };
}

export function getPresets() {
  return memoryDb.presets.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    thumbnail: p.thumbnail,
  }));
}

export function getPreset(id: string) {
  const preset = memoryDb.presets.find((p) => p.id === id);
  if (preset) {
    return {
      ...preset,
      ...JSON.parse(preset.projectData),
    };
  }
  return null;
}

export { ProjectData };
