import { Body, SimulationConfig } from './types'
import { vec3 } from './vectorMath'

export interface PresetScene {
  id: string
  name: string
  description: string
  bodies: Body[]
  config: Partial<SimulationConfig>
}

const G = 6.67430e-11
const SCALE = 1e-9
const AU = 1.496e11 * SCALE

function createPresetBodies(): Body[] {
  const sun: Body = {
    id: 'sun',
    name: 'Sun',
    mass: 1.989e30,
    position: vec3.zero(),
    velocity: vec3.zero(),
    radius: 0.5
  }

  const planets = [
    { name: 'Mercury', mass: 3.301e23, distance: 0.387 * AU, period: 0.241, radius: 0.08, color: '#b5b5b5' },
    { name: 'Venus', mass: 4.867e24, distance: 0.723 * AU, period: 0.615, radius: 0.12, color: '#e6c87a' },
    { name: 'Earth', mass: 5.972e24, distance: 1.0 * AU, period: 1.0, radius: 0.13, color: '#6b93d6' },
    { name: 'Mars', mass: 6.417e23, distance: 1.524 * AU, period: 1.881, radius: 0.11, color: '#c1440e' },
    { name: 'Jupiter', mass: 1.898e27, distance: 5.203 * AU, period: 11.86, radius: 0.35, color: '#d8ca9d' },
    { name: 'Saturn', mass: 5.683e26, distance: 9.537 * AU, period: 29.46, radius: 0.30, color: '#f4d59e' },
    { name: 'Uranus', mass: 8.681e25, distance: 19.19 * AU, period: 84.01, radius: 0.22, color: '#d1e7e7' },
    { name: 'Neptune', mass: 1.024e26, distance: 30.07 * AU, period: 164.8, radius: 0.21, color: '#5b5ddf' }
  ]

  const bodies: Body[] = [sun]

  for (const planet of planets) {
    const angularVelocity = (2 * Math.PI) / (planet.period * 365.25 * 86400)
    const orbitalVelocity = planet.distance * angularVelocity

    bodies.push({
      id: planet.name.toLowerCase(),
      name: planet.name,
      mass: planet.mass,
      position: { x: planet.distance, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -orbitalVelocity },
      radius: planet.radius
    })
  }

  return bodies
}

function createThreeBodySystem(): Body[] {
  const earthMass = 5.972e24
  const moonMass = 7.342e22
  const sunMass = 1.989e30

  const earthMoonDistance = 3.844e8 * SCALE
  const earthSunDistance = 1.0 * AU
  const earthOrbitalVelocity = 29780 * SCALE

  const moonOrbitalSpeed = 1022 * SCALE

  return [
    {
      id: 'sun',
      name: 'Sun',
      mass: sunMass,
      position: vec3.zero(),
      velocity: vec3.zero(),
      radius: 0.5
    },
    {
      id: 'earth',
      name: 'Earth',
      mass: earthMass,
      position: { x: earthSunDistance, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -earthOrbitalVelocity },
      radius: 0.13
    },
    {
      id: 'moon',
      name: 'Moon',
      mass: moonMass,
      position: { x: earthSunDistance + earthMoonDistance, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -earthOrbitalVelocity + moonOrbitalSpeed },
      radius: 0.05
    },
    {
      id: 'l4',
      name: 'L4 Satellite',
      mass: 1000,
      position: {
        x: earthSunDistance * 0.5,
        y: 0,
        z: -earthSunDistance * Math.sqrt(3) / 2
      },
      velocity: {
        x: earthOrbitalVelocity * Math.sqrt(3) / 2,
        y: 0,
        z: -earthOrbitalVelocity * 0.5
      },
      radius: 0.03
    },
    {
      id: 'l5',
      name: 'L5 Satellite',
      mass: 1000,
      position: {
        x: earthSunDistance * 0.5,
        y: 0,
        z: earthSunDistance * Math.sqrt(3) / 2
      },
      velocity: {
        x: -earthOrbitalVelocity * Math.sqrt(3) / 2,
        y: 0,
        z: -earthOrbitalVelocity * 0.5
      },
      radius: 0.03
    }
  ]
}

