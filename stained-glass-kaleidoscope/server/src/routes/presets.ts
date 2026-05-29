import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PresetScene, KaleidoscopeConfig, Material, LightSource, GlassFragment } from '../types';

const generatePresetFragments = (): GlassFragment[] => {
  const fragments: GlassFragment[] = [];
  
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const vertices = [];
    const numPoints = 5;
    
    for (let j = 0; j < numPoints; j++) {
      const pointAngle = angle + (j / numPoints) * Math.PI / 3;
      const radius = 0.2 + Math.random() * 0.15;
      vertices.push({
        x: Math.cos(pointAngle) * radius,
        y: Math.sin(pointAngle) * radius
      });
    }
    
    fragments.push({
      id: `frag_${i}`,
      name: `Fragment ${i + 1}`,
      curves: [],
      vertices,
      materialId: `mat_${i % 4}`
    });
  }
  
  return fragments;
};

const defaultMaterials: Material[] = [
  {
    id: 'mat_0',
    name: 'Crimson Glass',
    refractiveIndex: 1.52,
    dispersionCoefficient: 0.01,
    subsurfaceScattering: 0.3,
    anisotropy: 0.1,
    color: { r: 0.8, g: 0.1, b: 0.1 },
    absorption: 0.1,
    roughness: 0.05
  },
  {
    id: 'mat_1',
    name: 'Sapphire Glass',
    refractiveIndex: 1.57,
    dispersionCoefficient: 0.012,
    subsurfaceScattering: 0.25,
    anisotropy: 0.15,
    color: { r: 0.1, g: 0.2, b: 0.8 },
    absorption: 0.08,
    roughness: 0.03
  },
  {
    id: 'mat_2',
    name: 'Emerald Glass',
    refractiveIndex: 1.54,
    dispersionCoefficient: 0.008,
    subsurfaceScattering: 0.35,
    anisotropy: 0.08,
    color: { r: 0.1, g: 0.7, b: 0.3 },
    absorption: 0.12,
    roughness: 0.04
  },
  {
    id: 'mat_3',
    name: 'Amber Glass',
    refractiveIndex: 1.51,
    dispersionCoefficient: 0.015,
    subsurfaceScattering: 0.4,
    anisotropy: 0.2,
    color: { r: 0.9, g: 0.6, b: 0.1 },
    absorption: 0.15,
    roughness: 0.06
  }
];

const defaultLights: LightSource[] = [
  {
    id: 'light_0',
    name: 'Main White Light',
    position: { x: 0, y: 0, z: 2 },
    spectrum: [
      { wavelength: 450, intensity: 0.8 },
      { wavelength: 550, intensity: 1.0 },
      { wavelength: 650, intensity: 0.9 }
    ],
    polarization: { angle: 0, ellipticity: 0 },
    intensity: 1.0,
    type: 'point'
  }
];

const presets: PresetScene[] = [
  {
    id: 'preset_classic',
    name: '经典三面镜六重对称花朵',
    description: 'Traditional three-mirror kaleidoscope with hexagonal symmetry creating beautiful floral patterns',
    config: {
      id: 'config_classic',
      name: 'Classic Configuration',
      spaceGroup: {
        type: '2d',
        schlafliSymbol: '{6,3}',
        p: 6,
        q: 3,
        generators: [],
        mirrorAngle: Math.PI / 6,
        mirrorCount: 3
      },
      fragments: generatePresetFragments(),
      materials: defaultMaterials,
      lights: defaultLights,
      animationSpeed: 0.5,
      causticIntensity: 0.8,
      interferenceStrength: 0.6
    }
  },
  {
    id: 'preset_hyperbolic',
    name: '双曲几何 {5,4} 非欧几里得无限镶嵌',
    description: 'Hyperbolic geometry {5,4} tiling creates infinite patterns within finite bounds',
    config: {
      id: 'config_hyperbolic',
      name: 'Hyperbolic Configuration',
      spaceGroup: {
        type: 'hyperbolic',
        schlafliSymbol: '{5,4}',
        p: 5,
        q: 4,
        generators: [],
        mirrorAngle: Math.PI / 5,
        mirrorCount: 5
      },
      fragments: generatePresetFragments(),
      materials: defaultMaterials.map(m => ({ ...m, refractiveIndex: m.refractiveIndex + 0.05 })),
      lights: defaultLights,
      animationSpeed: 0.3,
      causticIntensity: 1.0,
      interferenceStrength: 0.9
    }
  },
  {
    id: 'preset_dispersion',
    name: '高色散率火石玻璃产生剧烈光谱分离',
    description: 'High-dispersion flint glass creates dramatic spectral separation and rainbow effects',
    config: {
      id: 'config_dispersion',
      name: 'Dispersion Configuration',
      spaceGroup: {
        type: 'spherical',
        schlafliSymbol: '{4,3}',
        p: 4,
        q: 3,
        generators: [],
        mirrorAngle: Math.PI / 4,
        mirrorCount: 4
      },
      fragments: generatePresetFragments(),
      materials: [
        {
          id: 'mat_flint',
          name: 'Flint Glass',
          refractiveIndex: 1.72,
          dispersionCoefficient: 0.05,
          subsurfaceScattering: 0.2,
          anisotropy: 0.3,
          color: { r: 0.95, g: 0.95, b: 1.0 },
          absorption: 0.02,
          roughness: 0.01
        },
        ...defaultMaterials.slice(1)
      ],
      lights: [{
        ...defaultLights[0],
        spectrum: [
          { wavelength: 400, intensity: 1.0 },
          { wavelength: 500, intensity: 1.0 },
          { wavelength: 600, intensity: 1.0 },
          { wavelength: 700, intensity: 1.0 }
        ]
      }],
      animationSpeed: 0.8,
      causticIntensity: 1.5,
      interferenceStrength: 1.2
    }
  },
  {
    id: 'preset_caustic',
    name: '极小夹角镜面引发光线囚禁与焦散能量聚焦',
    description: 'Extreme narrow mirror angles create light trapping and intense caustic energy focusing',
    config: {
      id: 'config_caustic',
      name: 'Caustic Configuration',
      spaceGroup: {
        type: '2d',
        schlafliSymbol: '{12,3}',
        p: 12,
        q: 3,
        generators: [],
        mirrorAngle: Math.PI / 12,
        mirrorCount: 12
      },
      fragments: generatePresetFragments(),
      materials: defaultMaterials.map(m => ({ ...m, absorption: 0.01 })),
      lights: [{
        ...defaultLights[0],
        intensity: 2.0,
        position: { x: 0, y: 0.1, z: 3 }
      }],
      animationSpeed: 0.2,
      causticIntensity: 3.0,
      interferenceStrength: 1.5
    }
  }
];

export default async function presetsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/presets', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return { success: true, data: presets };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });

  fastify.get('/api/presets/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const preset = presets.find(p => p.id === id);
      
      if (!preset) {
        return reply.status(404).send({ success: false, error: 'Preset not found' });
      }

      return { success: true, data: preset };
    } catch (error) {
      return reply.status(500).send({ success: false, error: (error as Error).message });
    }
  });
}
