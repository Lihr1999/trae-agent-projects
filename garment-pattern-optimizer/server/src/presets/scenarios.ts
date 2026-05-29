import type { PresetScene } from '../types';

const COLORS = {
  front: '#e74c3c',
  back: '#3498db',
  sleeve: '#2ecc71',
  collar: '#f39c12',
  cuff: '#9b59b6',
  pocket: '#1abc9c',
  yoke: '#e67e22',
  panel: '#34495e'
};

export const PRESET_SCENARIOS: PresetScene[] = [
  {
    id: 'preset-1',
    name: '预设一：T恤基础版型',
    description: '经典圆领T恤，包含前片、后片和两个袖子',
    fabricWidth: 150,
    fabricHeight: 200,
    polygons: [
      {
        id: 'tshirt-front',
        name: '前片',
        color: COLORS.front,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 55, y: 20 },
          { x: 52, y: 70 },
          { x: 45, y: 75 },
          { x: 40, y: 65 },
          { x: 10, y: 65 },
          { x: 5, y: 75 },
          { x: -2, y: 70 },
          { x: -5, y: 20 }
        ]
      },
      {
        id: 'tshirt-back',
        name: '后片',
        color: COLORS.back,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 55, y: 15 },
          { x: 52, y: 72 },
          { x: 45, y: 75 },
          { x: 40, y: 65 },
          { x: 10, y: 65 },
          { x: 5, y: 75 },
          { x: -2, y: 72 },
          { x: -5, y: 15 }
        ]
      },
      {
        id: 'tshirt-sleeve',
        name: '袖子',
        color: COLORS.sleeve,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 35, y: 5 },
          { x: 38, y: 25 },
          { x: 35, y: 55 },
          { x: 0, y: 60 },
          { x: -35, y: 55 },
          { x: -38, y: 25 },
          { x: -35, y: 5 }
        ]
      },
      {
        id: 'tshirt-collar',
        name: '领口',
        color: COLORS.collar,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 20, y: 0 },
          { x: 22, y: 5 },
          { x: 20, y: 10 },
          { x: 0, y: 12 },
          { x: -20, y: 10 },
          { x: -22, y: 5 },
          { x: -20, y: 0 }
        ]
      }
    ]
  },
  {
    id: 'preset-2',
    name: '预设二：衬衫多部件',
    description: '正装衬衫，包含前片、后片、袖子、领子、袖口、口袋',
    fabricWidth: 150,
    fabricHeight: 250,
    polygons: [
      {
        id: 'shirt-front-left',
        name: '左前片',
        color: COLORS.front,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 28, y: 0 },
          { x: 30, y: 18 },
          { x: 28, y: 80 },
          { x: 25, y: 85 },
          { x: 22, y: 75 },
          { x: 2, y: 75 },
          { x: 0, y: 85 },
          { x: -3, y: 80 },
          { x: -5, y: 18 }
        ]
      },
      {
        id: 'shirt-front-right',
        name: '右前片',
        color: COLORS.back,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 28, y: 0 },
          { x: 30, y: 18 },
          { x: 28, y: 80 },
          { x: 25, y: 85 },
          { x: 22, y: 75 },
          { x: 2, y: 75 },
          { x: 0, y: 85 },
          { x: -3, y: 80 },
          { x: -5, y: 18 }
        ]
      },
      {
        id: 'shirt-back',
        name: '后片',
        color: COLORS.panel,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 55, y: 0 },
          { x: 58, y: 15 },
          { x: 55, y: 82 },
          { x: 52, y: 85 },
          { x: 47, y: 75 },
          { x: 8, y: 75 },
          { x: 3, y: 85 },
          { x: 0, y: 82 },
          { x: -3, y: 15 }
        ]
      },
      {
        id: 'shirt-sleeve',
        name: '长袖',
        color: COLORS.sleeve,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 30, y: 8 },
          { x: 32, y: 35 },
          { x: 28, y: 65 },
          { x: 0, y: 70 },
          { x: -28, y: 65 },
          { x: -32, y: 35 },
          { x: -30, y: 8 }
        ]
      },
      {
        id: 'shirt-collar',
        name: '领子',
        color: COLORS.collar,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 18, y: 0 },
          { x: 22, y: 8 },
          { x: 18, y: 15 },
          { x: 0, y: 18 },
          { x: -18, y: 15 },
          { x: -22, y: 8 },
          { x: -18, y: 0 }
        ]
      },
      {
        id: 'shirt-cuff',
        name: '袖口',
        color: COLORS.cuff,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 25, y: 0 },
          { x: 25, y: 8 },
          { x: 0, y: 8 },
          { x: -25, y: 8 },
          { x: -25, y: 0 }
        ]
      },
      {
        id: 'shirt-pocket',
        name: '胸袋',
        color: COLORS.pocket,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 12, y: 0 },
          { x: 12, y: 14 },
          { x: 10, y: 16 },
          { x: 2, y: 16 },
          { x: 0, y: 14 }
        ]
      },
      {
        id: 'shirt-yoke',
        name: '过肩',
        color: COLORS.yoke,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 55, y: 0 },
          { x: 52, y: 12 },
          { x: 45, y: 18 },
          { x: 10, y: 18 },
          { x: 3, y: 12 }
        ]
      }
    ]
  },
  {
    id: 'preset-3',
    name: '预设三：裤子复杂版型',
    description: '西裤版型，包含前片、后片、腰头、口袋布，含凹多边形测试NFP算法',
    fabricWidth: 150,
    fabricHeight: 220,
    polygons: [
      {
        id: 'pants-front',
        name: '前裤片',
        color: COLORS.front,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 25, y: 0 },
          { x: 28, y: 15 },
          { x: 30, y: 35 },
          { x: 28, y: 60 },
          { x: 25, y: 100 },
          { x: 22, y: 105 },
          { x: 5, y: 105 },
          { x: 2, y: 100 },
          { x: -5, y: 60 },
          { x: -8, y: 35 },
          { x: -6, y: 15 },
          { x: -3, y: 8 },
          { x: 0, y: 5 }
        ]
      },
      {
        id: 'pants-back',
        name: '后裤片',
        color: COLORS.back,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 28, y: 0 },
          { x: 32, y: 18 },
          { x: 35, y: 40 },
          { x: 32, y: 65 },
          { x: 28, y: 100 },
          { x: 25, y: 105 },
          { x: 3, y: 105 },
          { x: 0, y: 100 },
          { x: -8, y: 65 },
          { x: -10, y: 40 },
          { x: -8, y: 18 },
          { x: -5, y: 10 }
        ]
      },
      {
        id: 'pants-waistband',
        name: '腰头',
        color: COLORS.collar,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 80, y: 8 },
          { x: 0, y: 8 }
        ]
      },
      {
        id: 'pants-front-pocket',
        name: '前口袋布',
        color: COLORS.pocket,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 18, y: 5 },
          { x: 20, y: 25 },
          { x: 15, y: 30 },
          { x: 0, y: 28 },
          { x: -3, y: 15 },
          { x: 0, y: 5 }
        ]
      },
      {
        id: 'pants-back-pocket',
        name: '后口袋',
        color: COLORS.panel,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 15, y: 0 },
          { x: 15, y: 12 },
          { x: 12, y: 15 },
          { x: 3, y: 15 },
          { x: 0, y: 12 }
        ]
      },
      {
        id: 'pants-fly',
        name: '门襟',
        color: COLORS.yoke,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 8, y: 0 },
          { x: 10, y: 5 },
          { x: 10, y: 25 },
          { x: 8, y: 30 },
          { x: 0, y: 30 },
          { x: -2, y: 25 },
          { x: -2, y: 5 }
        ]
      }
    ]
  },
  {
    id: 'preset-4',
    name: '预设四：外套极限测试',
    description: '外套多部件，包含凹多边形、自交测试用例，测试算法鲁棒性',
    fabricWidth: 150,
    fabricHeight: 300,
    polygons: [
      {
        id: 'jacket-front-left',
        name: '左前片',
        color: COLORS.front,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 32, y: 0 },
          { x: 35, y: 20 },
          { x: 38, y: 45 },
          { x: 35, y: 75 },
          { x: 32, y: 95 },
          { x: 28, y: 100 },
          { x: 25, y: 85 },
          { x: 3, y: 85 },
          { x: 0, y: 100 },
          { x: -5, y: 95 },
          { x: -8, y: 45 },
          { x: -6, y: 20 }
        ]
      },
      {
        id: 'jacket-front-right',
        name: '右前片',
        color: COLORS.back,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 32, y: 0 },
          { x: 35, y: 20 },
          { x: 38, y: 45 },
          { x: 35, y: 75 },
          { x: 32, y: 95 },
          { x: 28, y: 100 },
          { x: 25, y: 85 },
          { x: 3, y: 85 },
          { x: 0, y: 100 },
          { x: -5, y: 95 },
          { x: -8, y: 45 },
          { x: -6, y: 20 }
        ]
      },
      {
        id: 'jacket-back',
        name: '后片',
        color: COLORS.panel,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 62, y: 0 },
          { x: 65, y: 18 },
          { x: 68, y: 45 },
          { x: 65, y: 80 },
          { x: 62, y: 98 },
          { x: 58, y: 100 },
          { x: 55, y: 85 },
          { x: 7, y: 85 },
          { x: 4, y: 100 },
          { x: 0, y: 98 },
          { x: -6, y: 80 },
          { x: -8, y: 45 },
          { x: -6, y: 18 }
        ]
      },
      {
        id: 'jacket-sleeve',
        name: '大袖',
        color: COLORS.sleeve,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 35, y: 10 },
          { x: 38, y: 40 },
          { x: 35, y: 65 },
          { x: 32, y: 90 },
          { x: 0, y: 95 },
          { x: -32, y: 90 },
          { x: -35, y: 65 },
          { x: -38, y: 40 },
          { x: -35, y: 10 }
        ]
      },
      {
        id: 'jacket-undersleeve',
        name: '小袖',
        color: COLORS.cuff,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 5 },
          { x: 18, y: 10 },
          { x: 20, y: 45 },
          { x: 18, y: 85 },
          { x: 0, y: 90 },
          { x: -18, y: 85 },
          { x: -20, y: 45 },
          { x: -18, y: 10 }
        ]
      },
      {
        id: 'jacket-collar',
        name: '翻领',
        color: COLORS.collar,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 22, y: 0 },
          { x: 28, y: 10 },
          { x: 25, y: 20 },
          { x: 15, y: 25 },
          { x: 0, y: 28 },
          { x: -15, y: 25 },
          { x: -25, y: 20 },
          { x: -28, y: 10 },
          { x: -22, y: 0 }
        ]
      },
      {
        id: 'jacket-lapel',
        name: '驳头',
        color: COLORS.pocket,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 12, y: 0 },
          { x: 15, y: 15 },
          { x: 10, y: 30 },
          { x: 0, y: 35 },
          { x: -5, y: 25 },
          { x: -3, y: 10 }
        ]
      },
      {
        id: 'jacket-pocket',
        name: '大口袋',
        color: COLORS.yoke,
        grainAngle: 0,
        rotation: 0,
        quantity: 2,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 18, y: 0 },
          { x: 20, y: 5 },
          { x: 20, y: 18 },
          { x: 16, y: 22 },
          { x: 4, y: 22 },
          { x: 0, y: 18 },
          { x: -2, y: 5 }
        ]
      },
      {
        id: 'jacket-chest-pocket',
        name: '胸袋',
        color: COLORS.front,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 14, y: 0 },
          { x: 14, y: 10 },
          { x: 12, y: 12 },
          { x: 2, y: 12 },
          { x: 0, y: 10 }
        ]
      },
      {
        id: 'jacket-vent',
        name: '开衩',
        color: COLORS.back,
        grainAngle: 0,
        rotation: 0,
        quantity: 1,
        position: { x: 0, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 8, y: 0 },
          { x: 6, y: 25 },
          { x: 4, y: 30 },
          { x: -4, y: 30 },
          { x: -6, y: 25 },
          { x: -8, y: 0 }
        ]
      }
    ]
  }
];

export function getPresetScenario(id: string): PresetScene | undefined {
  return PRESET_SCENARIOS.find(p => p.id === id);
}

export function listPresetScenarios(): Array<{ id: string; name: string; description: string }> {
  return PRESET_SCENARIOS.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description
  }));
}