function createBinaryStarSystem(): Body[] {
  const starMass = 1.989e30
  const separation = 10 * AU
  const orbitalSpeed = Math.sqrt(G * starMass / (separation / 2)) * SCALE

  return [
    {
      id: 'star-a',
      name: 'Star A',
      mass: starMass,
      position: { x: -separation / 2, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: orbitalSpeed / 2 },
      radius: 0.4
    },
    {
      id: 'star-b',
      name: 'Star B',
      mass: starMass * 0.8,
      position: { x: separation / 2, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -orbitalSpeed / 2 * 1.25 },
      radius: 0.35
    },
    {
      id: 'probe',
      name: 'Probe',
      mass: 1000,
      position: { x: separation * 0.8, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: -orbitalSpeed * 0.8 },
      radius: 0.03
    },
    {
      id: 'planet',
      name: 'Distant Planet',
      mass: 5.972e24 * 10,
      position: { x: 0, y: separation * 3, z: 0 },
      velocity: { x: orbitalSpeed * 0.3, y: 0, z: 0 },
      radius: 0.2
    }
  ]
}

function createChaoticSystem(): Body[] {
  const bodies: Body[] = []
  const baseMass = 5.972e25

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const radius = 2 * AU + (Math.random() - 0.5) * 0.5 * AU
    const speed = 0.5 + Math.random() * 0.5

    bodies.push({
      id: `body-${i}`,
      name: `Body ${i + 1}`,
      mass: baseMass * (0.5 + Math.random()),
      position: {
        x: Math.cos(angle) * radius,
        y: (Math.random() - 0.5) * 0.2 * AU,
        z: Math.sin(angle) * radius
      },
      velocity: {
        x: -Math.sin(angle) * speed * 10000 * SCALE,
        y: (Math.random() - 0.5) * 2000 * SCALE,
        z: Math.cos(angle) * speed * 10000 * SCALE
      },
      radius: 0.1 + Math.random() * 0.1
    })
  }

  bodies.push({
    id: 'central',
    name: 'Central Mass',
    mass: 1.989e30 * 0.5,
    position: vec3.zero(),
    velocity: vec3.zero(),
    radius: 0.4
  })

  return bodies
}

export const presetScenes: PresetScene[] = [
  {
    id: 'solar-system',
    name: '经典日心说八大行星稳定轨道',
    description: '太阳系八大行星围绕太阳的稳定椭圆轨道模拟',
    bodies: createPresetBodies(),
    config: {
      gravitationalConstant: G,
      timeStep: 3600,
      timeMultiplier: 1000,
      useBarnesHut: false,
      useRelativisticCorrection: false,
      adaptiveTimeStep: true,
      minTimeStep: 1,
      maxTimeStep: 86400
    }
  },
  {
    id: 'three-body-lagrange',
    name: '地月日三体系统拉格朗日点探测',
    description: '包含L4和L5拉格朗日点卫星的三体系统',
    bodies: createThreeBodySystem(),
    config: {
      gravitationalConstant: G,
      timeStep: 60,
      timeMultiplier: 100,
      useBarnesHut: false,
      useRelativisticCorrection: false,
      adaptiveTimeStep: true,
      minTimeStep: 1,
      maxTimeStep: 3600
    }
  },
  {
    id: 'binary-slingshot',
    name: '双星系统引力弹弓加速变轨',
    description: '探测器在双星系统中利用引力弹弓效应',
    bodies: createBinaryStarSystem(),
    config: {
      gravitationalConstant: G,
      timeStep: 3600,
      timeMultiplier: 500,
      useBarnesHut: false,
      useRelativisticCorrection: true,
      adaptiveTimeStep: true,
      minTimeStep: 10,
      maxTimeStep: 86400
    }
  },
  {
    id: 'chaotic-multi-body',
    name: '混沌多体系统星体碰撞与抛射',
    description: '多体系统的混沌行为演示，包含碰撞与轨道剧变',
    bodies: createChaoticSystem(),
    config: {
      gravitationalConstant: G,
      timeStep: 3600,
      timeMultiplier: 200,
      useBarnesHut: true,
      barnesHutTheta: 0.7,
      useRelativisticCorrection: false,
      adaptiveTimeStep: true,
      minTimeStep: 100,
      maxTimeStep: 86400,
      collisionDetection: true
    }
  }
]

export function getPresetScene(id: string): PresetScene | undefined {
  return presetScenes.find(p => p.id === id)
}
